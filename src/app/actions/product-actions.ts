'use server';

import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// --- CATEGORÍAS ---
export async function getCategories() {
    try {
        return await prisma.category.findMany({ orderBy: { name: 'asc' } });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
}

export async function createCategory(name: string, defaultMargin: number) {
    try {
        if (!name.trim()) return { error: 'El nombre es obligatorio.' };
        const normalizedName = name.trim().toUpperCase();

        const category = await prisma.category.create({
            data: { name: normalizedName, defaultMargin: defaultMargin || 100 },
        });

        revalidatePath('/productos');
        return { success: true, category };
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
            return { error: 'Ya existe una categoría con este nombre.' };
        }
        return { error: 'Error al crear la categoría.' };
    }
}

// --- PROVEEDORES ---
export async function getSuppliers() {
    try {
        return await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return [];
    }
}

export async function createSupplier(data: { name: string; address?: string; phone?: string; notes?: string }) {
    try {
        if (!data.name.trim()) return { error: 'El nombre del proveedor es obligatorio.' };

        const supplier = await prisma.supplier.create({
            data: {
                name: data.name.trim().toUpperCase(),
                address: data.address?.trim() || null,
                phone: data.phone?.trim() || null,
                notes: data.notes?.trim() || null,
            },
        });

        revalidatePath('/productos');
        return { success: true, supplier };
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
            return { error: 'Ya existe un proveedor con este nombre.' };
        }
        return { error: 'Error al crear el proveedor.' };
    }
}

// --- PRODUCTOS ---
export async function getProducts() {
    try {
        return await prisma.product.findMany({
            include: { category: true, supplier: true },
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
}

export async function generateNextProductCode(categoryId: string) {
    try {
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) return '';

        const prefix = category.name.trim().substring(0, 3).toUpperCase();
        const count = await prisma.product.count({ where: { categoryId } });
        const nextNum = (count + 1).toString().padStart(4, '0');
        return `${prefix}-${nextNum}`;
    } catch (error) {
        console.error('Error al generar código:', error);
        return '';
    }
}

export async function saveProduct(formData: FormData) {
    const id = formData.get('id') as string | null;
    let code = formData.get('code') as string;
    const rawName = formData.get('name') as string;
    const categoryId = formData.get('categoryId') as string;
    const supplierId = (formData.get('supplierId') as string) || null;

    const name = rawName ? rawName.trim().toUpperCase() : '';
    const cost = Math.round(parseFloat(formData.get('cost') as string || '0'));
    const otherCosts = Math.round(parseFloat(formData.get('otherCosts') as string || '0'));
    const price = Math.round(parseFloat(formData.get('price') as string || '0'));
    const margin = parseFloat(formData.get('margin') as string || '100');
    const taxRate = parseFloat(formData.get('taxRate') as string || '21');

    // El stock (Cantidad Inicial/Actual) se guarda SIEMPRE
    const stock = parseInt(formData.get('stock') as string || '0', 10);
    const trackStock = formData.get('trackStock') === 'true';
    const minStock = parseInt(formData.get('minStock') as string || '2', 10);

    if (!name || !categoryId || isNaN(cost)) {
        return { error: 'Por favor completá los campos obligatorios.' };
    }

    try {
        if (id) {
            await prisma.product.update({
                where: { id },
                data: {
                    name, categoryId, supplierId, cost, otherCosts, price, margin, taxRate,
                    trackStock, stock, minStock
                },
            });
        } else {
            if (!code) {
                code = await generateNextProductCode(categoryId);
            }
            await prisma.product.create({
                data: {
                    code, name, categoryId, supplierId, cost, otherCosts, price, margin, taxRate,
                    trackStock, stock, minStock
                },
            });
        }

        revalidatePath('/productos');
        return { success: true };
    } catch (error: unknown) {
        console.error('Error al guardar el producto:', error);
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
            return { error: 'El código del producto ya existe.' };
        }
        return { error: 'Ocurrió un error al guardar el producto.' };
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({ where: { id } });
        revalidatePath('/productos');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return { error: 'No se pudo eliminar el producto.' };
    }
}