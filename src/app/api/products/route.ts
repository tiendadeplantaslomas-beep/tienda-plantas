// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Obtener todos los productos (incluyendo destacado, categoría y proveedor)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const soloDestacados = searchParams.get('destacado');

        const products = await prisma.product.findMany({
            where: soloDestacados === 'true' ? { destacado: true } : undefined,
            include: {
                category: true,
                supplier: true,
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(products);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
    }
}