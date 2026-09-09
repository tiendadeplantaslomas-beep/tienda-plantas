import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener ventas filtradas por fecha desde TiDB Cloud
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        let dateFilter = {};

        if (from && to) {
            const startDate = new Date(from);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);

            dateFilter = {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            };
        }

        // Consultar las ventas con Prisma
        const sales = await prisma.sale.findMany({
            where: dateFilter,
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                customer: true,
                payments: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Mapear los datos relacionales para que la interfaz los consuma limpiamente
        const formattedSales = sales.map((sale: any) => ({
            id: sale.id,
            createdAt: sale.createdAt,
            total: sale.total,
            status: sale.status || 'PENDIENTE',
            client: sale.customer?.name || 'CONSUMIDOR FINAL',
            clientEmail: sale.customer?.email || 's/n',
            paymentMethod: sale.payments?.[0]?.method || 'EFECTIVO',
            isShipping: sale.isShipping || false,
            shippingAddress: sale.shippingAddress || '',
            items: sale.items.map((item: any) => ({
                id: item.id,
                code: item.product?.code || 'S/C',
                name: item.product?.name || 'Producto sin nombre',
                price: item.price,
                quantity: item.quantity,
            })),
        }));

        return NextResponse.json(formattedSales);
    } catch (error: any) {
        console.error('Error al obtener el historial de ventas:', error);
        return NextResponse.json(
            { error: 'Error al obtener las ventas', details: error.message },
            { status: 500 }
        );
    }
}

// PATCH: Actualizar el estado logístico de la venta
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        const updatedSale = await prisma.sale.update({
            where: { id },
            data: { status },
            include: {
                items: { include: { product: true } },
                customer: true,
                payments: true,
            },
        });

        // Formatear la respuesta igual que en el GET
        const formattedSale = {
            id: updatedSale.id,
            createdAt: updatedSale.createdAt,
            total: updatedSale.total,
            status: updatedSale.status,
            client: updatedSale.customer?.name || 'CONSUMIDOR FINAL',
            clientEmail: updatedSale.customer?.email || 's/n',
            paymentMethod: updatedSale.payments?.[0]?.method || 'EFECTIVO',
            isShipping: updatedSale.isShipping || false,
            shippingAddress: updatedSale.shippingAddress || '',
            items: updatedSale.items.map((item: any) => ({
                id: item.id,
                code: item.product?.code || 'S/C',
                name: item.product?.name || 'Producto sin nombre',
                price: item.price,
                quantity: item.quantity,
            })),
        };

        return NextResponse.json(formattedSale);
    } catch (error: any) {
        console.error('Error al actualizar el estado de la venta:', error);
        return NextResponse.json(
            { error: 'Error al actualizar el estado', details: error.message },
            { status: 500 }
        );
    }
}