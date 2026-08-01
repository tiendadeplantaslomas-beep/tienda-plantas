'use server';

import { prisma } from '@/lib/prisma';

export interface DailySalesFilter {
    date?: string; // Formato YYYY-MM-DD
}

export async function getCajaSummary(filterDate?: string) {
    try {
        // Definir el rango de fecha (por defecto hoy)
        const targetDate = filterDate ? new Date(filterDate + 'T00:00:00') : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

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
                // Si la relación existe en Prisma
                // user: { select: { name: true } }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Totales por medio de pago
        const totals = {
            EFECTIVO: 0,
            TRANSFERENCIA: 0,
            DEBITO: 0,
            CREDITO: 0,
            TOTAL_GENERAL: 0,
            CANTIDAD_VENTAS: sales.length,
        };

        sales.forEach(sale => {
            const method = (sale.paymentMethod || 'EFECTIVO') as keyof typeof totals;
            if (totals[method] !== undefined) {
                totals[method] += sale.total;
            }
            totals.TOTAL_GENERAL += sale.total;
        });

        return {
            success: true,
            date: startOfDay.toISOString().split('T')[0],
            totals,
            sales,
        };
    } catch (error: any) {
        console.error('Error al obtener datos de caja:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener resumen de caja.',
            totals: { EFECTIVO: 0, TRANSFERENCIA: 0, DEBITO: 0, CREDITO: 0, TOTAL_GENERAL: 0, CANTIDAD_VENTAS: 0 },
            sales: [],
        };
    }
}