import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { adminId, imageUrl, gender } = body;

        if (!adminId) {
            return NextResponse.json({ success: false, error: 'ID de administrador no proporcionado' }, { status: 400 });
        }

        // Actualizamos la imagen y el género del administrador en la tabla Customer
        const updatedCustomer = await prisma.customer.update({
            where: { id: adminId },
            data: {
                image_url: imageUrl || null,
                gender: gender || undefined
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Avatar actualizado correctamente',
            admin: updatedCustomer
        });
    } catch (error: any) {
        console.error('Error detallado en PATCH /api/admin/update-avatar:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al actualizar el avatar'
        }, { status: 500 });
    }
}