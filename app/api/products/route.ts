import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Obtener todos los productos
export async function GET() {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
    }
}

// POST: Crear un nuevo producto
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, description, price, stock, category, imageUrl } = body;

        const newProduct = await prisma.product.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                category,
                imageUrl,
            },
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
    }
}