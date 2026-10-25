'use server';

import { prisma } from '@/lib/prisma';

export async function getSuppliers() {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: 'asc' }
        });
        return suppliers;
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return [];
    }
}

export async function createSupplier(data: { name: string; phone?: string; address?: string }) {
    try {
        const newSupplier = await prisma.supplier.create({
            data: {
                name: data.name.toUpperCase(),
                phone: data.phone || null,
                address: data.address ? data.address.toUpperCase() : null
            }
        });
        return { success: true, data: newSupplier };
    } catch (error: any) {
        return { error: error.message };
    }
}