import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const orderId = searchParams.get('orderId');
        const claimId = searchParams.get('claimId'); // <--- Nuevo parámetro para reclamos

        let dateFilter = {};

        if (orderId) {
            dateFilter = { id: orderId };
        } else if (claimId) {
            // Buscamos el reclamo en la BD para obtener su saleId asociado
            const claim = await prisma.claim.findUnique({
                where: { id: claimId },
            });
            dateFilter = { id: claim ? claim.saleId : 'not-found' };
        } else if (from && to) {
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

        // Consultar las ventas con Prisma incluyendo relaciones
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

        // Mapeo completo para formatear las ventas hacia el frontend
        const formattedSales = sales.map((sale) => {
            const paidAmount = sale.payments.reduce((acc, p) => acc + p.amount, 0);
            const pendingBalance = Math.max(0, sale.total - paidAmount);

            return {
                id: sale.id,
                createdAt: sale.createdAt.toISOString(),
                total: sale.total,
                paidAmount,
                pendingBalance,
                paymentStatus: pendingBalance === 0 ? 'PAGADO' : paidAmount > 0 ? 'PARCIAL' : 'PENDIENTE',
                status: sale.status,
                isPaid: pendingBalance === 0,
                paymentMethod: sale.paymentMethod || 'EFECTIVO',
                channel: sale.channel,
                invoiced: sale.invoiced,
                client: sale.customer ? sale.customer.name : 'CLIENTE MOSTRADOR',
                clientEmail: sale.customer ? sale.customer.email : '',
                isShipping: sale.isShipping,
                shippingAddress: sale.shippingAddress || 'S/D',
                notes: sale.notes || '',
                items: sale.items.map((item: any) => ({
                    id: item.id,
                    code: item.product?.code || 'S/C',
                    name: item.product?.name || item.name || 'PRODUCTO',
                    price: item.price,
                    quantity: item.quantity,
                })),
            };
        });

        return NextResponse.json(formattedSales);
    } catch (error: any) {
        console.error('Error al obtener el historial de ventas:', error);
        return NextResponse.json(
            { error: 'Error al obtener las ventas', details: error.message },
            { status: 500 }
        );
    }
}

// POST: Crear una nueva venta desde el carrito web, descontar stock y liquidar cupón activo
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, customerName, customerPhone, customerEmail, shippingAddress, items, total, couponCode } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });
        }

        const calculatedTotal = total || items.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);

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
                    total: Number(calculatedTotal),
                    paidAmount: 0,
                    pendingBalance: Number(calculatedTotal),
                    paymentStatus: 'PENDIENTE',
                    status: 'REGISTRADO',
                    isPaid: false,
                    isShipping: Boolean(shippingAddress && shippingAddress.trim() !== ''),
                    shippingAddress: shippingAddress ? shippingAddress.toUpperCase() : 'A COORDINAR',
                    items: {
                        create: items.map((item: any) => ({
                            productId: String(item.id),
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

        // 5. Formatear la respuesta manteniendo la estructura limpia
        const formattedSale = {
            id: newSale.id,
            createdAt: newSale.createdAt,
            total: newSale.total,
            paidAmount: newSale.paidAmount,
            pendingBalance: newSale.pendingBalance,
            paymentStatus: newSale.paymentStatus,
            status: newSale.status,
            isPaid: newSale.isPaid,
            paymentMethod: newSale.paymentMethod || 'EFECTIVO',
            channel: newSale.channel,
            invoiced: newSale.invoiced,
            client: newSale.customer?.name || 'CONSUMIDOR FINAL',
            clientEmail: newSale.customer?.email || customerEmail || 's/n',
            isShipping: newSale.isShipping,
            shippingAddress: newSale.shippingAddress,
            notes: newSale.notes || '',
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

// PATCH: Actualizar el estado operativo, notas y la tabla Claim en TiDB
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status, notes } = body;

        // 1. Actualizar la venta principal en la base de datos
        const updatedSale = await prisma.sale.update({
            where: { id },
            data: {
                ...(status ? { status } : {}),
                ...(notes !== undefined ? { notes } : {})
            },
            include: {
                items: { include: { product: true } },
                customer: true,
                payments: true,
            },
        });

        // 2. Si el estado pasa a RECLAMO, insertar un registro en la tabla Claim
        if (status === 'RECLAMO') {
            await prisma.claim.create({
                data: {
                    saleId: id,
                    reason: notes ? notes.replace('RECLAMO: ', '') : 'Sin motivo especificado',
                    status: 'ABIERTO',
                }
            });
        }

        // 3. Si el reclamo se resuelve (vuelve a ENTREGADO con nota de resolución), actualizar el Claim abierto
        if (status === 'ENTREGADO' && notes && notes.startsWith('RESUELTO:')) {
            const openClaim = await prisma.claim.findFirst({
                where: { saleId: id, status: 'ABIERTO' },
                orderBy: { createdAt: 'desc' }
            });

            if (openClaim) {
                await prisma.claim.update({
                    where: { id: openClaim.id },
                    data: {
                        resolution: notes.replace('RESUELTO: ', ''),
                        status: 'RESUELTO',
                        resolvedAt: new Date(),
                    }
                });
            }
        }

        // Formatear la respuesta para el frontend
        const formattedSale = {
            id: updatedSale.id,
            createdAt: updatedSale.createdAt,
            total: updatedSale.total,
            paidAmount: updatedSale.paidAmount,
            pendingBalance: updatedSale.pendingBalance,
            paymentStatus: updatedSale.paymentStatus,
            status: updatedSale.status || 'REGISTRADO',
            isPaid: updatedSale.isPaid,
            paymentMethod: updatedSale.paymentMethod || updatedSale.payments?.[0]?.method || 'EFECTIVO',
            channel: updatedSale.channel,
            invoiced: updatedSale.invoiced,
            client: updatedSale.customer?.name || updatedSale.customerName || 'CONSUMIDOR FINAL',
            clientEmail: updatedSale.customer?.email || 's/n',
            isShipping: updatedSale.isShipping || false,
            shippingAddress: updatedSale.shippingAddress || '',
            notes: updatedSale.notes || '',
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