'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function getClients(searchTerm?: string, sortOrder: 'asc' | 'desc' = 'asc', roleFilter?: string, activeTab?: 'clientes' | 'personal') {
    try {
        const query = searchTerm ? searchTerm.trim() : '';
        const whereClause: any = {};

        if (query) {
            whereClause.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
                { address: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { dni_cuit: { contains: query } },
            ];
        }

        const internalRoles = ['ADMIN', 'CAJERO', 'OPERADOR', 'DEPOSITO'];

        if (roleFilter && roleFilter !== 'todos') {
            whereClause.role = roleFilter;
        } else if (activeTab === 'clientes') {
            // En solapa Clientes: excluimos al personal interno
            whereClause.role = { notIn: internalRoles };
        } else if (activeTab === 'personal') {
            // En solapa Personal: mostramos únicamente al personal interno
            whereClause.role = { in: internalRoles };
        }

        const clients = await prisma.customer.findMany({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
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

    if (!cleanAddr.includes('BUENOS AIRES') && !cleanAddr.includes('ARGENTINA') && !cleanAddr.includes('CABA')) {
        cleanAddr = `${cleanAddr}, BUENOS AIRES, ARGENTINA`;
    } else if (!cleanAddr.includes('ARGENTINA')) {
        cleanAddr = `${cleanAddr}, ARGENTINA`;
    }

    return cleanAddr;
}

export async function createClient(data: { name: string; phone?: string; address?: string; email: string; dni_cuit?: string; role?: string; password?: string }) {
    try {
        if (!data.name || data.name.trim() === '') {
            return { error: 'El nombre y apellido del cliente son obligatorios.' };
        }

        if (!data.email || data.email.trim() === '') {
            return { error: 'El correo electrónico es obligatorio.' };
        }

        const formattedAddress = formatAddress(data.address);
        const rawPassword = data.password && data.password.trim() !== '' ? data.password.trim() : 'Plantas123*';
        const password_hash = await bcrypt.hash(rawPassword, 10);

        const newClient = await prisma.customer.create({
            data: {
                name: data.name.trim().toUpperCase(),
                phone: data.phone?.trim() || 'S/N',
                address: formattedAddress,
                email: data.email.trim().toLowerCase(),
                password_hash,
                dni_cuit: data.dni_cuit?.trim() || '00000000',
                role: data.role || 'cliente_presencial',
                origin: 'admin'
            }
        });

        revalidatePath('/admin/clientes');
        revalidatePath('/clientes');
        revalidatePath('/vivero');
        return { success: true, client: newClient };
    } catch (error: any) {
        console.error('Error al crear cliente:', error);
        if (error.code === 'P2002') {
            return { error: 'Ya existe un cliente registrado con este correo electrónico.' };
        }
        return { error: 'Ocurrió un error al registrar el cliente en la base de datos.' };
    }
}

export async function updateClient(id: string, data: { name: string; phone?: string; address?: string; email: string; dni_cuit?: string; role?: string; password?: string }) {
    try {
        if (!data.name || data.name.trim() === '') {
            return { error: 'El nombre y apellido del cliente son obligatorios.' };
        }

        if (!data.email || data.email.trim() === '') {
            return { error: 'El correo electrónico es obligatorio.' };
        }

        const formattedAddress = formatAddress(data.address);
        const updateData: any = {
            name: data.name.trim().toUpperCase(),
            phone: data.phone?.trim() || 'S/N',
            address: formattedAddress,
            email: data.email.trim().toLowerCase(),
            ...(data.dni_cuit ? { dni_cuit: data.dni_cuit.trim() } : {}),
            ...(data.role ? { role: data.role } : {}),
        };

        if (data.password && data.password.trim() !== '') {
            updateData.password_hash = await bcrypt.hash(data.password.trim(), 10);
        }

        const updatedClient = await prisma.customer.update({
            where: { id },
            data: updateData
        });

        revalidatePath('/admin/clientes');
        revalidatePath('/clientes');
        revalidatePath('/vivero');
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

        revalidatePath('/admin/clientes');
        revalidatePath('/clientes');
        revalidatePath('/vivero');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        return { error: 'Ocurrió un error al eliminar el cliente.' };
    }
}

// ==========================================
// AUTENTICACIÓN DE PERSONAL INTERNO (CON DEBUGIN)
// ==========================================
const INTERNAL_ROLES = ['ADMIN', 'CAJERO', 'OPERADOR', 'DEPOSITO'];

export async function authenticateInternalUser(emailInput: string, passwordInput: string) {
    const email = emailInput.trim().toLowerCase();

    console.log('--- INTENTO DE LOGIN ---');
    console.log('Email buscado:', email);
    console.log('Password tipeada:', passwordInput);

    if (!email || !passwordInput) {
        return { success: false, error: 'Correo y contraseña son obligatorios.' };
    }

    try {
        const user = await prisma.customer.findUnique({
            where: { email },
        });

        if (!user) {
            console.log('❌ Error: Usuario no encontrado en la base de datos.');
            return { success: false, error: 'Usuario no registrado en el sistema.' };
        }

        console.log('✓ Usuario encontrado:', user.email, '| Rol:', user.role);

        if (!INTERNAL_ROLES.includes(user.role)) {
            console.log('❌ Error: Rol sin permisos internos:', user.role);
            return { success: false, error: 'Acceso denegado: El usuario no posee perfil de personal interno.' };
        }

        console.log('Hash guardado en DB:', user.password_hash);
        const isPasswordValid = await bcrypt.compare(passwordInput, user.password_hash);
        console.log('¿Contraseña válida por bcrypt?:', isPasswordValid);

        if (!isPasswordValid) {
            return { success: false, error: 'Contraseña incorrecta.' };
        }

        const cookieStore = await cookies();
        cookieStore.set({
            name: 'admin_session',
            value: JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 12,
        });

        console.log('✓ Login exitoso para:', user.email);
        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        };
    } catch (error: any) {
        console.error('❌ Error crítico en autenticación:', error);
        return { success: false, error: 'Error al conectar con la base de datos.' };
    }
}
export async function fixAdminPasswordNow() {
    const newHash = await bcrypt.hash('admin123', 10);
    await prisma.customer.update({
        where: { email: 'tiendadeplantas.lomas@gmail.com' },
        data: {
            password_hash: newHash,
            role: 'ADMIN'
        }
    });
    console.log('✅ CONTRASEÑA ACTUALIZADA A: admin123');
    return { success: true };
}

// Aliases de compatibilidad
export const getCustomers = getClients;
export const createCustomer = createClient;
