'use server';

import { prisma } from '@/lib/prisma';
import { createCustomerService } from '@/lib/customerService';

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

// --- CREAR UN CLIENTE NUEVO MEDIANTE EL SERVICIO ---
export async function createCustomer(data: any) {
    try {
        const customer = await createCustomerService(data);
        return { success: true, customer };
    } catch (error: any) {
        console.error('Error al crear cliente:', error);
        return { success: false, error: error?.message || 'Error al guardar cliente en BD.' };
    }
}