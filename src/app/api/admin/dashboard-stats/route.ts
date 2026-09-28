import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        // 1. Obtener la fecha de hoy en formato 'YYYY-MM-DD'
        const today = new Date().toISOString().split('T')[0];

        // 2. Verificar si existe un cierre de caja registrado para hoy en la base de datos
        const closureToday = await prisma.cashClosure.findUnique({
            where: { date: today }
        });

        // Si no hay registro de cierre para hoy, la caja está pendiente/abierta
        const cajaPendiente = !closureToday;

        // 3. Contar la cantidad real de ventas/facturas registradas en TiDB
        const facturasCount = await prisma.sale.count();

        // 4. Contar la cantidad real de pedidos/compras registradas en TiDB
        const pedidosCount = await prisma.purchase.count();

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