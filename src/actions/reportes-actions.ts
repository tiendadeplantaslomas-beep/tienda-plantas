'use server';

import { prisma } from '@/lib/prisma';

export interface ReportFilter {
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
}

export async function getSalesReport(filter?: ReportFilter) {
    try {
        // Rango de fechas por defecto: Primer y último día del mes actual
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const start = filter?.startDate ? new Date(filter.startDate + 'T00:00:00') : defaultStart;
        const end = filter?.endDate ? new Date(filter.endDate + 'T23:59:59.999') : defaultEnd;

        // 1. Ventas del rango seleccionado
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                }
            },
            include: {
                items: {
                    include: {
                        product: { select: { name: true, code: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Cálculo de totales por medio de pago
        const summary = {
            totalAmount: 0,
            totalSales: sales.length,
            efectivo: 0,
            transferencia: 0,
            debito: 0,
            credito: 0,
        };

        sales.forEach(sale => {
            summary.totalAmount += sale.total;
            switch (sale.paymentMethod) {
                case 'EFECTIVO': summary.efectivo += sale.total; break;
                case 'TRANSFERENCIA': summary.transferencia += sale.total; break;
                case 'DEBITO': summary.debito += sale.total; break;
                case 'CREDITO': summary.credito += sale.total; break;
            }
        });

        return {
            success: true,
            summary,
            sales,
        };

    } catch (error: any) {
        console.error('Error al generar informe de ventas:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener informe.',
            summary: { totalAmount: 0, totalSales: 0, efectivo: 0, transferencia: 0, debito: 0, credito: 0 },
            sales: []
        };
    }
}