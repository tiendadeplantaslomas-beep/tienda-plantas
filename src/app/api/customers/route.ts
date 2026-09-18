import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET: Obtener todos los clientes
export async function GET() {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { created_at: 'desc' }
        });
        return NextResponse.json(customers);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return NextResponse.json(
            { error: 'Error al obtener los clientes' },
            { status: 500 }
        );
    }
}

// POST: Crear nuevo cliente
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, phone, address, dni_cuit, password } = body;

        if (!name || !email) {
            return NextResponse.json({ error: 'El nombre y el email son obligatorios.' }, { status: 400 });
        }

        const existing = await prisma.customer.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: 'Ya existe un cliente con ese correo electrónico.' },
                { status: 409 }
            );
        }

        const password_hash = await bcrypt.hash(password || '123456', 10);

        const newCustomer = await prisma.customer.create({
            data: {
                name,
                email,
                password_hash,
                phone: phone || '',
                address: address || '',
                dni_cuit: dni_cuit || '',
                origin: 'admin',
                email_verified: 1
            }
        });

        return NextResponse.json(newCustomer, { status: 201 });

    } catch (error: any) {
        console.error('ERROR EN API CUSTOMERS:', error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: 'Ya existe un cliente con ese dato (e-mail).' },
                    { status: 409 }
                );
            }
        }

        return NextResponse.json(
            { error: error.message || 'Error interno al crear el cliente' },
            { status: 500 }
        );
    }
}