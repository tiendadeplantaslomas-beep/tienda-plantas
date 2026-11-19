import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const userEmailCookie = cookieStore.get('erp_user_email')?.value;

        const { searchParams } = new URL(request.url);
        const emailQuery = searchParams.get('email');

        const targetEmail = userEmailCookie || emailQuery;

        if (!targetEmail) {
            return NextResponse.json({
                success: false,
                error: 'No hay sesión activa o email identificado'
            }, { status: 401 });
        }

        const user = await prisma.customer.findFirst({
            where: { email: targetEmail }
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Usuario no encontrado en la base de datos'
            }, { status: 404 });
        }

        return NextResponse.json({
            nombre: user.name || '',
            email: user.email,
            imagenUrl: user.image_url || ''
        });
    } catch (error: any) {
        console.error('Error en GET /api/admin/perfil:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al cargar perfil'
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { nombre, email, imagenUrl, currentEmail } = body;

        const cookieStore = await cookies();
        const userEmailCookie = cookieStore.get('erp_user_email')?.value;

        const targetEmail = userEmailCookie || currentEmail || email;

        if (!targetEmail) {
            return NextResponse.json({
                success: false,
                error: 'No se pudo identificar el usuario actual para actualizar.'
            }, { status: 400 });
        }

        const targetUser = await prisma.customer.findFirst({
            where: { email: targetEmail }
        });

        if (!targetUser) {
            return NextResponse.json({
                success: false,
                error: 'No se encontró el registro del usuario en TiDB.'
            }, { status: 404 });
        }

        // Actualización en TiDB persistiendo nombre, email y la imagen en Base64
        const updated = await prisma.customer.update({
            where: { id: targetUser.id },
            data: {
                name: nombre,
                email: email,
                image_url: imagenUrl !== undefined ? imagenUrl : targetUser.image_url
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