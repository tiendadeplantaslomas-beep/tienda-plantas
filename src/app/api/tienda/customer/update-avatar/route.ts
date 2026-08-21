import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { customerId, gender, imageUrl } = body;

        if (!customerId) {
            return NextResponse.json({ error: 'ID de cliente requerido.' }, { status: 400 });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                gender: gender || 'neutral',
                image_url: imageUrl || null
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Avatar actualizado correctamente',
            customer: updatedCustomer
        });

    } catch (error: any) {
        console.error('Error al actualizar avatar:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}