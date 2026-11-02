// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const identifier = resolvedParams.id;

        // Búsqueda inteligente automática: primero intenta por ID único de Prisma, si no por el código interno
        let producto = await prisma.product.findUnique({
            where: { id: identifier },
            include: {
                category: true,
                supplier: true,
            },
        });

        if (!producto) {
            producto = await prisma.product.findFirst({
                where: { code: identifier },
                include: {
                    category: true,
                    supplier: true,
                },
            });
        }

        if (!producto) {
            return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
        }

        return NextResponse.json(producto);
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        return NextResponse.json({ error: "Error al obtener el producto" }, { status: 500 });
    }
}