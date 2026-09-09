'use server';

import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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

        // 1. Validar que la contraseña coincida con el hash de la base de datos
        if (!passwordInput || !customer.password_hash) {
            return { success: false, error: 'Contraseña incorrecta.' };
        }

        const isPasswordValid = await bcrypt.compare(passwordInput, customer.password_hash);
        if (!isPasswordValid) {
            return { success: false, error: 'Contraseña incorrecta.' };
        }

        // 2. Validar que la cuenta esté verificada (si usas email_verified)
        if (customer.email_verified !== 1) {
            return { success: false, error: 'Cuenta no verificada. Por favor revisá tu correo.' };
        }

        // 3. Crear una cookie de sesión segura (HttpOnly)
        const cookieStore = await cookies();
        cookieStore.set({
            name: 'customer_session',
            value: JSON.stringify({ id: customer.id, email: customer.email, name: customer.name }),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 días
        });

        // Omitimos el password_hash antes de enviarlo al cliente por seguridad
        const { password_hash, ...publicCustomer } = customer;

        return { success: true, customer: publicCustomer };
    } catch (error) {
        console.error('Error al validar cliente en Prisma:', error);
        return { success: false, error: 'Ocurrió un error al conectar con la base de datos.' };
    }
}