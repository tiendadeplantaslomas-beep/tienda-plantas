import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
    { name: 'INTERIOR', defaultMargin: 100 },
    { name: 'EXTERIOR', defaultMargin: 100 },
    { name: 'MACETAS - PLASTICAS', defaultMargin: 100 },
    { name: 'MACETAS - CEMENTO', defaultMargin: 100 },
    { name: 'SUSTRATOS', defaultMargin: 100 },
    { name: 'AGROQUIMICOS - INSECTICIDAS', defaultMargin: 100 },
    { name: 'AGROQUIMICOS - FERTILIZANTES', defaultMargin: 100 },
    { name: 'PLANTIN', defaultMargin: 100 },
    { name: 'ACCESORIOS', defaultMargin: 100 },
    { name: 'DECO', defaultMargin: 100 },
];

async function main() {
    console.log('🌱 Precargando categorías iniciales...');

    for (const cat of defaultCategories) {
        await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: {
                name: cat.name,
                defaultMargin: cat.defaultMargin,
            },
        });
    }

    console.log('✅ Categorías precargadas con éxito.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });