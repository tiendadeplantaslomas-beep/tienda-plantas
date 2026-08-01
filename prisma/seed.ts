import { PrismaClient, SalesChannel, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Limpiando base de datos e insertando datos iniciales...');

    // 1. Limpieza de datos previa (orden de borrado respetando FKs)
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchase.deleteMany();
    await prisma.product.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();

    // 2. Crear Categoría de prueba
    const categoriaPlantas = await prisma.category.create({
        data: {
            name: 'Plantas de Interior',
            defaultMargin: 100,
        },
    });

    // 3. Crear Producto de prueba
    const productoPlanta = await prisma.product.create({
        data: {
            code: 'P001',
            name: 'Ficus Lyrata',
            cost: 5000,
            price: 10000,
            stock: 10,
            trackStock: true,
            categoryId: categoriaPlantas.id,
        },
    });

    // 4. Crear Venta de prueba
    await prisma.sale.create({
        data: {
            channel: SalesChannel.MOSTRADOR,
            paymentMethod: PaymentMethod.EFECTIVO,
            total: 10000,
            customerName: 'Cliente Prueba',
            items: {
                create: [
                    {
                        productId: productoPlanta.id,
                        quantity: 1,
                        price: 10000,
                    },
                ],
            },
        },
    });

    console.log('✅ Seed completado con éxito.');
}

main()
    .catch((e) => {
        console.error('❌ Error ejecutando el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        // Desconexión limpia de Prisma
        await prisma.$disconnect();
    });