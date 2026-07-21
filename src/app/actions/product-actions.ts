'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

// 1. Obtener todas las categorías (para llenar el desplegable del formulario)
export async function getCategories() {
    try {
        return await prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        throw new Error('No se pudieron cargar las categorías.');
    }
}

// 2. Obtener lista de productos con su categoría
export async function getProducts() {
    try {
        return await prisma.product.findMany({
            include: { category: true },
            orderBy: { name: 'asc' },
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        throw new Error('No se pudieron cargar los productos.');
    }
}

// 3. Crear o Actualizar Producto (Server Action)
export async function saveProduct(formData: FormData) {
    const id = formData.get('id') as string | null;
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;
    const categoryId = formData.get('categoryId') as string;
    const cost = parseFloat(formData.get('cost') as string);
    const price = parseFloat(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string, 10);

    if (!code || !name || !categoryId || isNaN(cost) || isNaN(price)) {
        return { error: 'Por favor completá todos los campos requeridos con valores válidos.' };
    }

    try {
        if (id) {
            // Actualización
            await prisma.product.update({
                where: { id },
                data: { code, name, categoryId, cost, price, stock },
            });
        } else {
            // Creación
            await prisma.product.create({
                data: { code, name, categoryId, cost, price, stock },
            });
        }

        revalidatePath('/productos');
        return { success: true };
    } catch (error: any) {
        console.error('Error al guardar el producto:', error);
        if (error.code === 'P2002') {
            return { error: 'El código de producto ya existe en el sistema.' };
        }
        return { error: 'Ocurrió un error al guardar el producto.' };
    }
}

// 4. Eliminar Producto
export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({
            where: { id },
        });
        revalidatePath('/productos');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        return { error: 'No se pudo eliminar el producto.' };
    }
}