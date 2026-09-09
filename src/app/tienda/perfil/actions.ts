'use server';

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// 1. Obtener perfil completo y sus compras asociadas
export async function getCustomerProfileWithOrders() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('customer_session');

        if (!sessionCookie) {
            return { success: false, error: 'No hay una sesión activa.' };
        }

        const sessionData = JSON.parse(sessionCookie.value);
        const customerId = sessionData.id;

        // Buscar al cliente en la base de datos
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            return { success: false, error: 'Cliente no encontrado.' };
        }

        // Buscar las ventas/pedidos realizados por este cliente
        // (Asegúrate de que tu modelo Sale o Order tenga un campo customerId o email que los relacione)
        const orders = await prisma.sale.findMany({
            where: {
                OR: [
                    { customerId: customerId },
                    { email: customer.email } // Respaldo por si se vincula por email
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                items: true // Trae los productos de cada compra si tu esquema lo soporta
            }
        });

        const { password_hash, verification_token, ...safeCustomer } = customer;

        return {
            success: true,
            customer: safeCustomer,
            orders: orders || []
        };

    } catch (error) {
        console.error('Error al obtener perfil y compras:', error);
        return { success: false, error: 'Error interno al cargar el perfil.' };
    }
}

// 2. Actualizar datos del perfil (Dirección, Teléfono, etc.)
export async function updateCustomerProfile(formData: {
    name: string;
    phone: string;
    address: string;
    dni_cuit: string;
    gender: string;
}) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('customer_session');

        if (!sessionCookie) {
            return { success: false, error: 'No autorizado.' };
        }

        const sessionData = JSON.parse(sessionCookie.value);
        const customerId = sessionData.id;

        // Actualizar en Prisma
        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                name: formData.name.trim().toUpperCase(),
                phone: formData.phone.trim(),
                address: formData.address.trim().toUpperCase(),
                dni_cuit: formData.dni_cuit.trim(),
                gender: formData.gender
            }
        });

        revalidatePath('/tienda/perfil');
        return { success: true, message: 'Perfil actualizado correctamente.', customer: updatedCustomer };

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        return { success: false, error: 'No se pudo actualizar el perfil.' };
    }
}