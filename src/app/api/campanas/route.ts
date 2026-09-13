import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const campanas = await prisma.campaign.findMany({
            where: { activo: true },
            orderBy: { id: 'desc' },
        });
        return NextResponse.json(campanas);
    } catch (error) {
        console.error('Error al obtener Campaign:', error);
        return NextResponse.json({ error: 'Error al obtener Campaign' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { titulo, descripcion, imagenUrl, etiqueta, tipo } = body;

        const nuevaCampana = await prisma.campaign.create({
            data: {
                titulo,
                descripcion: descripcion || '',
                imagenUrl: imagenUrl || '',
                etiqueta: etiqueta || '',
                tipo: tipo || 'verde',
                activo: true,
            },
        });

        return NextResponse.json({ success: true, message: 'Campaign creado con éxito', data: nuevaCampana });
    } catch (error) {
        console.error('Error al crear Campaign:', error);
        return NextResponse.json({ error: 'Error al guardar el Campaign' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

        await prisma.campaign.update({
            where: { id: Number(id) },
            data: { activo: false },
        });

        return NextResponse.json({ success: true, message: 'Campaign eliminado' });
    } catch (error) {
        console.error('Error al eliminar Campaign:', error);
        return NextResponse.json({ error: 'Error al eliminar Campaign' }, { status: 500 });
    }
}