import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function validateAndApplyCoupon(code: string, cartSubtotal: number) {
    try {
        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase().trim() }
        });

        if (!coupon) {
            return { error: 'El cupón ingresado no existe.' };
        }

        // 1. Validar si está activo
        if (!coupon.isActive) {
            return { error: 'Este cupón ya no está activo.' };
        }

        // 2. Validar fecha de expiración (si aplica)
        if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
            return { error: 'Este cupón ha expirado.' };
        }

        // 3. Validar monto mínimo de compra
        if (coupon.minPurchase && cartSubtotal < coupon.minPurchase) {
            return {
                error: `El monto mínimo para usar este cupón es de $${coupon.minPurchase.toLocaleString()}`
            };
        }

        // 4. Calcular el descuento (porcentaje o monto fijo)
        let discountAmount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (cartSubtotal * coupon.discountValue) / 100;
        } else {
            discountAmount = coupon.discountValue;
        }

        // Evitar que el descuento supere el subtotal
        if (discountAmount > cartSubtotal) {
            discountAmount = cartSubtotal;
        }

        return {
            success: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: Number(discountAmount.toFixed(2))
        };

    } catch (error) {
        console.error('Error al validar el cupón:', error);
        return { error: 'Error interno al procesar el cupón.' };
    }
}