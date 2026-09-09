'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { PaymentMethod } from '@prisma/client';

export interface CartItemInput {
    productId: string;
    code: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
}

export interface CreateSaleInput {
    paymentMethod?: PaymentMethod;
    customerName?: string;
    customerId?: string;
    notes?: string;
    paidAmount?: number;
    pendingBalance?: number;
    paymentStatus?: string;
    paymentReference?: string;
    items: CartItemInput[];
}

export async function getDailySalesSummary() {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const salesToday = await prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            select: {
                total: true,
            },
        });

        const totalAmount = salesToday.reduce((acc, sale) => acc + sale.total, 0);
        const count = salesToday.length;

        return { success: true, totalAmount, count };
    } catch (error: any) {
        console.error('Error al obtener acumulado diario:', error);
        return { success: false, totalAmount: 0, count: 0, error: error.message };
    }
}

/**
 * Registra una venta completa, descuenta stock de forma segura y genera los movimientos y pagos.
 */
export async function createSale(data: CreateSaleInput) {
    try {
        if (!data.items || data.items.length === 0) {
            return { error: 'El carrito de ventas no puede estar vacío.' };
        }

        // 1. Calcular total general
        const total = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

        // Definir valores financieros por defecto
        const paidAmount = data.paidAmount !== undefined ? data.paidAmount : total;
        const pendingBalance = data.pendingBalance !== undefined ? data.pendingBalance : Math.max(0, total - paidAmount);
        const paymentStatus = data.paymentStatus || (pendingBalance === 0 ? 'PAGADO' : paidAmount > 0 ? 'PAGO PARCIAL' : 'PENDIENTE');
        const isPaid = paidAmount >= total;
        const finalPaymentMethod = data.paymentMethod || PaymentMethod.EFECTIVO;

        // 2. Transacción atómica en la Base de Datos
        const sale = await prisma.$transaction(async (tx) => {

            // Validar stock de todos los productos antes de procesar
            for (const item of data.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (!product) {
                    throw new Error(`El producto ${item.name} no existe en el catálogo.`);
                }

                if (product.trackStock && product.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para "${product.name}". Disponible: ${product.stock} u., Requerido: ${item.quantity} u.`);
                }
            }

            // Crear la Venta General respetando los campos de tu Schema
            const newSale = await tx.sale.create({
                data: {
                    total: total,
                    paidAmount: paidAmount,
                    pendingBalance: pendingBalance,
                    paymentStatus: paymentStatus,
                    paymentMethod: finalPaymentMethod,
                    paymentReference: data.paymentReference || null,
                    isPaid: isPaid,
                    customerName: data.customerName ? data.customerName.trim().toUpperCase() : 'CLIENTE MOSTRADOR',
                    notes: data.notes ? data.notes.trim().toUpperCase() : null,
                    ...(data.customerId ? { customerId: data.customerId } : {}),
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.unitPrice,
                        }))
                    }
                },
                include: {
                    items: true,
                    customer: true
                }
            });

            // Registrar pago inicial si corresponde
            if (paidAmount > 0) {
                await tx.payment.create({
                    data: {
                        saleId: newSale.id,
                        customerId: data.customerId || null,
                        amount: paidAmount,
                        paymentMethod: finalPaymentMethod,
                        reference: data.paymentReference || null,
                        notes: `PAGO INICIAL - VENTA N° ${newSale.id.slice(-6).toUpperCase()}`
                    }
                });
            }

            // Descontar Stock y registrar Movimiento por cada producto
            for (const item of data.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });

                if (product && product.trackStock) {
                    const newStock = product.stock - item.quantity;

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: newStock }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            quantity: -item.quantity,
                            type: 'OUT',
                            notes: `VENTA N° ${newSale.id.slice(-6).toUpperCase()}`,
                            previousStock: product.stock,
                            newStock,
                        }
                    });
                }
            }

            return newSale;

        }, {
            maxWait: 10000,
            timeout: 15000,
        });

        revalidatePath('/productos');
        revalidatePath('/stock');
        revalidatePath('/ventas');

        return { success: true, sale };

    } catch (error: any) {
        console.error('Error al procesar la venta:', error);
        return { error: error.message || 'Error interno al registrar la venta.' };
    }
}

/**
 * Busca clientes para el selector del POS.
 */
export async function searchCustomers(searchTerm: string = '') {
    try {
        const query = searchTerm.trim();

        const customers = await prisma.customer.findMany({
            where: query ? {
                OR: [
                    { name: { contains: query } },
                    { phone: { contains: query } },
                    { email: { contains: query } },
                ]
            } : undefined,
            take: 10,
            orderBy: {
                name: 'asc'
            }
        });

        return { success: true, customers };
    } catch (error: any) {
        console.error('Error al buscar clientes:', error);
        return { success: false, customers: [], error: error.message };
    }
}