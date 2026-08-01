'use server';

import { prisma } from '@/lib/prisma'; // O el cliente de base de datos que utilices

// --- OBTENER TODOS LOS CLIENTES ---
export async function getCustomers() {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        return customers;
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
}

// --- CREAR UN CLIENTE NUEVO ---
export async function createCustomer(data: { name: string; phone?: string; address?: string }) {
    try {
        if (!data.name || data.name.trim() === '') {
            return { success: false, error: 'El nombre es obligatorio.' };
        }

        const customer = await prisma.customer.create({
            data: {
                name: data.name.trim().toUpperCase(),
                phone: data.phone?.trim() || null,
                address: data.address?.trim().toUpperCase() || null,
            },
        });

        return { success: true, customer };
    } catch (error: any) {
        console.error('Error al crear cliente:', error);
        return { success: false, error: error?.message || 'Error al guardar cliente en BD.' };
    }
}