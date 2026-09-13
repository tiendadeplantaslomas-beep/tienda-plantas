import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET: Listar todas las promociones con su pila de productos
export async function GET() {
    try {
        const promotions = await prisma.promotion.findMany({
            include: {
                productos: true, // 👈 Trae los productos vinculados a la pila
            },
            orderBy: { id: 'desc' },
        });
        return NextResponse.json(promotions);
    } catch (error) {
        console.error('Error al obtener promociones:', error);
        return NextResponse.json(
            { error: 'Error al obtener las promociones de la base de datos.' },
            { status: 500 }
        );
    }
}

// POST: Crear una nueva promoción conectando su pila de productos
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const newPromotion = await prisma.promotion.create({
            data: {
                titulo: body.titulo,
                descripcion: body.descripcion,
                badge: body.badge,
                linkWhatsapp: body.linkWhatsapp,
                imagenUrl: body.imagenUrl,
                activa: body.activa ?? true,
                stock: body.stock ?? 10,
                categoria: body.categoria,
                desde: body.desde,
                hasta: body.hasta,
                // Conectamos los IDs de los productos elegidos para formar la pila
                productos: {
                    connect: body.productosIds?.map((id: number) => ({ id })) || [],
                },
            },
            include: {
                productos: true,
            },
        });

        return NextResponse.json(newPromotion, { status: 201 });
    } catch (error) {
        console.error('Error al crear promoción:', error);
        return NextResponse.json(
            { error: 'No se pudo crear la promoción en la base de datos.' },
            { status: 500 }
        );
    }
}