'use server';

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

export async function authenticateCustomer(emailInput: string, passwordInput: string) {
    const email = emailInput.trim().toLowerCase();

    if (!email || !email.includes('@')) {
        return { success: false, error: 'Por favor ingresa un correo electrónico válido.' };
    }

    try {
        // Consulta directa a la tabla Customer usando prisma
        const customer = await prisma.customer.findUnique({
            where: { email },
        });

        if (!customer) {
            return {
                success: false,
                error: 'El correo electrónico no se encuentra registrado.',
                showRegister: true
            };
        }

        // Si manejas contraseña en la tabla Customer, podés descomentar y adaptar esto:
        // if (passwordInput && customer.password && customer.password !== passwordInput) {
        //     return { success: false, error: 'Contraseña incorrecta.' };
        // }

        // Crear una cookie de sesión segura (HttpOnly)
        const cookieStore = await cookies();
        cookieStore.set({
            name: 'customer_session',
            value: JSON.stringify({ id: customer.id, email: customer.email, name: customer.name }),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 días
        });

        return { success: true, customer };
    } catch (error) {
        console.error('Error al validar cliente en Prisma:', error);
        return { success: false, error: 'Ocurrió un error al conectar con la base de datos.' };
    }
}