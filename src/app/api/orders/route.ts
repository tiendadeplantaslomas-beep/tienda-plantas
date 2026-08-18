import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Obtener todas las ventas/pedidos registrados
export async function GET(): Promise<NextResponse> {
    try {
        const sales = await prisma.sale.findMany({
            include: {
                saleItems: {
                    include: {
                        product: true
                    }
                },
                customer: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formattedSales = sales.map((sale: any) => {
            const rawItems = sale.saleItems || sale.items || [];

            return {
                id: sale.id.toString(),
                createdAt: sale.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString(),
                client: sale.customerName || sale.customer?.name || 'CLIENTE MOSTRADOR',
                clientEmail: sale.customer?.email || 'sin_email@pos.com',
                total: sale.total,
                paidAmount: sale.paidAmount || 0,
                pendingBalance: sale.pendingBalance ?? sale.total,
                status: sale.status || 'REGISTRADO',
                isPaid: Boolean(sale.isPaid),
                paymentStatus: sale.paymentStatus || 'PENDIENTE',
                paymentMethod: sale.paymentMethod || 'EFECTIVO',
                paymentReference: sale.paymentReference || '',
                isShipping: Boolean(sale.isShipping),
                shippingAddress: sale.shippingAddress || '',
                channel: channelVal(sale.channel),
                invoiced: Boolean(sale.invoiced),
                items: rawItems.map((si: any) => ({
                    id: si.productId,
                    code: si.product?.code || 'S/C',
                    name: si.product?.name || 'PRODUCTO',
                    cost: si.product?.cost || 0,
                    price: si.price,
                    quantity: si.quantity
                }))
            };
        });

        return NextResponse.json(formattedSales);
    } catch (error: any) {
        console.error('Error al obtener ventas:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function channelVal(ch: any) {
    return ch || 'POS';
}

// POST: Registrar un nuevo pedido/venta y actualizar stock
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = await request.json();

        const {
            total, items, isShipping, shippingAddress, channel,
            customerId, customerName, client, customer,
            method, paymentMethod, paymentReference, paidAmount
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Items inválidos o faltantes en el pedido' }, { status: 400 });
        }

        // Resolución robusta del ID del cliente
        const resolvedCustomerId = customerId || client?.id || customer?.id || null;

        // Resolución robusta del Nombre del cliente
        let resolvedCustomerName = 'CLIENTE MOSTRADOR';
        if (customerName && typeof customerName === 'string' && customerName.trim() !== '') {
            resolvedCustomerName = customerName.trim();
        } else if (typeof client === 'string' && client.trim() !== '') {
            resolvedCustomerName = client.trim();
        } else if (client?.name && typeof client.name === 'string') {
            resolvedCustomerName = client.name.trim();
        } else if (customer?.name && typeof customer?.name === 'string') {
            resolvedCustomerName = customer.name.trim();
        }

        const numericTotal = Number(total) || 0;
        const numericPaidAmount = Number(paidAmount) || 0;
        const pendingBalance = Math.max(0, numericTotal - numericPaidAmount);
        const isPaid = numericPaidAmount >= numericTotal;

        let paymentStatus = 'PENDIENTE';
        if (isPaid) {
            paymentStatus = 'PAGADO';
        } else if (numericPaidAmount > 0) {
            paymentStatus = 'PARCIAL';
        }

        const finalPaymentMethod = method || paymentMethod || 'EFECTIVO';

        // 1. Crear la venta y sus ítems usando 'saleItems' (respetando tu schema.prisma)
        const newSale = await prisma.sale.create({
            data: {
                total: numericTotal,
                paidAmount: numericPaidAmount,
                pendingBalance: pendingBalance,
                status: 'REGISTRADO',
                isPaid: isPaid,
                paymentStatus: paymentStatus,
                paymentMethod: finalPaymentMethod,
                paymentReference: paymentReference || '',
                isShipping: Boolean(isShipping),
                shippingAddress: shippingAddress || '',
                channel: channel || 'POS',
                invoiced: false,
                customerId: resolvedCustomerId,
                customerName: resolvedCustomerName,
                saleItems: {
                    create: items.map((item: any) => ({
                        productId: item.id || item.productId,
                        quantity: Number(item.quantity) || 1,
                        price: Number(item.price) || 0
                    }))
                }
            },
            include: {
                saleItems: true
            }
        });

        // 2. Descontar automáticamente el stock físico usando el array original 'items' (evita errores de iteración)
        for (const item of items) {
            const productId = item.id || item.productId;
            const quantity = Number(item.quantity) || 1;

            if (productId) {
                await prisma.product.update({
                    where: { id: productId },
                    data: {
                        stock: {
                            decrement: quantity
                        }
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Pedido registrado exitosamente y stock actualizado',
            sale: newSale
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error al registrar pedido en Sale:', error);
        return NextResponse.json({ error: error.message || 'Error interno al registrar la venta' }, { status: 500 });
    }
}