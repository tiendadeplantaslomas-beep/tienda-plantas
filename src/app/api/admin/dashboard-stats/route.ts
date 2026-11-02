import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        // 1. Obtener la fecha de hoy en formato 'YYYY-MM-DD'
        const today = new Date().toISOString().split('T')[0];

        // Definir el inicio y fin del día actual
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 2. Verificar si existe un cierre de caja registrado para hoy
        const closureToday = await prisma.cashClosure.findUnique({
            where: { date: today }
        });

        // 3. Verificar si hay movimientos de caja o ventas registradas hoy (indica que la caja está abierta/en uso)
        const movementsTodayCount = await prisma.cashMovement.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        const salesTodayCount = await prisma.sale.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // La caja está pendiente/abierta si hubo movimientos o ventas hoy y AÚN NO se ha cerrado formalmente
        const cajaAbiertaEnTurno = movementsTodayCount > 0 || salesTodayCount > 0;
        const cajaPendiente = Boolean(cajaAbiertaEnTurno && !closureToday);

        // 4. Contar la cantidad real de ventas/facturas registradas hoy
        const facturasCount = salesTodayCount;

        // 5. Contar la cantidad real de pedidos/compras registradas hoy
        const pedidosCount = await prisma.purchase.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        return NextResponse.json({
            success: true,
            cajaPendiente,
            facturasCount,
            pedidosCount
        });
    } catch (error: any) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al cargar estadísticas' },
            { status: 500 }
        );
    }
}