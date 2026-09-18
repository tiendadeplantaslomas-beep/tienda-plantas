import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'El correo electrónico es obligatorio.' }, { status: 400 });
        }

        // Buscamos al cliente por su email
        const customer = await prisma.customer.findUnique({ where: { email } });

        // Por seguridad, si no existe, igual respondemos con éxito genérico para evitar que espíen correos,
        // pero si existe, le generamos el token de recuperación.
        if (customer) {
            const resetToken = crypto.randomBytes(32).toString('hex');

            // Guardamos el token en la base de datos (aprovechando verification_token)
            await prisma.customer.update({
                where: { email },
                data: { verification_token: resetToken }
            });

            // Aquí armamos el link que se enviaría por email (ej: Resend o Nodemailer)
            const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/tienda/reset-password?token=${resetToken}`;

            // Lo dejamos en consola para pruebas locales inmediatas
            console.log('🔗 ENLACE DE RECUPERACIÓN (SIMULADO):', resetLink);
        }

        return NextResponse.json({
            message: 'Si el correo está registrado, recibirás las instrucciones en breve.'
        });

    } catch (error) {
        console.error('Error en forgot-password:', error);
        return NextResponse.json({ error: 'Error interno al procesar la solicitud.' }, { status: 500 });
    }
}