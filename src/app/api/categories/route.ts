// src/app/api/categories/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Consultamos la tabla Category de Prisma
        const categorias = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });

        if (categorias.length > 0) {
            return NextResponse.json(categorias.map(c => ({ id: c.id, name: c.name })));
        }

        // Si aún no hay registros en la tabla Category, leemos las categorías usadas en Product
        const productos = await prisma.product.findMany({
            include: { category: true }
        });

        const catMap = new Map<string, string>();
        productos.forEach((p) => {
            if (p.category) {
                catMap.set(p.category.id, p.category.name);
            }
        });

        const lista = Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));

        if (lista.length === 0) {
            return NextResponse.json([
                { id: '1', name: 'Plantas de Interior' },
                { id: '2', name: 'Plantas de Exterior' },
                { id: '3', name: 'Macetas' },
                { id: '4', name: 'Sustratos' }
            ]);
        }

        return NextResponse.json(lista);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return NextResponse.json([
            { id: '1', name: 'Plantas de Interior' },
            { id: '2', name: 'Plantas de Exterior' },
            { id: '3', name: 'Macetas' },
            { id: '4', name: 'Sustratos' }
        ]);
    }
}