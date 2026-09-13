import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { activo: true },
            select: { id: true, nombre: true, email: true, rol: true, activo: true }
        });
        return NextResponse.json(usuarios);
    } catch (error) {
        console.error('Error al obtener Usuarios:', error);
        return NextResponse.json({ error: 'Error al obtener Usuarios' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, email, password, rol } = body;

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre,
                email,
                password,
                rol: rol || 'CAJERO',
                activo: true,
            },
        });

        return NextResponse.json({ success: true, message: 'Usuario creado con éxito', data: nuevoUsuario });
    } catch (error) {
        console.error('Error al crear Usuario:', error);
        return NextResponse.json({ error: 'Error al guardar el Usuario' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 });

        await prisma.usuario.update({
            where: { id: Number(id) },
            data: { activo: false },
        });

        return NextResponse.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error al eliminar Usuario:', error);
        return NextResponse.json({ error: 'Error al eliminar Usuario' }, { status: 500 });
    }
}