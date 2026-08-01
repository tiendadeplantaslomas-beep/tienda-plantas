'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export async function updateStock(
    productId: string,
    quantity: number,
    type: MovementType,
    notes?: string
) {
    try {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return { error: 'Producto no encontrado.' };

        let newStock = product.stock;

        if (type === 'IN') {
            newStock += quantity;
        } else if (type === 'OUT') {
            if (product.stock < quantity) {
                return { error: 'Stock insuficiente para realizar la baja.' };
            }
            newStock -= quantity;
        } else if (type === 'ADJUSTMENT') {
            newStock = quantity; // Ajuste directo (inventario físico)
        }

        // Actualizamos stock y registramos el historial en una transacción
        await prisma.$transaction([
            prisma.product.update({
                where: { id: productId },
                data: { stock: newStock },
            }),
            prisma.stockMovement.create({
                data: {
                    productId,
                    quantity,
                    type,
                    notes: notes || null,
                    previousStock: product.stock,
                    newStock,
                },
            }),
        ]);

        revalidatePath('/productos');
        revalidatePath('/stock');
        return { success: true, newStock };
    } catch (error) {
        console.error('Error al actualizar stock:', error);
        return { error: 'Error al registrar el movimiento de stock.' };
    }
}

export async function getStockAlerts() {
    try {
        return await prisma.product.findMany({
            where: {
                trackStock: true,
                stock: { lte: prisma.product.fields.minStock }
            },
            include: { category: true, supplier: true },
            orderBy: { stock: 'asc' }
        });
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        return [];
    }
}