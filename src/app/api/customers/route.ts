import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET: Obtener todos los clientes
export async function GET() {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { createdAt: 'desc' }
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

        // Mapeo flexible para soportar formularios en español o inglés
        const rawName = body.name || body.nombre;
        const rawPhone = body.phone || body.telefono;
        const rawAddress = body.address || body.direccion;
        const rawEmail = body.email || body.correo;

        // Limpieza básica
        const cleanName = rawName?.trim();

        // Validación obligatoria
        if (!cleanName) {
            return NextResponse.json(
                { error: 'El nombre del cliente es obligatorio.' },
                { status: 400 }
            );
        }

        // Convertir vacíos a null para evitar problemas en base de datos
        const cleanPhone = rawPhone?.trim() || null;
        const cleanAddress = rawAddress?.trim() ? rawAddress.trim().toUpperCase() : null;
        const cleanEmail = rawEmail?.trim() ? rawEmail.trim().toLowerCase() : null;

        const newCustomer = await prisma.customer.create({
            data: {
                name: cleanName.toUpperCase(),
                phone: cleanPhone,
                address: cleanAddress,
                email: cleanEmail,
                updatedAt: new Date(),
            }
        });

        return NextResponse.json(newCustomer, { status: 201 });

    } catch (error: any) {
        console.error('ERROR EN API CUSTOMERS:', error);

        // Captura de errores de Prisma (ej: campos únicos duplicados)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: 'Ya existe un cliente con ese dato (e-mail o teléfono).' },
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