import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Faltan datos obligatorios.' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
        }

        // Buscamos al cliente que posea ese token de recuperación activo
        const customer = await prisma.customer.findFirst({
            where: { verification_token: token }
        });

        if (!customer) {
            return NextResponse.json({ error: 'El enlace de recuperación es inválido o ya ha expirado.' }, { status: 400 });
        }

        // Hasheamos la nueva contraseña de forma segura
        const password_hash = await bcrypt.hash(newPassword, 10);

        // Actualizamos la contraseña y limpiamos el token para que no se pueda volver a usar
        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                password_hash,
                verification_token: null
            }
        });

        return NextResponse.json({ message: '¡Contraseña restablecida con éxito!' });

    } catch (error) {
        console.error('Error en reset-password:', error);
        return NextResponse.json({ error: 'Error al intentar restablecer la contraseña.' }, { status: 500 });
    }
}