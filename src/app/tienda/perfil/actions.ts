'use server';

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/navigation';

export async function updateCustomerAvatar(formData: FormData) {
    try {
        // 1. Leer la cookie de sesión segura
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('customer_session');

        if (!sessionCookie) {
            return { success: false, error: 'No se encontró una sesión activa. Por favor inicia sesión nuevamente.' };
        }

        const sessionData = JSON.parse(sessionCookie.value);
        const customerId = sessionData.id;

        if (!customerId) {
            return { success: false, error: 'ID de cliente requerido.' };
        }

        // 2. Obtener los datos del formulario (la imagen o el estilo)
        const imageUrl = formData.get('image_url')?.toString();
        const gender = formData.get('gender')?.toString();

        // 3. Actualizar el registro en la tabla Customer usando Prisma
        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                ...(imageUrl ? { image_url: imageUrl } : {}),
                ...(gender ? { gender: gender } : {}),
            },
        });

        // 4. Actualizar la cookie con los nuevos datos si es necesario
        cookieStore.set({
            name: 'customer_session',
            value: JSON.stringify({
                id: updatedCustomer.id,
                email: updatedCustomer.email,
                name: updatedCustomer.name,
                image_url: updatedCustomer.image_url
            }),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        revalidatePath('/tienda/perfil');
        return { success: true, customer: updatedCustomer };

    } catch (error) {
        console.error('Error al actualizar el avatar:', error);
        return { success: false, error: 'Ocurrió un error al actualizar la imagen en la base de datos.' };
    }
}