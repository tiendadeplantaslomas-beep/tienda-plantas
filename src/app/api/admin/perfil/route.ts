import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const emailSesion = session?.user?.email || 'admin@tiendadeplantas.com';

        // Buscamos al usuario de forma segura
        const user = await prisma.customer.findUnique({
            where: { email: emailSesion }
        });

        if (!user) {
            return NextResponse.json({
                nombre: session?.user?.name || 'Daniel Urraca',
                email: emailSesion,
                imagenUrl: session?.user?.image || ''
            });
        }

        return NextResponse.json({
            nombre: user.name,
            email: user.email,
            imagenUrl: user.image_url || ''
        });
    } catch (error: any) {
        console.error('Error detallado en GET /api/admin/perfil:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al cargar perfil'
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const emailSesion = session?.user?.email || 'admin@tiendadeplantas.com';

        const body = await request.json();
        const { nombre, email, imagenUrl } = body;

        // Actualizamos usando update único por email (evita el error P2000 de updateMany)
        const updated = await prisma.customer.update({
            where: { email: emailSesion },
            data: {
                name: nombre,
                email: email,
                image_url: imagenUrl || null,
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            data: {
                nombre: updated.name,
                email: updated.email,
                imagenUrl: updated.image_url
            }
        });
    } catch (error: any) {
        console.error('Error detallado en PUT /api/admin/perfil:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al actualizar perfil'
        }, { status: 500 });
    }
}