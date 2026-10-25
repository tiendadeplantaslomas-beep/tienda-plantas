import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
    try {
        // Buscamos de forma segura al administrador por su rol en TiDB[cite: 5]
        let user = await prisma.customer.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!user) {
            const session = await getServerSession(authOptions);
            return NextResponse.json({
                nombre: session?.user?.name || 'Daniel A. Urraca',
                email: session?.user?.email || 'admin@tiendadeplantas.com',
                imagenUrl: session?.user?.image || ''
            });
        }

        return NextResponse.json({
            nombre: user.name,
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
        const { nombre, email, imagenUrl } = body;

        // Buscamos al administrador actual por su rol
        const adminUser = await prisma.customer.findFirst({
            where: { role: 'ADMIN' }
        });

        let updated;
        if (adminUser) {
            // Actualización directa y persistente en TiDB usando el ID del admin
            updated = await prisma.customer.update({
                where: { id: adminUser.id },
                data: {
                    name: nombre,
                    email: email,
                    image_url: imagenUrl !== undefined ? imagenUrl : adminUser.image_url
                }
            });
        } else {
            // Creación de emergencia por si faltara el registro de admin
            updated = await prisma.customer.create({
                data: {
                    email: email || 'admin@tiendadeplantas.com',
                    name: nombre || 'Daniel A. Urraca',
                    image_url: imagenUrl || null,
                    password_hash: '$2b$10$AdminDefaultHashForSessionUser12345',
                    role: 'ADMIN',
                    phone: '11-0000-0000',
                    address: 'Lomas de Zamora, Buenos Aires',
                    dni_cuit: '20-00000000-0',
                    gender: 'MASCULINO'
                }
            });
        }

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