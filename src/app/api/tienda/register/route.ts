import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password, phone, address, dni_cuit, gender } = body;

        if (!name || !email || !password || !phone || !address || !dni_cuit) {
            return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
        }

        const cleanEmail = email.toLowerCase().trim();

        const existingCustomer = await prisma.customer.findUnique({ where: { email: cleanEmail } });
        if (existingCustomer) {
            return NextResponse.json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' }, { status: 400 });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const verification_token = crypto.randomBytes(32).toString('hex');

        await prisma.customer.create({
            data: {
                name,
                email: cleanEmail,
                password_hash,
                phone,
                address,
                dni_cuit,
                gender: gender || 'neutral',
                email_verified: 0,
                verification_token,
                origin: 'tienda'
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Registro exitoso. Revisá tu correo para verificar la cuenta.'
        });

    } catch (error: any) {
        console.error('Error en registro de tienda:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}