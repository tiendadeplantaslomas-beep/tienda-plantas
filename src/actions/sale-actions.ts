'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface CartItemInput {
    productId: string;
    code: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
}

export interface CreateSaleInput {
    paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO' | 'CREDITO';
    customerName?: string;
    notes?: string;
    userId?: string; // ID opcional del vendedor/usuario logueado
    items: CartItemInput[];
}

/**
 * Obtiene el resumen de ventas acumuladas del día de hoy para el globo del POS.
 */
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
 * Registra una venta completa en la base de datos, descontando stock e ingresando movimientos.
 */
export async function createSale(data: CreateSaleInput) {
    try {
        if (!data.items || data.items.length === 0) {
            return { error: 'El carrito de ventas no puede estar vacío.' };
        }

        // 1. Calcular total general
        const total = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

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

            // Crear la Venta General con los campos exactos de SaleItem
            const newSale = await tx.sale.create({
                data: {
                    total: total,
                    paymentMethod: data.paymentMethod || 'EFECTIVO',
                    customerName: data.customerName ? data.customerName.trim().toUpperCase() : 'CLIENTE OCASIONAL',
                    notes: data.notes ? data.notes.trim().toUpperCase() : null,
                    ...(data.userId ? { userId: data.userId } : {}), // Si se especifica el ID del vendedor
                    items: {
                        create: data.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.unitPrice,
                        }))
                    }
                },
                include: {
                    items: true
                }
            });

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