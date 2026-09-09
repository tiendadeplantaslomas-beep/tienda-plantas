import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Obtener todos los productos con sus relaciones
export async function GET() {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true, // Importante para traer el nombre de la categoría
                supplier: true, // Importante para traer el proveedor si existe
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
            taxRate
        } = body;

        const newProduct = await prisma.product.create({
            data: {
                code,
                name,
                description,
                price: parseInt(price, 10), // En tu esquema es Int
                cost: parseInt(cost, 10),   // En tu esquema es Int
                stock: parseInt(stock, 10) || 0,
                categoryId,                  // Debe ser el ID de la categoría
                supplierId: supplierId || null,
                imageUrl,
                margin: margin ? parseFloat(margin) : 100,
                taxRate: taxRate ? parseFloat(taxRate) : 21,
            },
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        console.error("Error al crear producto:", error);
        return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
    }
}