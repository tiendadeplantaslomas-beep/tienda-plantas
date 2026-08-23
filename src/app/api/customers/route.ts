import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { createCustomerService } from '@/lib/customerService'; // 👈 Apunta correctamente a lib

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

// POST: Crear nuevo cliente utilizando el servicio centralizado
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const newCustomer = await createCustomerService(body);
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