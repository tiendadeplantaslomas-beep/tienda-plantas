import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando la carga de datos iniciales en PostgreSQL...');

    // 1. Crear / Actualizar Usuario Administrador
    const emailAdmin = 'tiendadeplantas.lomas@gmail.com';
    const passAdmin = 'ViveroAdmin2026!';

    console.log(`Configurando Administrador único para: ${emailAdmin}...`);

    const adminUser = await prisma.user.upsert({
        where: { email: emailAdmin },
        update: {
            password: passAdmin, // Aseguramos que la clave quede actualizada
        },
        create: {
            email: emailAdmin,
            name: 'Daniel A. Urraca',
            password: passAdmin,
            role: 'ADMIN',
        },
    });

    // 2. Crear / Actualizar Usuario Cliente de Prueba
    const emailCliente = 'cliente@vivero.com';
    const passCliente = 'user123';

    const clienteUser = await prisma.user.upsert({
        where: { email: emailCliente },
        update: {
            password: passCliente,
        },
        create: {
            email: emailCliente,
            name: 'Cliente Mostrador',
            password: passCliente,
            role: 'CLIENTE',
        },
    });

    console.log('========================================================');
    console.log('🎉 ¡CARGA DE DATOS COMPLETADA CON ÉXITO! 🎉');
    console.log('========================================================');
    console.log(`👤 Administrador Creado: ${adminUser.name}`);
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`🔑 Contraseña: ${passAdmin}`);
    console.log('--------------------------------------------------------');
    console.log(`👤 Cliente Creado: ${clienteUser.name}`);
    console.log(`📧 Email: ${clienteUser.email}`);
    console.log(`🔑 Contraseña: ${passCliente}`);
    console.log('========================================================');
}

main()
    .catch((e) => {
        console.error('❌ Error durante la siembra de datos:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });