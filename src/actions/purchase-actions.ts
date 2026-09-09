'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface PurchaseItemInput {
    productId?: string;
    code: string;
    name: string;
    categoryId?: string;
    quantity: number;
    unitCost: number;
    margin?: number;
}

export interface CreatePurchasePayload {
    supplierId?: string;
    supplierName?: string;
    docType: 'FACTURA' | 'REMITO' | 'PRESUPUESTO';
    docNumber?: string;
    date?: string;
    otherCostsTotal: number;
    notes?: string;
    userId?: string; // NUEVO: Usuario que realiza la carga
    paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO' | 'DEBITO' | 'MERCADOPAGO'; // NUEVO: Medio de pago
    items: PurchaseItemInput[];
}

export async function createPurchase(payload: CreatePurchasePayload) {
    try {
        const { supplierId, supplierName, docType, docNumber, date, otherCostsTotal, notes, userId, paymentMethod, items } = payload;

        if (!items || items.length === 0) {
            return { error: 'Debes incluir al menos un producto en la carga.' };
        }

        let finalSupplierId = supplierId;
        if (!finalSupplierId && supplierName) {
            const existingSupplier = await prisma.supplier.findFirst({
                where: { name: { equals: supplierName.trim() } }
            });
            if (existingSupplier) {
                finalSupplierId = existingSupplier.id;
            } else {
                const newSupplier = await prisma.supplier.create({
                    data: { name: supplierName.trim() }
                });
                finalSupplierId = newSupplier.id;
            }
        }

        if (!finalSupplierId) {
            return { error: 'Debes seleccionar o ingresar un proveedor válido.' };
        }

        const totalUnits = items.reduce((acc, item) => acc + Number(item.quantity), 0);
        const fletePerUnit = totalUnits > 0 ? Math.round(Number(otherCostsTotal) / totalUnits) : 0;

        const result = await prisma.$transaction(async (tx) => {

            // 1. Calcular el costo total preliminar para validaciones de caja
            const preliminarySubtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitCost)), 0);
            const totalPurchaseCost = preliminarySubtotal + Number(otherCostsTotal);

            // 2. Si se paga en EFECTIVO, validar caja abierta y registrar egreso automático
            if (paymentMethod === 'EFECTIVO') {
                if (!userId) {
                    throw new Error("Se requiere el ID del usuario para registrar compras pagadas en efectivo.");
                }

                const activeShift = await tx.cashShift.findFirst({
                    where: { userId: userId, status: 'OPEN' }
                });

                if (!activeShift) {
                    throw new Error("OPERACIÓN DENEGADA: No se puede abonar una compra en efectivo sin una caja abierta.");
                }

                await tx.cashMovement.create({
                    data: {
                        type: 'EGRESO',
                        description: `PAGO COMPRA ${docType} N° ${docNumber || 'S/N'} (${supplierName || 'PROVEEDOR'})`,
                        amount: -Math.abs(totalPurchaseCost),
                    }
                });
            }

            let subtotal = 0;
            const processedItems = [];

            for (const item of items) {
                let product;

                if (item.productId) {
                    product = await tx.product.findUnique({ where: { id: item.productId } });
                } else if (item.code) {
                    product = await tx.product.findUnique({ where: { code: item.code.trim() } });
                }

                if (!product) {
                    let catId = item.categoryId;
                    if (!catId) {
                        const defaultCat = await tx.category.findFirst();
                        if (!defaultCat) {
                            throw new Error('No hay categorías creadas en el sistema para dar de alta un producto nuevo.');
                        }
                        catId = defaultCat.id;
                    }

                    const itemMargin = item.margin || 100;
                    const itemCost = Number(item.unitCost);
                    const itemOtherCosts = fletePerUnit;
                    const calculatedPrice = Math.round((itemCost + itemOtherCosts) * (1 + itemMargin / 100));

                    product = await tx.product.create({
                        data: {
                            code: item.code.trim(),
                            name: item.name.trim(),
                            categoryId: catId,
                            supplierId: finalSupplierId,
                            cost: itemCost,
                            otherCosts: itemOtherCosts,
                            margin: itemMargin,
                            price: calculatedPrice,
                            stock: 0,
                            trackStock: true,
                        }
                    });
                }

                const qty = Number(item.quantity);
                const unitCost = Number(item.unitCost);
                const itemSubtotal = qty * unitCost;
                subtotal += itemSubtotal;

                const allocatedOtherCost = fletePerUnit;
                const finalUnitCost = unitCost + allocatedOtherCost;

                const newStock = product.stock + qty;
                const updatedPrice = Math.round((unitCost + allocatedOtherCost) * (1 + product.margin / 100));

                await tx.product.update({
                    where: { id: product.id },
                    data: {
                        cost: unitCost,
                        otherCosts: allocatedOtherCost,
                        price: updatedPrice,
                        stock: newStock,
                        supplierId: finalSupplierId,
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId: product.id,
                        quantity: qty,
                        type: 'PURCHASE',
                        notes: `Ingreso por ${docType} N° ${docNumber || 'S/N'} (${supplierName || 'Proveedor'})`,
                        previousStock: product.stock,
                        newStock: newStock,
                    }
                });

                processedItems.push({
                    productId: product.id,
                    quantity: qty,
                    unitCost: unitCost,
                    allocatedOtherCost: allocatedOtherCost,
                    finalUnitCost: finalUnitCost,
                });
            }

            const totalPurchase = subtotal + Number(otherCostsTotal);

            const purchase = await tx.purchase.create({
                data: {
                    docType,
                    docNumber: docNumber || null,
                    date: date ? new Date(date) : new Date(),
                    supplierId: finalSupplierId!,
                    subtotal,
                    otherCostsTotal: Number(otherCostsTotal),
                    total: totalPurchase,
                    notes: notes || null,
                    items: {
                        create: processedItems
                    }
                }
            });

            return purchase;
        });

        revalidatePath('/productos');
        revalidatePath('/stock');
        revalidatePath('/compras');
        revalidatePath('/caja'); // Refrescar caja para reflejar el egreso si fue al contado

        return { success: true, purchaseId: result.id };
    } catch (error: any) {
        console.error('Error al registrar compra:', error);
        return { error: error.message || 'Error al procesar la carga del comprobante.' };
    }
}

export async function getSuppliersForSelect() {
    try {
        return await prisma.supplier.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return [];
    }
}

export async function getCategoriesForSelect() {
    try {
        return await prisma.category.findMany({
            select: { id: true, name: true, defaultMargin: true },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
}