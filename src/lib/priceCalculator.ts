export interface PriceCalculationResult {
    subtotalNoTax: number;
    finalPrice: number;
}

/**
 * Calcula el subtotal (sin IVA) y el precio final aplicando la regla del margen.
 */
export function calculatePriceLogic(
    cost: number,
    otherCosts: number,
    margin: number,
    taxRate: number
): PriceCalculationResult {
    const baseCost = (cost || 0) + (otherCosts || 0);
    const marginVal = margin ?? 100;
    let subtotalNoTax = 0;

    if (marginVal >= 100) {
        subtotalNoTax = baseCost * (1 + marginVal / 100);
    } else {
        const marginDecimal = marginVal / 100;
        subtotalNoTax = marginDecimal < 1 ? baseCost / (1 - marginDecimal) : baseCost;
    }

    const finalPrice = subtotalNoTax * (1 + (taxRate || 0) / 100);

    return {
        subtotalNoTax: Number(subtotalNoTax.toFixed(2)),
        finalPrice: Math.round(finalPrice), // O toFixed(2) según tu preferencia de redondeo
    };
}