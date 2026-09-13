import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT: Actualizar una promoción existente (incluyendo categoría y pila de productos)
export async function PUT(
    request: Request,
    props: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = Number(params.id);
        const body = await request.json();

        const updatedPromotion = await prisma.promotion.update({
            where: { id },
            data: {
                titulo: body.titulo,
                descripcion: body.descripcion || null,
                badge: body.badge || null,
                linkWhatsapp: body.linkWhatsapp || null,
                imagenUrl: body.imagenUrl || null,
                activa: body.activa ?? true,
                stock: body.stock !== undefined ? Number(body.stock) : 10,
                categoria: body.categoria || null, // 👈 Categoría asociada
                desde: body.desde || null,
                hasta: body.hasta || null,
                // 👈 'set' reemplaza los productos anteriores de la pila por los nuevos seleccionados
                productos: {
                    set: body.productosIds?.map((prodId: number) => ({ id: prodId })) || [],
                },
            },
            include: {
                productos: true, // 👈 Para que devuelva la pila actualizada al frontend
            },
        });

        return NextResponse.json(updatedPromotion);
    } catch (error: any) {
        console.error('Error al actualizar promoción:', error);
        return NextResponse.json(
            { error: error.message || 'No se pudo actualizar la promoción en la base de datos.' },
            { status: 500 }
        );
    }
}

// DELETE: Eliminar una promoción
export async function DELETE(
    request: Request,
    props: { params: { id: string } | Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const id = Number(params.id);

        await prisma.promotion.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error al eliminar promoción:', error);
        return NextResponse.json(
            { error: error.message || 'No se pudo eliminar la promoción.' },
            { status: 500 }
        );
    }
}