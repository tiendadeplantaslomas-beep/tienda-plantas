import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');

        if (!customerId) {
            return NextResponse.json({ error: 'Falta el ID del cliente' }, { status: 400 });
        }

        // Consultamos las promociones activas disponibles para la cuponera
        // (Si tenés una tabla específica de cupones por usuario, podés ajustar esta consulta de Prisma)
        const promotions = await prisma.promotion.findMany({
            where: { activa: true },
            orderBy: { id: 'desc' }
        });

        return NextResponse.json({ coupons: promotions }, { status: 200 });
    } catch (error: any) {
        console.error('Error al obtener cupones:', error);
        return NextResponse.json({ error: error.message || 'Error interno al buscar cupones' }, { status: 500 });
    }
}