import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando la carga de datos iniciales en la base...');

    // 1. Hashear contraseñas
    const passAdminRaw = 'ViveroAdmin2026!';
    const passClienteRaw = 'user123';

    const hashedAdminPassword = await bcrypt.hash(passAdminRaw, 10);
    const hashedClientePassword = await bcrypt.hash(passClienteRaw, 10);

    // 2. Crear / Actualizar Usuario Administrador
    const emailAdmin = 'tiendadeplantas.lomas@gmail.com';
    console.log(`Configurando Administrador para: ${emailAdmin}...`);

    const adminUser = await prisma.user.upsert({
        where: { email: emailAdmin },
        update: {
            password: hashedAdminPassword,
        },
        create: {
            email: emailAdmin,
            name: 'Daniel A. Urraca',
            password: hashedAdminPassword,
            role: 'ADMIN',
        },
    });

    // 3. Crear / Actualizar Usuario Cliente
    const emailCliente = 'cliente@vivero.com';
    console.log(`Configurando Cliente Mostrador para: ${emailCliente}...`);

    const clienteUser = await prisma.user.upsert({
        where: { email: emailCliente },
        update: {
            password: hashedClientePassword,
        },
        create: {
            email: emailCliente,
            name: 'Cliente Mostrador',
            password: hashedClientePassword,
            role: 'CLIENTE',
        },
    });

    // 4. Crear / Actualizar Categorías con Márgenes Sugeridos
    console.log('Cargando categorías iniciales del vivero...');

    const categoriesData = [
        { name: 'Plantas de Interior', defaultMargin: 100.0 },
        { name: 'Plantas de Exterior', defaultMargin: 120.0 },
        { name: 'Macetas de Cemento', defaultMargin: 120.0 },
        { name: 'Sustratos y Tierra', defaultMargin: 100.0 },
        { name: 'Agroquímicos', defaultMargin: 60.0 },
        { name: 'Macetas plásticas', defaultMargin: 80.0 },
        { name: 'Plantín Temporada', defaultMargin: 70.0 },
        { name: 'Accesorios de jardín', defaultMargin: 80.0 },
    ];

    const createdCategories: Record<string, string> = {};

    for (const cat of categoriesData) {
        const savedCategory = await prisma.category.upsert({
            where: { name: cat.name },
            update: {
                defaultMargin: cat.defaultMargin,
            },
            create: {
                name: cat.name,
                defaultMargin: cat.defaultMargin,
            },
        });
        createdCategories[savedCategory.name] = savedCategory.id;
    }

    // 5. Crear Productos Iniciales de Prueba usando los márgenes
    console.log('Cargando productos de prueba vinculados a sus categorías...');

    const initialProducts = [
        {
            code: 'PLT-001',
            name: 'Ficus Lyrata 10L',
            categoryName: 'Plantas de Interior',
            cost: 15000,
            margin: 100, // 100% de ganancia
            stock: 12,
        },
        {
            code: 'PLT-002',
            name: 'Alocasia Polly',
            categoryName: 'Plantas de Interior',
            cost: 8000,
            margin: 100,
            stock: 8,
        },
        {
            code: 'INS-001',
            name: 'Sustrato Premium 20L',
            categoryName: 'Sustratos y Tierra',
            cost: 4000,
            margin: 100,
            stock: 25,
        },
        {
            code: 'MAC-001',
            name: 'Maceta Cemento N30',
            categoryName: 'Macetas de Cemento',
            cost: 7000,
            margin: 120, // 120% de ganancia
            stock: 10,
        },
    ];

    for (const prod of initialProducts) {
        const categoryId = createdCategories[prod.categoryName];
        // Cálculo automático del precio de venta según costo y margen
        const calculatedPrice = prod.cost * (1 + prod.margin / 100);

        if (categoryId) {
            await prisma.product.upsert({
                where: { code: prod.code },
                update: {
                    name: prod.name,
                    categoryId: categoryId,
                    cost: prod.cost,
                    price: calculatedPrice,
                    stock: prod.stock,
                },
                create: {
                    code: prod.code,
                    name: prod.name,
                    categoryId: categoryId,
                    cost: prod.cost,
                    price: calculatedPrice,
                    stock: prod.stock,
                },
            });
        }
    }

    console.log('========================================================');
    console.log('🎉 ¡CARGA DE DATOS COMPLETADA CON ÉXITO! 🎉');
    console.log('========================================================');
    console.log(`👤 Administrador: ${adminUser.name} (${adminUser.email})`);
    console.log(`👤 Cliente: ${clienteUser.name} (${clienteUser.email})`);
    console.log(`🏷️ Categorías guardadas: ${categoriesData.length}`);
    console.log(`📦 Productos iniciales cargados: ${initialProducts.length}`);
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