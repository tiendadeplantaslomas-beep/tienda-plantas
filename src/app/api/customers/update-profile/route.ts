import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { customerId, name, phone, address } = body;

        if (!customerId) {
            return NextResponse.json({ error: 'ID de cliente requerido.' }, { status: 400 });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                ...(name && { name: name.toUpperCase().trim() }),
                ...(phone && { phone: phone.trim() }),
                ...(address && { address: address.toUpperCase().trim() })
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Datos actualizados correctamente',
            customer: updatedCustomer
        });

    } catch (error: any) {
        console.error('Error al actualizar perfil:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}