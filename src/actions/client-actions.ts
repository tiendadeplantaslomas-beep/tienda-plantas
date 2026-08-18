'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getClients() {
    try {
        const clients = await prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return clients;
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
}

export async function createClient(data: { name: string; phone?: string; address?: string; notes?: string }) {
    try {
        if (!data.name || !data.name.trim()) {
            return { error: 'El nombre y apellido del cliente son obligatorios.' };
        }

        const newClient = await prisma.customer.create({
            data: {
                name: data.name.trim().toUpperCase(),
                phone: data.phone?.trim() || null,
                address: data.address?.trim() || null,
                notes: data.notes?.trim() || null,
            }
        });

        revalidatePath('/vivero');
        return { client: newClient };
    } catch (error) {
        console.error('Error al crear cliente:', error);
        return { error: 'No se pudo registrar el cliente en la base de datos.' };
    }
}