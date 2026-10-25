import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // En Next.js reciente, params es una promesa y debe resolverse con await
        const { id } = await params;

        const client = await prisma.customer.findUnique({
            where: { id },
        });

        if (!client) {
            return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
        }

        const sales = await prisma.sale.findMany({
            where: { customerId: id },
            orderBy: { createdAt: 'desc' },
        });

        // Buscamos los reclamos asociados a las ventas de este cliente
        const saleIds = sales.map(s => s.id);
        const claims = await prisma.claim.findMany({
            where: { saleId: { in: saleIds } },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ client, sales, claims });
    } catch (error: any) {
        console.error('Error al obtener datos del cliente:', error);
        return NextResponse.json({ error: 'Error al obtener datos', details: error.message }, { status: 500 });
    }
}