import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Patrón Singleton para evitar múltiples instancias de Prisma en desarrollo
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

interface BannerBody {
    seccion?: string;
    titulo?: string | null;
    subtitulo?: string | null;
    imagenUrl?: string;
    link?: string | null;
    badge?: string | null;
    orden?: number | string;
    activo?: boolean;
}

export async function GET() {
    try {
        const banners = await prisma.banner.findMany({
            orderBy: { orden: 'asc' }
        });
        return NextResponse.json(banners);
    } catch (error: any) {
        console.error('Error al obtener banners:', error);
        return NextResponse.json({ error: 'Error al obtener los elementos' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body: BannerBody = await request.json();
        const { seccion, titulo, subtitulo, imagenUrl, link, badge, orden, activo } = body;

        // Validar que la imagen exista (ya sea URL o Base64)
        if (!imagenUrl) {
            return NextResponse.json(
                { error: 'El campo "imagenUrl" es obligatorio.' },
                { status: 400 }
            );
        }

        const nuevoBanner = await prisma.banner.create({
            data: {
                seccion: seccion ? String(seccion) : 'hero',
                titulo: titulo ? String(titulo) : null,
                subtitulo: subtitulo ? String(subtitulo) : null,
                imagenUrl: String(imagenUrl),
                link: link ? String(link) : null,
                badge: badge ? String(badge) : null,
                orden: orden !== undefined && orden !== null ? Number(orden) : 0,
                activo: activo !== undefined ? Boolean(activo) : true
            }
        });

        return NextResponse.json(nuevoBanner, { status: 201 });
    } catch (error: any) {
        // Imprimir el error completo en la consola del servidor para inspección exacta
        console.error('Error detallado al guardar banner en Prisma:', {
            message: error.message,
            code: error.code,
            meta: error.meta
        });

        return NextResponse.json(
            {
                error: 'Error al guardar en la base de datos',
                detalle: error.message,
                codigoPrisma: error.code || 'DESCONOCIDO'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });
        }

        await prisma.banner.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error al eliminar banner:', error);
        return NextResponse.json({ error: 'Error al eliminar el elemento' }, { status: 500 });
    }
}