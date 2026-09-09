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

        // 1. Validaciones básicas de formato
        if (!description || !amount || amount <= 0) {
            return { success: false, error: 'Monto o descripción inválidos.' };
        }

        // 2. Validación de Cierre de Caja (Evita alterar días ya cerrados y bloqueados)
        const todayStr = new Date().toISOString().split('T')[0];
        const dayLocked = await isDayClosed(todayStr);
        if (dayLocked) {
            return { success: false, error: 'OPERACIÓN DENEGADA: La caja del día de hoy ya fue cerrada y bloqueada.' };
        }

        // 3. Ajuste de monto: Si es EGRESO, guardamos en negativo. 
        // Usamos redondeo a 2 decimales para preservar centavos correctamente en lugar de Math.round entero.
        const cleanAmount = Number(amount.toFixed(2));
        const finalAmount = type === 'EGRESO' ? -Math.abs(cleanAmount) : Math.abs(cleanAmount);

        // 4. Crear el movimiento en la Base de Datos
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
        return { success: false, error: error.message || 'No se pudo guardar el movimiento.' };
    }
}

// 3. Verificar si un día específico ya se encuentra cerrado/bloqueado
export async function isDayClosed(dateStr: string): Promise<boolean> {
    try {
        const closure = await prisma.cashClosure.findUnique({
            where: { date: dateStr }
        });
        return !!closure; // Devuelve true si ya está cerrado
    } catch (error) {
        console.error('Error al verificar cierre de caja:', error);
        return false;
    }
}

// 4. Ejecutar el Cierre Formal del Día (Bloqueo de Caja)
export async function closeDailyCash(payload: {
    date: string; // Formato 'YYYY-MM-DD'
    closedBy?: string;
    notes?: string;
}) {
    try {
        const { date, closedBy, notes } = payload;

        // A. Verificar si ya está cerrado para evitar duplicados
        const alreadyClosed = await isDayClosed(date);
        if (alreadyClosed) {
            return { success: false, error: 'El día seleccionado ya se encuentra cerrado y bloqueado.' };
        }

        // B. Recalcular los totales oficiales del día usando tu función existente
        const summary = await getCajaSummary(date);
        if (!summary.success) {
            return { success: false, error: 'No se pudieron calcular los totales para cerrar el día.' };
        }

        // C. Registrar el cierre definitivo en la base de datos
        const closure = await prisma.cashClosure.create({
            data: {
                date: summary.date, // 'YYYY-MM-DD'
                totalSales: summary.totals.TOTAL_VENTAS,
                netCash: summary.totals.EFECTIVO_EN_CAJA_NETO,
                closedBy: closedBy ? closedBy.toUpperCase().trim() : 'ADMINISTRADOR',
                notes: notes ? notes.toUpperCase().trim() : 'CIERRE DE TURNO / ARQUEO DIARIO OK',
            }
        });

        revalidatePath('/caja');
        return { success: true, closure };

    } catch (error: any) {
        console.error('Error al cerrar la caja del día:', error);
        return { success: false, error: error.message || 'Error crítico al procesar el cierre de caja.' };
    }
}