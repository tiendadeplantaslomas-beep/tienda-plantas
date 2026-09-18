import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener todas las reseñas activas
export async function GET() {
    try {
        const resenasDB = await prisma.resena.findMany({
            where: { activo: true },
            orderBy: { createdAt: 'desc' }
        });

        const resenasFormateadas = resenasDB.map((r) => ({
            id: r.id,
            nombre: r.nombre || 'Anónimo',
            comentario: r.comentario || '',
            estrellas: r.calificacion || 5,
            respuesta: r.respuesta || null, // 👈 Devolvemos la respuesta si existe
            fecha: new Date(r.createdAt).toLocaleDateString()
        }));

        return NextResponse.json(resenasFormateadas, { status: 200 });
    } catch (error) {
        console.error('Error al obtener reseñas:', error);
        return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
    }
}

// POST: Crear una reseña (Solo para usuarios registrados)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, comentario, estrellas, customerId } = body;

        // Validamos que el usuario esté registrado/logueado
        if (!customerId || !nombre || !comentario) {
            return NextResponse.json(
                { error: 'Debes iniciar sesión para dejar una reseña y completar los campos obligatorios.' },
                { status: 400 }
            );
        }

        const nuevaResena = await prisma.resena.create({
            data: {
                nombre,
                comentario,
                calificacion: Number(estrellas) || 5,
                activo: true
            }
        });

        return NextResponse.json({
            id: nuevaResena.id,
            nombre: nuevaResena.nombre,
            comentario: nuevaResena.comentario,
            estrellas: nuevaResena.calificacion,
            respuesta: null,
            fecha: 'Recién publicado'
        }, { status: 201 });
    } catch (error) {
        console.error('Error al guardar la reseña:', error);
        return NextResponse.json({ error: 'Error al guardar la reseña' }, { status: 500 });
    }
}

// PATCH: Permitir a la tienda responder una reseña
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, respuesta } = body;

        if (!id) {
            return NextResponse.json({ error: 'Falta el ID de la reseña.' }, { status: 400 });
        }

        const resenaActualizada = await prisma.resena.update({
            where: { id: Number(id) },
            data: { respuesta }
        });

        return NextResponse.json({
            success: true,
            message: 'Respuesta guardada con éxito',
            resena: resenaActualizada
        });
    } catch (error) {
        console.error('Error al responder reseña:', error);
        return NextResponse.json({ error: 'Error al actualizar la respuesta' }, { status: 500 });
    }
}