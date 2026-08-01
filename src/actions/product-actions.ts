'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache, revalidateTag } from 'next/cache';

// ----------------------------------------------------------------------
// CATEGORÍAS
// ----------------------------------------------------------------------

// Cachea el listado de categorías por 1 hora o hasta que se agregue una nueva
export const getCategories = unstable_cache(
    async () => {
        return await prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
    },
    ['categories-list'],
    { revalidate: 3600, tags: ['categories'] }
);

export async function createCategory(name: string, defaultMargin: number = 100) {
    try {
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) return { error: 'El nombre de la categoría es obligatorio.' };

        const existing = await prisma.category.findFirst({
            where: { name: cleanName },
        });

        if (existing) {
            return { error: 'Ya existe una categoría con ese nombre.' };
        }

        const category = await prisma.category.create({
            data: {
                name: cleanName,
                defaultMargin,
            },
        });

        // Invalida la caché de categorías al instante
        revalidateTag('categories');

        return { category };
    } catch (error) {
        console.error('Error en createCategory:', error);
        return { error: 'Error al crear la categoría.' };
    }
}

// ----------------------------------------------------------------------
// PROVEEDORES
// ----------------------------------------------------------------------

// Cachea el listado de proveedores por 1 hora
export const getSuppliers = unstable_cache(
    async () => {
        return await prisma.supplier.findMany({
            orderBy: { name: 'asc' },
        });
    },
    ['suppliers-list'],
    { revalidate: 3600, tags: ['suppliers'] }
);

export async function createSupplier(data: { name: string; phone?: string; address?: string }) {
    try {
        const cleanName = data.name.trim().toUpperCase();
        if (!cleanName) return { error: 'El nombre del proveedor es obligatorio.' };

        const existing = await prisma.supplier.findFirst({
            where: { name: cleanName },
        });

        if (existing) {
            return { error: 'Ya existe un proveedor con ese nombre.' };
        }

        const supplier = await prisma.supplier.create({
            data: {
                name: cleanName,
                phone: data.phone || null,
                address: data.address || null,
            },
        });

        // Invalida la caché de proveedores al instante
        revalidateTag('suppliers');

        return { supplier };
    } catch (error) {
        console.error('Error en createSupplier:', error);
        return { error: 'Error al crear el proveedor.' };
    }
}

// ----------------------------------------------------------------------
// PRODUCTOS
// ----------------------------------------------------------------------

export async function getProducts() {
    try {
        // Incluye las relaciones en una sola consulta para evitar la cascada N+1
        return await prisma.product.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                category: {
                    select: { id: true, name: true, defaultMargin: true },
                },
                supplier: {
                    select: { id: true, name: true, phone: true, address: true },
                },
            },
        });
    } catch (error) {
        console.error('Error en getProducts:', error);
        return [];
    }
}

export async function generateNextProductCode(categoryId: string): Promise<string> {
    try {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            select: { name: true },
        });

        const prefix = category ? category.name.substring(0, 3).toUpperCase() : 'PRO';
        const count = await prisma.product.count({ where: { categoryId } });
        const nextNum = (count + 1).toString().padStart(4, '0');

        return `${prefix}-${nextNum}`;
    } catch {
        return `PROD-${Date.now().toString().slice(-4)}`;
    }
}

export async function saveProduct(formData: FormData) {
    try {
        const id = formData.get('id') as string | null;
        const name = (formData.get('name') as string)?.trim().toUpperCase();
        const categoryId = formData.get('categoryId') as string;
        const supplierId = (formData.get('supplierId') as string) || null;
        const code = formData.get('code') as string;

        const cost = parseFloat(formData.get('cost') as string) || 0;
        const otherCosts = parseFloat(formData.get('otherCosts') as string) || 0;
        const margin = parseFloat(formData.get('margin') as string) || 0;
        const taxRate = parseFloat(formData.get('taxRate') as string) || 0;
        const price = parseFloat(formData.get('price') as string) || 0;
        const stock = parseInt(formData.get('stock') as string) || 0;
        const minStock = parseInt(formData.get('minStock') as string) || 2;

        if (!name || !categoryId) {
            return { error: 'Nombre y categoría son campos obligatorios.' };
        }

        let finalCode = code;
        if (!finalCode) {
            finalCode = await generateNextProductCode(categoryId);
        }

        const productData = {
            name,
            code: finalCode,
            categoryId,
            supplierId,
            cost,
            otherCosts,
            margin,
            taxRate,
            price,
            stock,
            minStock,
        };

        if (id) {
            await prisma.product.update({
                where: { id },
                data: productData,
            });
        } else {
            await prisma.product.create({
                data: productData,
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error al guardar producto:', error);
        return { error: 'Error al procesar la solicitud del producto.' };
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return { error: 'No se pudo eliminar el producto.' };
    }
}

export async function importProductsBatch(productsData: any[]) {
    try {
        let count = 0;

        for (const raw of productsData) {
            const name = raw.Nombre || raw.name;
            if (!name) continue;

            const categoryName = (raw.Categoria || raw.category || 'GENERAL').toUpperCase();
            let category = await prisma.category.findFirst({ where: { name: categoryName } });

            if (!category) {
                category = await prisma.category.create({
                    data: { name: categoryName, defaultMargin: 100 },
                });
            }

            const cost = parseFloat(raw.CostoBase || raw.cost) || 0;
            const otherCosts = parseFloat(raw.FleteOtros || raw.otherCosts) || 0;
            const margin = parseFloat(raw.Margen || raw.margin) || 100;
            const taxRate = parseFloat(raw.IVA || raw.taxRate) || 21;
            const price = parseFloat(raw.PrecioFinal || raw.price) || 0;
            const stock = parseInt(raw.Stock || raw.stock) || 0;
            const minStock = parseInt(raw.StockMinimo || raw.minStock) || 2;
            const code = raw.Codigo || raw.code || (await generateNextProductCode(category.id));

            await prisma.product.upsert({
                where: { code },
                update: {
                    name: name.toUpperCase(),
                    cost,
                    otherCosts,
                    margin,
                    taxRate,
                    price,
                    stock,
                    minStock,
                    categoryId: category.id,
                },
                create: {
                    code,
                    name: name.toUpperCase(),
                    categoryId: category.id,
                    cost,
                    otherCosts,
                    margin,
                    taxRate,
                    price,
                    stock,
                    minStock,
                },
            });

            count++;
        }

        revalidateTag('categories');
        return { success: true, count };
    } catch (error) {
        console.error('Error en importación batch:', error);
        return { error: 'Error al importar los productos.' };
    }
}
export async function adjustStock(
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT' = 'IN',
    notes?: string
) {
    try {
        const currentProduct = await prisma.product.findUnique({
            where: { id: productId },
            select: { stock: true },
        });

        if (!currentProduct) {
            return { error: 'El producto seleccionado no existe.' };
        }

        let newStock = currentProduct.stock;

        if (type === 'IN') {
            if (quantity <= 0) return { error: 'La cantidad a ingresar debe ser mayor a cero.' };
            newStock += quantity;
        } else if (type === 'OUT') {
            if (quantity <= 0) return { error: 'La cantidad a retirar debe ser mayor a cero.' };
            if (currentProduct.stock - quantity < 0) {
                return { error: `Stock insuficiente. Stock actual: ${currentProduct.stock} unidades.` };
            }
            newStock -= quantity;
        } else if (type === 'ADJUSTMENT') {
            if (quantity < 0) return { error: 'El stock final no puede ser un número negativo.' };
            newStock = quantity; // Pisa el valor
        }

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { stock: newStock },
        });

        return { success: true, product: updatedProduct };
    } catch (error) {
        console.error('Error al actualizar el stock:', error);
        return { error: 'No se pudo actualizar el stock del producto en la base de datos.' };
    }
}