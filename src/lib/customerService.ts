import { prisma } from '@/lib/prisma'; // o '@/lib/db' según uses

export async function createCustomerService(body: any) {
    const rawName = body.name || body.nombre;
    const rawPhone = body.phone || body.telefono;
    const rawAddress = body.address || body.direccion;
    const rawEmail = body.email || body.correo;

    const cleanName = rawName?.trim();

    if (!cleanName) {
        throw new Error('El nombre del cliente es obligatorio.');
    }

    const cleanPhone = rawPhone?.trim() || null;
    const cleanAddress = rawAddress?.trim() ? rawAddress.trim().toUpperCase() : null;

    const cleanEmail = rawEmail?.trim()
        ? rawEmail.trim().toLowerCase()
        : `sin_email_${Date.now()}_${Math.floor(Math.random() * 1000)}@local.com`;

    return await prisma.customer.create({
        data: {
            name: cleanName.toUpperCase(),
            phone: cleanPhone,
            address: cleanAddress,
            email: cleanEmail,
            password_hash: body.password_hash || 'POS_USER_NO_PASSWORD',
            dni_cuit: body.dni_cuit?.trim() || 'SIN_DNI',
            gender: body.gender || 'OTRO',
            image_url: body.image_url || '',
            origin: body.origin || 'POS',
            // 💡 Eliminamos 'updatedAt' porque no existe en este modelo de Prisma
        }
    });
}