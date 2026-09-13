import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const banners = await prisma.banner.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' },
        });
        return NextResponse.json(banners);
    } catch (error) {
        console.error('Error al obtener Banners:', error);
        return NextResponse.json({ error: 'Error al obtener Banners' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { titulo, subtitulo, imagenUrl, link, badge, orden } = body;

        const nuevoBanner = await prisma.banner.create({
            data: {
                titulo,
                subtitulo: subtitulo || '',
                imagenUrl,
                link: link || '',
                badge: badge || '',
                orden: Number(orden) || 0,
                activo: true,
            },
        });

        return NextResponse.json({ success: true, message: 'Banner creado con éxito', data: nuevoBanner });
    } catch (error) {
        console.error('Error al crear Banner:', error);
        return NextResponse.json({ error: 'Error al guardar el Banner' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

        await prisma.banner.update({
            where: { id: Number(id) },
            data: { activo: false },
        });

        return NextResponse.json({ success: true, message: 'Banner eliminado' });
    } catch (error) {
        console.error('Error al eliminar Banner:', error);
        return NextResponse.json({ error: 'Error al eliminar Banner' }, { status: 500 });
    }
}