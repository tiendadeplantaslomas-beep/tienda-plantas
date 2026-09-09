import { NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma'; // Ajusta según tu configuración

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');

        if (!customerId) {
            return NextResponse.json({ error: 'Falta el ID del cliente' }, { status: 400 });
        }

        /* 
          Ejemplo con Prisma (reemplazar según tu modelo de datos):
          const orders = await prisma.sale.findMany({
              where: { customerId: customerId },
              include: { items: true },
              orderBy: { createdAt: 'desc' }
          });
        */

        // Simulación o respuesta base mientras conectas tu modelo de base de datos:
        const orders: any[] = [];

        return NextResponse.json({ orders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Error al obtener los pedidos' }, { status: 500 });
    }
}