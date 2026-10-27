import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

interface BannerBody {
    id?: number | string;
    seccion?: string;
    titulo?: string | null;
    subtitulo?: string | null;
    imagenUrl?: string;
    link?: string | null;
    badge?: string | null;
    orden?: number | string;
    activo?: boolean;
    productosIds?: string[];
}

export async function GET() {
    try {
        const banners = await prisma.banner.findMany({
            orderBy: { orden: 'asc' }
        });

        // Aseguramos que productosIds siempre devuelva un array plano al cliente
        const bannersMapeados = banners.map(b => ({
            ...b,
            productosIds: Array.isArray(b.productosIds) ? b.productosIds : []
        }));

        return NextResponse.json(bannersMapeados);
    } catch (error: any) {
        console.error('Error al obtener banners:', error);
        return NextResponse.json({ error: 'Error al obtener los elementos' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body: BannerBody = await request.json();
        const { seccion, titulo, subtitulo, imagenUrl, link, badge, orden, activo, productosIds } = body;

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
                activo: activo !== undefined ? Boolean(activo) : true,
                productosIds: Array.isArray(productosIds) ? productosIds : []
            }
        });

        return NextResponse.json(nuevoBanner, { status: 201 });
    } catch (error: any) {
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

export async function PUT(request: Request) {
    try {
        const body: BannerBody = await request.json();
        const { id, seccion, titulo, subtitulo, imagenUrl, link, badge, orden, activo, productosIds } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID no proporcionado para actualizar' }, { status: 400 });
        }

        const bannerActualizado = await prisma.banner.update({
            where: { id: Number(id) },
            data: {
                ...(seccion !== undefined && { seccion: String(seccion) }),
                ...(titulo !== undefined && { titulo: titulo ? String(titulo) : null }),
                ...(subtitulo !== undefined && { subtitulo: subtitulo ? String(subtitulo) : null }),
                ...(imagenUrl !== undefined && { imagenUrl: String(imagenUrl) }),
                ...(link !== undefined && { link: link ? String(link) : null }),
                ...(badge !== undefined && { badge: badge ? String(badge) : null }),
                ...(orden !== undefined && { orden: Number(orden) }),
                ...(activo !== undefined && { activo: Boolean(activo) }),
                ...(productosIds !== undefined && { productosIds: Array.isArray(productosIds) ? productosIds : [] })
            }
        });

        return NextResponse.json(bannerActualizado, { status: 200 });
    } catch (error: any) {
        console.error('Error al actualizar banner:', error);
        return NextResponse.json(
            { error: 'Error al actualizar el elemento', detalle: error.message },
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