'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface DailySalesFilter {
    date?: string; // Formato YYYY-MM-DD
}

// 1. Obtener el resumen completo de caja del día
export async function getCajaSummary(filterDate?: string) {
    try {
        const targetDate = filterDate ? new Date(filterDate + 'T00:00:00') : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // A. Consultar Ventas del día
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                items: {
                    include: {
                        product: { select: { name: true, code: true } }
                    }
                },
                customer: { select: { name: true } }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // B. Consultar Movimientos Manuales del día (Ingresos / Egresos de caja)
        const cashMovements = await prisma.cashMovement.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Totales desglosados por método de pago según el enum PaymentMethod
        const totals = {
            EFECTIVO: 0,
            TRANSFERENCIA: 0,
            DEBITO: 0,
            CREDITO: 0,
            MERCADOPAGO: 0,
            TOTAL_VENTAS: 0,
            EGRESOS_MANUALES: 0,
            INGRESOS_MANUALES: 0,
            EFECTIVO_EN_CAJA_NETO: 0,
            CANTIDAD_VENTAS: sales.length,
        };

        // Acumular ventas por medio de pago
        sales.forEach(sale => {
            const method = sale.paymentMethod;
            if (totals[method] !== undefined) {
                totals[method] += sale.total;
            }
            totals.TOTAL_VENTAS += sale.total;
        });

        // Acumular movimientos manuales de caja
        cashMovements.forEach(m => {
            if (m.amount < 0) {
                totals.EGRESOS_MANUALES += Math.abs(m.amount);
            } else {
                totals.INGRESOS_MANUALES += m.amount;
            }
        });

        // Efectivo disponible en caja = (Efectivo por ventas + Ingresos caja) - Egresos
        totals.EFECTIVO_EN_CAJA_NETO = totals.EFECTIVO + totals.INGRESOS_MANUALES - totals.EGRESOS_MANUALES;

        return {
            success: true,
            date: startOfDay.toISOString().split('T')[0],
            totals,
            sales,
            cashMovements,
        };
    } catch (error: any) {
        console.error('Error al obtener datos de caja:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener resumen de caja.',
            totals: {
                EFECTIVO: 0,
                TRANSFERENCIA: 0,
                DEBITO: 0,
                CREDITO: 0,
                MERCADOPAGO: 0,
                TOTAL_VENTAS: 0,
                EGRESOS_MANUALES: 0,
                INGRESOS_MANUALES: 0,
                EFECTIVO_EN_CAJA_NETO: 0,
                CANTIDAD_VENTAS: 0
            },
            sales: [],
            cashMovements: []
        };
    }
}

// 2. Registrar Ingreso o Egreso Manual en la Caja
export async function createCashMovement(payload: {
    type: 'INGRESO' | 'EGRESO';
    description: string;
    amount: number;
}) {
    try {
        const { type, description, amount } = payload;

        if (!description || !amount || amount <= 0) {
            return { success: false, error: 'Monto o descripción inválidos.' };
        }

        // Si es EGRESO, guardamos el monto negativo en la BD
        const finalAmount = type === 'EGRESO' ? -Math.abs(Math.round(amount)) : Math.abs(Math.round(amount));

        const newMovement = await prisma.cashMovement.create({
            data: {
                type,
                description: description.toUpperCase().trim(),
                amount: finalAmount,
            },
        });

        revalidatePath('/caja');
        return { success: true, data: newMovement };
    } catch (error: any) {
        console.error('Error al crear movimiento de caja:', error);
        return { success: false, error: 'No se pudo guardar el movimiento.' };
    }
}