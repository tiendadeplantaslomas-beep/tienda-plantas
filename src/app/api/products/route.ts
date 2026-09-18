import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Obtener todos los productos (incluyendo el campo destacado y relaciones)
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

// POST: Crear un nuevo producto adaptado a tu Schema
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            code,
            name,
            description,
            price,
            cost,
            stock,
            categoryId,
            supplierId,
            imageUrl,
            margin,
            taxRate,
            destacado
        } = body;

        const newProduct = await prisma.product.create({
            data: {
                code,
                name,
                description,
                price: parseInt(price, 10),
                cost: parseInt(cost, 10),
                stock: parseInt(stock, 10) || 0,
                categoryId,
                supplierId: supplierId || null,
                imageUrl,
                margin: margin ? parseFloat(margin) : 100,
                taxRate: taxRate ? parseFloat(taxRate) : 21,
                destacado: Boolean(destacado), // Guardamos si es destacado
            },
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        console.error("Error al crear producto:", error);
        return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
    }
}