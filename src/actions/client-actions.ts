'use server';

import { prisma } from '@/lib/prisma';

export async function getClients(searchTerm?: string, sortOrder: 'asc' | 'desc' = 'asc') {
    try {
        const query = searchTerm ? searchTerm.trim() : '';
        const clients = await prisma.customer.findMany({
            where: query ? {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                    { address: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                ]
            } : undefined,
            orderBy: {
                name: sortOrder,
            }
        });
        return clients;
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return [];
    }
}

function formatAddress(addr?: string): string {
    if (!addr || addr.trim() === '') return 'SIN DIRECCIÓN';
    let cleanAddr = addr.trim().toUpperCase();

    // Aseguramos formato limpio para Maps (Calle y N°, C.P., Localidad, Provincia, Argentina)
    if (!cleanAddr.includes('BUENOS AIRES') && !cleanAddr.includes('ARGENTINA') && !cleanAddr.includes('CABA')) {
        cleanAddr = `${cleanAddr}, BUENOS AIRES, ARGENTINA`;
    } else if (!cleanAddr.includes('ARGENTINA')) {
        cleanAddr = `${cleanAddr}, ARGENTINA`;
    }

    return cleanAddr;
}

export async function createClient(data: { name: string; phone?: string; address?: string; email: string; dni_cuit?: string }) {
    try {
        if (!data.name || data.name.trim() === '') {
            return { error: 'El nombre y apellido del cliente son obligatorios.' };
        }

        if (!data.email || data.email.trim() === '') {
            return { error: 'El correo electrónico es obligatorio.' };
        }

        const formattedAddress = formatAddress(data.address);

        const newClient = await prisma.customer.create({
            data: {
                name: data.name.trim().toUpperCase(),
                phone: data.phone?.trim() || 'S/N',
                address: formattedAddress,
                email: data.email.trim().toLowerCase(),
                password_hash: 'NO_PASSWORD',
                dni_cuit: data.dni_cuit?.trim() || '00000000',
            }
        });

        return { success: true, client: newClient };
    } catch (error: any) {
        console.error('Error al crear cliente:', error);
        if (error.code === 'P2002') {
            return { error: 'Ya existe un cliente registrado con este correo electrónico.' };
        }
        return { error: 'Ocurrió un error al registrar el cliente en la base de datos.' };
    }
}

export async function updateClient(id: string, data: { name: string; phone?: string; address?: string; email: string; dni_cuit?: string }) {
    try {
        if (!data.name || data.name.trim() === '') {
            return { error: 'El nombre y apellido del cliente son obligatorios.' };
        }

        if (!data.email || data.email.trim() === '') {
            return { error: 'El correo electrónico es obligatorio.' };
        }

        const formattedAddress = formatAddress(data.address);

        const updatedClient = await prisma.customer.update({
            where: { id },
            data: {
                name: data.name.trim().toUpperCase(),
                phone: data.phone?.trim() || 'S/N',
                address: formattedAddress,
                email: data.email.trim().toLowerCase(),
                ...(data.dni_cuit ? { dni_cuit: data.dni_cuit.trim() } : {}),
            }
        });

        return { success: true, client: updatedClient };
    } catch (error: any) {
        console.error('Error al actualizar cliente:', error);
        if (error.code === 'P2002') {
            return { error: 'El correo electrónico ya está siendo usado por otro cliente.' };
        }
        return { error: 'Ocurrió un error al actualizar el cliente.' };
    }
}

export async function deleteClient(id: string) {
    try {
        await prisma.customer.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        return { error: 'Ocurrió un error al eliminar el cliente.' };
    }
}