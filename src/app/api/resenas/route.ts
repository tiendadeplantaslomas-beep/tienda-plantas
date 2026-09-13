import { NextResponse } from 'next/server';
// Importa aquí tu cliente de base de datos (por ejemplo, Prisma: import { prisma } from '@/lib/prisma';)

export async function GET() {
    try {
        // EJEMPLO CON PRISMA O BASE DE DATOS:
        // const resenas = await prisma.resena.findMany({ orderBy: { fecha: 'desc' } });
        // return NextResponse.json(resenas);

        // Respuesta vacía o mock inicial mientras configuras tu ORM/Base de datos
        return NextResponse.json([]);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, comentario, estrellas } = body;

        // Validación básica
        if (!nombre || !comentario) {
            return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        // EJEMPLO DE GUARDADO EN BASE DE DATOS:
        // const nuevaResena = await prisma.resena.create({
        //     data: { nombre, comentario, estrellas: Number(estrellas), fecha: new Date().toLocaleDateString() }
        // });
        // return NextResponse.json(nuevaResena);

        // Mock de respuesta exitosa para pruebas inmediatas:
        const nuevaResenaMock = {
            id: Date.now(),
            nombre,
            comentario,
            estrellas: Number(estrellas),
            fecha: 'Recién publicado'
        };

        return NextResponse.json(nuevaResenaMock, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Error al guardar la reseña' }, { status: 500 });
    }
}