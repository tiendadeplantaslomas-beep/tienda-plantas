import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { customerId, currentPassword, newPassword } = body;

        if (!customerId || !currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
        }

        // Buscar cliente en la base para verificar clave actual
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, customer.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 401 });
        }

        // Validar formato de la nueva contraseña
        if (newPassword.length < 8 || newPassword.length >= 15 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return NextResponse.json({ error: 'La nueva contraseña debe tener entre 8 y 14 caracteres, una mayúscula y un número.' }, { status: 400 });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await prisma.customer.update({
            where: { id: customerId },
            data: { password_hash: newPasswordHash }
        });

        return NextResponse.json({
            success: true,
            message: 'Contraseña actualizada con éxito.'
        });

    } catch (error: any) {
        console.error('Error al cambiar contraseña:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}