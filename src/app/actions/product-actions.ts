'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ==========================================
// INTERFACES
// ==========================================

export interface ProductInput {
    id?: string;
    code: string;
    name: string;
    categoryId: string;
    supplierId?: string | null;
    cost: number;
    otherCosts?: number;
    margin: number;
    taxRate?: number;
    stock?: number;
    minStock?: number;
    trackStock?: boolean;
}

export interface BatchProductInput {
    code: string;
    name: string;
    categoryId: string;
    supplierId?: string | null;
    cost: number;
    otherCosts?: number;
    margin: number;
    stock?: number;
    minStock?: number;
}

// ==========================================
// ACCIONES DE PRODUCTOS
// ==========================================

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
                supplier: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        return products;
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
}

export async function getProductById(id: string) {
    try {
        return await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                supplier: true,
            },
        });
    } catch (error) {
        console.error('Error al obtener producto por ID:', error);
        return null;
    }
}

export async function upsertProduct(data: ProductInput) {
    try {
        const { id, code, name, categoryId, supplierId, cost, otherCosts = 0, margin, taxRate = 21, stock = 0, minStock = 2, trackStock = true } = data;

        if (!code.trim() || !name.trim() || !categoryId) {
            return { error: 'Código, Nombre y Categoría son obligatorios.' };
        }

        const upperCode = code.trim().toUpperCase();
        const upperName = name.trim().toUpperCase();

        const numericCost = Number(cost) || 0;
        const numericOtherCosts = Number(otherCosts) || 0;
        const numericMargin = Number(margin) || 100;

        const totalCost = numericCost + numericOtherCosts;
        const calculatedPrice = Math.round(totalCost * (1 + numericMargin / 100));

        let product;

        if (id) {
            product = await prisma.product.update({
                where: { id },
                data: {
                    code: upperCode,
                    name: upperName,
                    categoryId,
                    supplierId: supplierId || null,
                    cost: numericCost,
                    otherCosts: numericOtherCosts,
                    margin: numericMargin,
                    price: calculatedPrice,
                    taxRate: Number(taxRate) || 21,
                    minStock: Number(minStock) || 2,
                    trackStock: Boolean(trackStock),
                },
                include: {
                    category: true,
                    supplier: true,
                }
            });
        } else {
            product = await prisma.product.create({
                data: {
                    code: upperCode,
                    name: upperName,
                    categoryId,
                    supplierId: supplierId || null,
                    cost: numericCost,
                    otherCosts: numericOtherCosts,
                    margin: numericMargin,
                    price: calculatedPrice,
                    stock: Number(stock) || 0,
                    minStock: Number(minStock) || 2,
                    trackStock: Boolean(trackStock),
                    taxRate: Number(taxRate) || 21,
                },
                include: {
                    category: true,
                    supplier: true,
                }
            });
        }

        revalidatePath('/productos');
        revalidatePath('/stock');
        revalidatePath('/compras');

        return { success: true, product };
    } catch (error: any) {
        console.error('Error al guardar producto:', error);
        if (error.code === 'P2002') {
            return { error: 'Ya existe un producto con ese código.' };
        }
        return { error: 'Error interno al procesar el producto.' };
    }
}

export const saveProduct = upsertProduct;

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({
            where: { id },
        });

        revalidatePath('/productos');
        revalidatePath('/stock');
        revalidatePath('/compras');

        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar producto:', error);
        if (error.code === 'P2003') {
            return { error: 'No se puede eliminar un producto que ya tiene historial de movimientos, ventas o compras.' };
        }
        return { error: 'Error al intentar eliminar el producto.' };
    }
}

export async function generateNextProductCode(categoryId?: string) {
    try {
        const count = await prisma.product.count();
        const nextNum = (count + 1).toString().padStart(4, '0');
        return `PRD-${nextNum}`;
    } catch (error) {
        console.error('Error al generar código:', error);
        return `PRD-${Date.now().toString().slice(-4)}`;
    }
}

export async function importProductsBatch(products: BatchProductInput[]) {
    try {
        if (!products || products.length === 0) {
            return { error: 'No hay productos para importar.' };
        }

        const result = await prisma.$transaction(async (tx) => {
            let createdCount = 0;
            let updatedCount = 0;

            for (const item of products) {
                if (!item.code || !item.name || !item.categoryId) continue;

                const upperCode = item.code.trim().toUpperCase();
                const upperName = item.name.trim().toUpperCase();

                const numericCost = Number(item.cost) || 0;
                const numericOtherCosts = Number(item.otherCosts) || 0;
                const numericMargin = Number(item.margin) || 100;

                const totalCost = numericCost + numericOtherCosts;
                const calculatedPrice = Math.round(totalCost * (1 + numericMargin / 100));

                const existingProduct = await tx.product.findUnique({
                    where: { code: upperCode }
                });

                if (existingProduct) {
                    await tx.product.update({
                        where: { id: existingProduct.id },
                        data: {
                            name: upperName,
                            categoryId: item.categoryId,
                            supplierId: item.supplierId || existingProduct.supplierId,
                            cost: numericCost,
                            otherCosts: numericOtherCosts,
                            margin: numericMargin,
                            price: calculatedPrice,
                            stock: item.stock !== undefined ? Number(item.stock) : existingProduct.stock,
                            minStock: item.minStock !== undefined ? Number(item.minStock) : existingProduct.minStock,
                        }
                    });
                    updatedCount++;
                } else {
                    await tx.product.create({
                        data: {
                            code: upperCode,
                            name: upperName,
                            categoryId: item.categoryId,
                            supplierId: item.supplierId || null,
                            cost: numericCost,
                            otherCosts: numericOtherCosts,
                            margin: numericMargin,
                            price: calculatedPrice,
                            stock: Number(item.stock) || 0,
                            minStock: Number(item.minStock) || 2,
                            trackStock: true,
                            taxRate: 21,
                        }
                    });
                    createdCount++;
                }
            }

            return { createdCount, updatedCount };
        });

        revalidatePath('/productos');
        revalidatePath('/stock');

        return {
            success: true,
            message: `Proceso finalizado: ${result.createdCount} creados, ${result.updatedCount} actualizados.`
        };
    } catch (error: any) {
        console.error('Error en importación masiva de productos:', error);
        return { error: error.message || 'Error al procesar la importación masiva.' };
    }
}

// ==========================================
// ACCIONES DE STOCK
// ==========================================

export async function adjustStock(productId: string, quantityChange: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', notes?: string) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: productId }
            });

            if (!product) {
                throw new Error('Producto no encontrado.');
            }

            let newStock = product.stock;

            if (type === 'IN') {
                newStock += Math.abs(quantityChange);
            } else if (type === 'OUT') {
                newStock -= Math.abs(quantityChange);
            } else if (type === 'ADJUSTMENT') {
                newStock = quantityChange;
            }

            if (newStock < 0) {
                throw new Error('El stock resultante no puede ser negativo.');
            }

            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: { stock: newStock },
                include: {
                    category: true,
                    supplier: true,
                }
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    quantity: quantityChange,
                    type,
                    notes: notes ? notes.toUpperCase() : `AJUSTE MANUAL (${type})`,
                    previousStock: product.stock,
                    newStock,
                }
            });

            return updatedProduct;
        });

        revalidatePath('/productos');
        revalidatePath('/stock');

        return { success: true, product: result };
    } catch (error: any) {
        console.error('Error al ajustar stock:', error);
        return { error: error.message || 'Error al procesar el ajuste de stock.' };
    }
}

// ==========================================
// ACCIONES DE CATEGORÍAS
// ==========================================

export async function getCategories() {
    try {
        return await prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
}

export async function createCategory(data: { name: string; defaultMargin?: number }) {
    try {
        if (!data.name || !data.name.trim()) {
            return { error: 'El nombre de la categoría es obligatorio.' };
        }

        const category = await prisma.category.create({
            data: {
                name: data.name.trim().toUpperCase(),
                defaultMargin: Number(data.defaultMargin) || 100,
            },
        });

        revalidatePath('/productos');
        return { success: true, category };
    } catch (error: any) {
        console.error('Error al crear categoría:', error);
        return { error: error.message || 'Error al crear la categoría.' };
    }
}

export async function deleteCategory(id: string) {
    try {
        await prisma.category.delete({ where: { id } });
        revalidatePath('/productos');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar categoría:', error);
        return { error: 'No se puede eliminar una categoría que contiene productos asociados.' };
    }
}

// ==========================================
// ACCIONES DE PROVEEDORES
// ==========================================

export async function getSuppliers() {
    try {
        return await prisma.supplier.findMany({
            orderBy: { name: 'asc' },
        });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return [];
    }
}

export async function createSupplier(data: { name: string; phone?: string }) {
    try {
        if (!data.name || !data.name.trim()) {
            return { error: 'El nombre del proveedor es obligatorio.' };
        }

        const supplier = await prisma.supplier.create({
            data: {
                name: data.name.trim().toUpperCase(),
                phone: data.phone ? data.phone.trim().toUpperCase() : null,
            },
        });

        revalidatePath('/productos');
        revalidatePath('/compras');

        return { success: true, supplier };
    } catch (error: any) {
        console.error('Error al crear proveedor:', error);
        return { error: error.message || 'Error al crear el proveedor.' };
    }
}