import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // 👈 Instancia compartida del proyecto

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, promotionId } = body;

        if (!customerId || !promotionId) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos (customerId o promotionId).' },
                { status: 400 }
            );
        }

        // 1. REGLA DE NEGOCIO: Verificar si el cliente ya tiene una promoción ACTIVA en su cuponera
        const existingActivePromo = await prisma.customerPromotion.findFirst({ // 👈 Nombre corregido a customerPromotion
            where: {
                customerId: String(customerId),
                status: 'activa',
            },
        });

        if (existingActivePromo) {
            return NextResponse.json(
                { error: 'Ya tenés una promoción activa en tu perfil. No son acumulativas y solo se permite una a la vez.' },
                { status: 400 }
            );
        }

        // 2. Buscar la promoción y validar existencia, estado y stock
        const promoIdNum = Number(promotionId);
        const promotion = await prisma.promotion.findUnique({
            where: { id: isNaN(promoIdNum) ? promotionId : promoIdNum },
        });

        if (!promotion || !promotion.activa) {
            return NextResponse.json(
                { error: 'La promoción no existe o ya no se encuentra disponible.' },
                { status: 404 }
            );
        }

        if (promotion.stock <= 0) {
            return NextResponse.json(
                { error: 'Lo sentimos, esta promoción se ha quedado sin stock.' },
                { status: 400 }
            );
        }

        // 3. TRANSACCIÓN SEGURA: Guardar en el perfil del usuario y descontar stock simultáneamente
        const result = await prisma.$transaction(async (tx) => {
            // Guardar en la cuponera del usuario
            const userPromo = await tx.customerPromotion.create({ // 👈 Nombre corregido a customerPromotion
                data: {
                    customerId: String(customerId),
                    promotionId: promotion.id,
                    status: 'activa',
                },
            });

            // Descontar 1 unidad al stock general
            const newStock = promotion.stock - 1;
            await tx.promotion.update({
                where: { id: promotion.id },
                data: {
                    stock: newStock,
                    activa: newStock > 0 ? promotion.activa : false, // Si llega a 0, se auto-desactiva
                },
            });

            return userPromo;
        });

        return NextResponse.json({
            success: true,
            message: '¡Promoción adquirida con éxito!',
            userPromotion: result,
        });

    } catch (error) {
        console.error('Error al reclamar la promoción:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor al procesar el beneficio.' },
            { status: 500 }
        );
    }
}