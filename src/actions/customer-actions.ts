'use server';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

// Obtener clientes con soporte de búsqueda y ordenamiento
export async function getClients(search = '', order: 'asc' | 'desc' = 'asc') {
    try {
        const clients = await prisma.customer.findMany({
            where: search ? {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { address: { contains: search } },
                    { phone: { contains: search } }
                ]
            } : undefined,
            orderBy: {
                name: order
            }
        });
        return clients;
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
}

// Crear cliente desde el panel admin o mostrador
export async function createClient(data: { name: string; email?: string; phone?: string; address?: string }) {
    try {
        if (!data.email || data.email.trim() === '') {
            return { error: '⚠️ El correo electrónico es obligatorio para poder registrar el cliente.' };
        }

        const emailTrimmed = data.email.trim().toLowerCase();

        // Verificar si ya existe en TiDB
        const existing = await prisma.customer.findUnique({ where: { email: emailTrimmed } });
        if (existing) {
            return { error: 'Ya existe un cliente registrado con ese correo electrónico.' };
        }

        const password_hash = await bcrypt.hash('123456', 10);

        // Crear registro en la BD
        const newClient = await prisma.customer.create({
            data: {
                name: data.name,
                email: emailTrimmed,
                phone: data.phone || '',
                address: data.address || '',
                password_hash,
                origin: 'admin',
                email_verified: 1
            }
        });

        // IMPORTANTE: Devolvemos directamente el cliente recién creado sin forzar revalidatePath
        return { success: true, customer: newClient, data: newClient };
    } catch (error: any) {
        console.error('Error en createClient:', error);
        return { error: error.message || 'Error al crear el cliente en la base de datos.' };
    }
}

// Actualizar cliente existente
export async function updateClient(id: string, data: { name: string; email?: string; phone?: string; address?: string }) {
    try {
        const updateData: any = {
            name: data.name,
            phone: data.phone || '',
            address: data.address || ''
        };

        if (data.email && data.email.trim() !== '') {
            updateData.email = data.email.trim();
        }

        const updated = await prisma.customer.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/admin/clientes');
        revalidatePath('/vivero');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error('Error al actualizar cliente:', error);
        return { error: error.message || 'Error al actualizar el cliente.' };
    }
}

// Eliminar cliente
export async function deleteClient(id: string) {
    try {
        await prisma.customer.delete({
            where: { id }
        });

        revalidatePath('/admin/clientes');
        revalidatePath('/vivero');
        return { success: true };
    } catch (error: any) {
        console.error('Error al eliminar cliente:', error);
        return { error: 'No se pudo eliminar el cliente.' };
    }
}

// ==========================================
// ALIAS PARA COMPATIBILIDAD CON VENTAS (ventas.tsx)
// ==========================================
export const getCustomers = getClients;
export const createCustomer = createClient;