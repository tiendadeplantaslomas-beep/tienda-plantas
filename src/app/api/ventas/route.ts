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

// POST: Crear una nueva venta desde el carrito, descontar stock y liquidar cupón activo
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, customerName, customerPhone, customerEmail, shippingAddress, items, subtotal, discount, total, couponCode } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });
        }

        // TRANSACCIÓN ATÓMICA: Venta + Descuento de Stock + Cierre de Promoción en TiDB
        const newSale = await prisma.$transaction(async (tx) => {

            // 1. Buscar o identificar al cliente
            let customer = null;
            if (customerId) {
                customer = await tx.customer.findUnique({ where: { id: customerId } });
            }
            if (!customer && customerPhone) {
                customer = await tx.customer.findFirst({ where: { phone: customerPhone } });
            }

            if (!customer) {
                throw new Error('Cliente no encontrado. Es necesario iniciar sesión para procesar el pedido.');
            }

            // 2. Crear la venta y sus ítems relacionales
            const sale = await tx.sale.create({
                data: {
                    customerId: customer.id,
                    subtotal: Number(subtotal || total),
                    discount: Number(discount || 0),
                    total: Number(total),
                    status: 'PENDIENTE',
                    isShipping: Boolean(shippingAddress && shippingAddress.trim() !== ''),
                    shippingAddress: shippingAddress || 'A coordinar',
                    items: {
                        create: items.map((item: any) => ({
                            productId: String(item.id), // Coincide con el tipo CUID de tu esquema
                            quantity: Number(item.quantity),
                            price: Number(item.price),
                        }))
                    }
                },
                include: {
                    items: { include: { product: true } },
                    customer: true,
                    payments: true,
                }
            });

            // 3. Descontar el stock real de cada producto comprado
            for (const item of items) {
                await tx.product.update({
                    where: { id: String(item.id) },
                    data: {
                        stock: {
                            decrement: Number(item.quantity)
                        }
                    }
                });
            }

            // 4. Si el cliente tenía una promoción activa, marcarla como 'usada'
            const activePromo = await tx.customerPromotion.findFirst({
                where: {
                    customerId: customer.id,
                    status: 'activa'
                }
            });

            if (activePromo) {
                await tx.customerPromotion.update({
                    where: { id: activePromo.id },
                    data: { status: 'usada' }
                });
            }

            return sale;
        });

        // 5. Formatear la respuesta manteniendo la estructura limpia del GET
        const formattedSale = {
            id: newSale.id,
            createdAt: newSale.createdAt,
            total: newSale.total,
            status: newSale.status,
            client: newSale.customer?.name || 'CONSUMIDOR FINAL',
            clientEmail: newSale.customer?.email || 's/n',
            paymentMethod: 'PENDIENTE',
            isShipping: newSale.isShipping,
            shippingAddress: newSale.shippingAddress,
            items: newSale.items.map((item: any) => ({
                id: item.id,
                code: item.product?.code || 'S/C',
                name: item.product?.name || 'Producto sin nombre',
                price: item.price,
                quantity: item.quantity,
            })),
        };

        return NextResponse.json(formattedSale, { status: 201 });
    } catch (error: any) {
        console.error('Error al registrar la venta:', error);
        return NextResponse.json(
            { error: 'Error al registrar la venta', details: error.message },
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