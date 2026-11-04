'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { generateNextProductCode } from './product-actions';

export interface SinglePurchaseItemInput {
    productId?: string;
    code: string;
    name: string;
    categoryId: string;
    quantity: number;
    unitCost: number;
    margin?: number;
    tamano?: string;
    color?: string;
}

export interface SingleInvoiceInput {
    supplierId?: string;
    supplierName?: string;
    docType: 'FACTURA' | 'REMITO' | 'PRESUPUESTO';
    docNumber?: string;
    date?: string;
    notes?: string;
    items: SinglePurchaseItemInput[];
}

export interface CreateBatchPurchasePayload {
    freightCostTotal: number;
    notes?: string;
    invoices: SingleInvoiceInput[];
}

export async function createQuickProduct(data: {
    name: string;
    categoryId: string;
    cost: number;
    tamano?: string;
    color?: string;
}) {
    try {
        const cleanName = data.name.trim().toUpperCase();
        if (!cleanName || !data.categoryId) {
            return { error: 'El nombre y la categoría son obligatorios.' };
        }

        const category = await prisma.category.findUnique({
            where: { id: data.categoryId }
        });

        if (!category) {
            return { error: 'La categoría seleccionada no existe.' };
        }

        const margin = category.defaultMargin || 100;
        const code = await generateNextProductCode(data.categoryId);
        const cost = Number(data.cost) || 0;
        const price = Math.round(cost * (1 + margin / 100));

        const newProduct = await prisma.product.create({
            data: {
                code,
                name: cleanName,
                categoryId: data.categoryId,
                cost,
                otherCosts: 0,
                margin,
                price,
                stock: 0,
                trackStock: true,
                tamano: data.tamano ? data.tamano.trim().toUpperCase() : null,
                color: data.color ? data.color.trim().toUpperCase() : null,
                imageUrl: 'https://res.cloudinary.com/mfzvsfah/image/upload/v1787528074/sinfoto.jpg'
            }
        });

        revalidatePath('/productos');
        revalidatePath('/compras');

        return {
            success: true,
            product: {
                id: newProduct.id,
                code: newProduct.code,
                name: newProduct.name,
                cost: Number(newProduct.cost),
                price: Number(newProduct.price),
                stock: Number(newProduct.stock),
                margin: Number(newProduct.margin),
                categoryId: newProduct.categoryId
            }
        };
    } catch (error: any) {
        console.error('Error al crear producto al vuelo:', error);
        return { error: error.message || 'Error al dar de alta el producto.' };
    }
}

export async function createSupplier(data: { name: string; phone?: string; address?: string; notes?: string }) {
    try {
        const cleanName = data.name.trim().toUpperCase();
        if (!cleanName) return { error: 'El nombre del proveedor es obligatorio.' };

        const existing = await prisma.supplier.findFirst({
            where: { name: cleanName },
        });
        if (existing) {
            return { error: 'Ya existe un proveedor con ese nombre.' };
        }

        const supplier = await prisma.supplier.create({
            data: {
                name: cleanName,
                phone: data.phone || null,
                address: data.address || null,
                notes: data.notes || null,
            },
        });

        revalidatePath('/compras');
        return { success: true, supplier };
    } catch (error) {
        console.error('Error en createSupplier:', error);
        return { error: 'Error al crear el proveedor.' };
    }
}

export async function createPurchaseBatch(payload: CreateBatchPurchasePayload) {
    try {
        const { freightCostTotal, notes, invoices } = payload;

        if (!invoices || invoices.length === 0) {
            return { error: 'Debe incluir al menos un comprobante en el lote.' };
        }

        let totalBatchUnits = 0;
        invoices.forEach(inv => {
            inv.items.forEach(item => {
                totalBatchUnits += Number(item.quantity) || 0;
            });
        });

        if (totalBatchUnits <= 0) {
            return { error: 'El lote no contiene cantidades válidas de productos.' };
        }

        const freightPerUnit = Math.round((Number(freightCostTotal) || 0) / totalBatchUnits);

        const result = await prisma.$transaction(
            async (tx) => {
                const batch = await tx.purchaseBatch.create({
                    data: {
                        freightCostTotal: Number(freightCostTotal) || 0,
                        notes: notes || 'SALIDA DE COMPRAS MULTI-PROVEEDOR',
                        status: 'PENDIENTE'
                    }
                });

                for (const inv of invoices) {
                    let finalSupplierId = inv.supplierId;

                    if (!finalSupplierId && inv.supplierName) {
                        const existingSup = await tx.supplier.findFirst({
                            where: { name: inv.supplierName.trim().toUpperCase() }
                        });
                        if (existingSup) {
                            finalSupplierId = existingSup.id;
                        } else {
                            const newSup = await tx.supplier.create({
                                data: { name: inv.supplierName.trim().toUpperCase() }
                            });
                            finalSupplierId = newSup.id;
                        }
                    }

                    if (!finalSupplierId) {
                        throw new Error(`Proveedor no válido para el comprobante ${inv.docNumber || 'S/N'}.`);
                    }

                    let invSubtotal = 0;
                    let invFreightTotal = 0;
                    const processedItems = [];

                    for (const item of inv.items) {
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        if (!product) {
                            throw new Error(`El producto con ID ${item.productId} no existe en la base de datos.`);
                        }

                        const qty = Number(item.quantity);
                        const unitCost = Number(item.unitCost);
                        const itemSubtotal = qty * unitCost;
                        invSubtotal += itemSubtotal;

                        const allocatedOtherCost = freightPerUnit;
                        const itemFreightTotal = allocatedOtherCost * qty;
                        invFreightTotal += itemFreightTotal;

                        const finalUnitCost = unitCost + allocatedOtherCost;
                        const updatedPrice = Math.round(finalUnitCost * (1 + (product.margin || 100) / 100));

                        await tx.product.update({
                            where: { id: product.id },
                            data: {
                                cost: unitCost,
                                otherCosts: allocatedOtherCost,
                                price: updatedPrice,
                                supplierId: finalSupplierId
                            }
                        });

                        processedItems.push({
                            productId: product.id,
                            quantity: qty,
                            unitCost: unitCost,
                            allocatedOtherCost: allocatedOtherCost,
                            finalUnitCost: finalUnitCost
                        });
                    }

                    const invTotal = invSubtotal + invFreightTotal;

                    await tx.purchase.create({
                        data: {
                            batchId: batch.id,
                            docType: inv.docType,
                            docNumber: inv.docNumber || null,
                            date: inv.date ? new Date(inv.date) : new Date(),
                            supplierId: finalSupplierId,
                            subtotal: invSubtotal,
                            otherCostsTotal: invFreightTotal,
                            total: invTotal,
                            notes: inv.notes || null,
                            items: {
                                create: processedItems
                            }
                        }
                    });
                }

                return batch;
            },
            { maxWait: 10000, timeout: 30000 }
        );

        revalidatePath('/productos');
        revalidatePath('/compras');
        revalidatePath('/stock');

        return { success: true, batchId: result.id };
    } catch (error: any) {
        console.error('Error al registrar lote de compras:', error);
        return { error: error.message || 'Error al procesar la salida de compras.' };
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

export async function getPurchasesHistory(filters?: { startDate?: string; endDate?: string; supplierId?: string }) {
    try {
        const where: any = {};
        if (filters?.startDate && filters?.endDate) {
            where.date = {
                gte: new Date(filters.startDate),
                lte: new Date(filters.endDate + 'T23:59:59.999Z')
            };
        }
        if (filters?.supplierId) {
            where.supplierId = filters.supplierId;
        }

        return await prisma.purchase.findMany({
            where,
            include: {
                supplier: { select: { name: true } },
                batch: { select: { status: true } },
                items: {
                    include: {
                        product: { select: { code: true, name: true } }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        return [];
    }
}

export async function receivePurchaseBatch(purchaseId: string) {
    try {
        const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: {
                batch: true,
                items: true
            }
        });

        if (!purchase) {
            return { error: 'No se encontró el comprobante de compra.' };
        }

        if (purchase.batch?.status === 'RECIBIDO') {
            return { error: 'Este lote/comprobante ya fue recibido previamente.' };
        }

        await prisma.$transaction(async (tx) => {
            if (purchase.batchId) {
                await tx.purchaseBatch.update({
                    where: { id: purchase.batchId },
                    data: { status: 'RECIBIDO' }
                });
            }

            for (const item of purchase.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            increment: item.quantity
                        }
                    }
                });
            }
        });

        revalidatePath('/compras/historial');
        revalidatePath('/productos');
        revalidatePath('/stock');

        return { success: true };
    } catch (error: any) {
        console.error('Error al recibir la compra:', error);
        return { error: error.message || 'Error al procesar la recepción de mercadería.' };
    }
}