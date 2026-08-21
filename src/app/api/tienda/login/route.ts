import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Acceso directo a propiedades (sin destructuración)
        const emailInput = body.email;
        const passwordInput = body.password;

        if (!emailInput || !passwordInput) {
            return NextResponse.json({ error: 'Faltan datos de login' }, { status: 400 });
        }

        const cleanEmail = emailInput.toLowerCase().trim();

        const customer = await prisma.customer.findUnique({
            where: { email: cleanEmail }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
        }

        // Validar contraseña
        const isMatch = await bcrypt.compare(passwordInput, customer.password_hash);
        if (!isMatch) {
            return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
        }

        // Validar verificado (si aplica)
        if (customer.email_verified !== 1) {
            return NextResponse.json({ error: 'Cuenta no verificada' }, { status: 403 });
        }

        const { password_hash, ...publicData } = customer;
        return NextResponse.json({ success: true, customer: publicData });

    } catch (error) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}