'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

// ----------------------------------------------------------------------
// CONFIGURACIÓN DE CLOUDINARY
// ----------------------------------------------------------------------

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ----------------------------------------------------------------------
// INTERFACES / TIPOS
// ----------------------------------------------------------------------

export interface SaveProductInput {
    id?: string;
    code?: string;
    name: string;
    categoryId: string;
    supplierId?: string | null;
    cost?: number;
    otherCosts?: number;
    margin?: number;
    customMargin?: boolean;
    taxRate?: number;
    price?: number;
    stock?: number;
    minStock?: number;
    description?: string;
    imageUrl?: string;
    trackStock?: boolean;
    destacado?: boolean;
    color?: string | null;
    tamano?: string | null;
    stockWeb?: number;
}

export interface ProductSupplierBreakdown {
    supplierId: string;
    supplierName: string;
    unitCost: number;
    allocatedOtherCost: number;
    finalUnitCost: number;
    salePrice: number;
    lastQuantity: number;
    totalPurchasedQuantity: number;
    lastPurchaseDate: string | null;
}

// ----------------------------------------------------------------------
// HELPER DEDICADO: DESGLOSE POR DISTRIBUIDOR (PUNTO ÚNICO DE AJUSTE)
// ----------------------------------------------------------------------

function buildSuppliersBreakdown(rawProduct: any): {
    suppliersBreakdown: ProductSupplierBreakdown[];
    hasMultipleSuppliers: boolean;
} {
    const salePrice = Number(rawProduct.price) || 0;
    const bySupplier = new Map<string, ProductSupplierBreakdown>();
    const totalQtyBySupplier = new Map<string, number>();

    const purchaseItems = Array.isArray(rawProduct.purchaseItems) ? rawProduct.purchaseItems : [];

    // Primero acumulamos el total de unidades compradas por distribuidor
    for (const item of purchaseItems) {
        const supId = item?.purchase?.supplierId;
        if (!supId) continue;
        const qty = Number(item.quantity) || 0;
        totalQtyBySupplier.set(supId, (totalQtyBySupplier.get(supId) || 0) + qty);
    }

    // Ordenamos por fecha de compra descendente para tomar la referencia más reciente de cada distribuidor
    const sortedItems = [...purchaseItems].sort((a, b) => {
        const dateA = a?.purchase?.date ? new Date(a.purchase.date).getTime() : 0;
        const dateB = b?.purchase?.date ? new Date(b.purchase.date).getTime() : 0;
        return dateB - dateA;
    });

    for (const item of sortedItems) {
        const supId = item?.purchase?.supplierId;
        const supName = item?.purchase?.supplier?.name || 'DISTRIBUIDOR S/N';
        if (!supId) continue;

        if (!bySupplier.has(supId)) {
            const unitCost = Number(item.unitCost) || 0;
            const allocatedOtherCost = Number(item.allocatedOtherCost) || 0;
            const finalUnitCost = Number(item.finalUnitCost) > 0
                ? Number(item.finalUnitCost)
                : unitCost + allocatedOtherCost;

            bySupplier.set(supId, {
                supplierId: supId,
                supplierName: supName,
                unitCost,
                allocatedOtherCost,
                finalUnitCost,
                salePrice,
                lastQuantity: Number(item.quantity) || 0,
                totalPurchasedQuantity: totalQtyBySupplier.get(supId) || 0,
                lastPurchaseDate: item?.purchase?.date
                    ? new Date(item.purchase.date).toISOString().split('T')[0]
                    : null,
            });
        }
    }

    if (rawProduct.supplierId && !bySupplier.has(rawProduct.supplierId)) {
        const unitCost = Number(rawProduct.cost) || 0;
        const allocatedOtherCost = Number(rawProduct.otherCosts) || 0;
        bySupplier.set(rawProduct.supplierId, {
            supplierId: rawProduct.supplierId,
            supplierName: rawProduct.supplier?.name || 'PROVEEDOR ASIGNADO',
            unitCost,
            allocatedOtherCost,
            finalUnitCost: unitCost + allocatedOtherCost,
            salePrice,
            lastQuantity: 0,
            totalPurchasedQuantity: 0,
            lastPurchaseDate: null,
        });
    }

    if (bySupplier.size === 0) {
        const unitCost = Number(rawProduct.cost) || 0;
        const allocatedOtherCost = Number(rawProduct.otherCosts) || 0;
        bySupplier.set('SIN_PROVEEDOR', {
            supplierId: 'SIN_PROVEEDOR',
            supplierName: 'CARGA MANUAL / GENERAL',
            unitCost,
            allocatedOtherCost,
            finalUnitCost: unitCost + allocatedOtherCost,
            salePrice,
            lastQuantity: Number(rawProduct.stock) || 0,
            totalPurchasedQuantity: Number(rawProduct.stock) || 0,
            lastPurchaseDate: null,
        });
    }

    const suppliersBreakdown = Array.from(bySupplier.values());
    const distinctRealSuppliers = suppliersBreakdown.filter(s => s.supplierId !== 'SIN_PROVEEDOR');

    return {
        suppliersBreakdown,
        hasMultipleSuppliers: distinctRealSuppliers.length > 1,
    };
}

// ----------------------------------------------------------------------
// CATEGORÍAS
// ----------------------------------------------------------------------

export const getCategories = unstable_cache(
    async () => {
        return await prisma.category.findMany({
            orderBy: { name: 'asc' },
        });
    },
    ['categories-list'],
    { revalidate: 3600, tags: ['categories'] }
);

export async function createCategory(data: { name: string; defaultMargin: number }) {
    try {
        const cleanName = data.name.trim().toUpperCase();
        if (!cleanName) return { error: 'El nombre de la categoría es obligatorio.' };

        const existing = await prisma.category.findFirst({
            where: { name: cleanName },
        });
        if (existing) {
            return { error: 'Ya existe una categoría con ese nombre.' };
        }

        const category = await prisma.category.create({
            data: {
                name: cleanName,
                defaultMargin: data.defaultMargin ?? 30,
            },
        });

        revalidateTag('categories');
        return { success: true, category };
    } catch (error) {
        console.error('Error en createCategory:', error);
        return { error: 'Error al crear la categoría.' };
    }
}

export async function updateCategory(data: { id: string; name: string; defaultMargin: number }) {
    try {
        const cleanName = data.name.trim().toUpperCase();
        if (!cleanName) return { error: 'El nombre de la categoría es obligatorio.' };

        const existing = await prisma.category.findFirst({
            where: { name: cleanName, NOT: { id: data.id } },
        });
        if (existing) {
            return { error: 'Ya existe otra categoría con ese nombre.' };
        }

        const newMargin = Number(data.defaultMargin ?? 30);

        const category = await prisma.category.update({
            where: { id: data.id },
            data: {
                name: cleanName,
                defaultMargin: newMargin,
            },
        });

        const productosAfectados = await prisma.product.findMany({
            where: {
                categoryId: data.id,
                customMargin: false
            }
        });

        for (const prod of productosAfectados) {
            const baseCost = Number(prod.cost) + Number(prod.otherCosts);
            const subtotalNoTax = newMargin >= 100 ? baseCost * (1 + newMargin / 100) : baseCost / (1 - (newMargin / 100));
            const finalWithTax = subtotalNoTax * (1 + Number(prod.taxRate) / 100);
            const newPrice = Math.round(finalWithTax);

            await prisma.product.update({
                where: { id: prod.id },
                data: {
                    margin: newMargin,
                    price: newPrice
                }
            });
        }

        revalidateTag('categories');
        revalidatePath('/productos');
        revalidatePath('/tienda');

        return { success: true, category };
    } catch (error) {
        console.error('Error en updateCategory:', error);
        return { error: 'Error al actualizar la categoría y sus productos.' };
    }
}

// ----------------------------------------------------------------------
// PROVEEDORES
// ----------------------------------------------------------------------

export const getSuppliers = unstable_cache(
    async () => {
        return await prisma.supplier.findMany({
            orderBy: { name: 'asc' },
        });
    },
    ['suppliers-list'],
    { revalidate: 3600, tags: ['suppliers'] }
);

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

        revalidateTag('suppliers');
        return { success: true, supplier };
    } catch (error) {
        console.error('Error en createSupplier:', error);
        return { error: 'Error al crear el proveedor.' };
    }
}

export async function deleteSupplier(id: string) {
    try {
        const productsCount = await prisma.product.count({ where: { supplierId: id } });
        if (productsCount > 0) {
            return { error: `No se puede eliminar el proveedor porque tiene ${productsCount} producto(s) asociado(s).` };
        }

        await prisma.supplier.delete({ where: { id } });
        revalidateTag('suppliers');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        return { error: 'No se pudo eliminar el proveedor.' };
    }
}

// ----------------------------------------------------------------------
// PRODUCTOS
// ----------------------------------------------------------------------

export async function getProducts() {
    try {
        const rawProducts = await prisma.product.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                category: true,
                supplier: true,
                purchaseItems: {
                    select: {
                        quantity: true,
                        unitCost: true,
                        allocatedOtherCost: true,
                        finalUnitCost: true,
                        purchase: {
                            select: {
                                date: true,
                                supplierId: true,
                                supplier: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            },
        });

        const products = rawProducts.map((p) => {
            const { suppliersBreakdown, hasMultipleSuppliers } = buildSuppliersBreakdown(p);
            const { purchaseItems, ...rest } = p;

            return {
                ...rest,
                price: Number(p.price),
                cost: Number(p.cost),
                otherCosts: Number(p.otherCosts),
                margin: Number(p.margin),
                taxRate: Number(p.taxRate),
                stock: Number(p.stock),
                minStock: Number(p.minStock),
                stockWeb: Number(p.stockWeb),
                suppliersBreakdown,
                hasMultipleSuppliers,
            };
        });

        return products;
    } catch (error) {
        console.error("Error detallado en getProducts:", error);
        return [];
    }
}

export async function getSuggestedProductPrice(productId: string) {
    try {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                cost: true,
                otherCosts: true,
                margin: true,
                taxRate: true,
                price: true,
            }
        });

        if (!product) {
            return { suggestedPrice: 0, maxUnitCostWithExpenses: 0, sourceLabel: 'Sin datos' };
        }

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentPurchaseItems = await prisma.purchaseItem.findMany({
            where: {
                productId,
                purchase: {
                    date: { gte: threeMonthsAgo }
                }
            },
            select: {
                unitCost: true,
                allocatedOtherCost: true,
                finalUnitCost: true,
            }
        });

        let maxUnitCostWithExpenses = 0;
        let sourceLabel = 'Últimos 3 meses (sin compras recientes)';

        if (recentPurchaseItems.length > 0) {
            maxUnitCostWithExpenses = recentPurchaseItems.reduce((maxVal, item) => {
                const candidate = Number(item.finalUnitCost) > 0
                    ? Number(item.finalUnitCost)
                    : (Number(item.unitCost) + Number(item.allocatedOtherCost));
                return candidate > maxVal ? candidate : maxVal;
            }, 0);
            sourceLabel = 'Máx. compra 3 meses c/ gastos';
        } else {
            maxUnitCostWithExpenses = Number(product.cost) + Number(product.otherCosts);
        }

        const marginVal = Number(product.margin ?? 100);
        const taxVal = Number(product.taxRate ?? 21);

        let suggestedPrice = 0;
        if (maxUnitCostWithExpenses > 0) {
            const subtotalNoTax = marginVal >= 100
                ? maxUnitCostWithExpenses * (1 + marginVal / 100)
                : maxUnitCostWithExpenses / (1 - (marginVal / 100));
            suggestedPrice = Math.round(subtotalNoTax * (1 + taxVal / 100));
        } else {
            suggestedPrice = Number(product.price) || 0;
        }

        return {
            suggestedPrice,
            maxUnitCostWithExpenses: Math.round(maxUnitCostWithExpenses),
            sourceLabel
        };
    } catch (error) {
        console.error('Error en getSuggestedProductPrice:', error);
        return { suggestedPrice: 0, maxUnitCostWithExpenses: 0, sourceLabel: 'Error al consultar' };
    }
}

export async function generateNextProductCode(categoryId: string): Promise<string> {
    try {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            select: { name: true },
        });
        const prefix = category ? category.name.substring(0, 3).toUpperCase() : 'PRO';

        let counter = 1;
        let candidateCode = '';
        let exists = true;

        while (exists) {
            candidateCode = `${prefix}${counter.toString().padStart(3, '0')}`;
            const found = await prisma.product.findUnique({
                where: { code: candidateCode }
            });
            if (!found) {
                exists = false;
            } else {
                counter++;
            }
        }

        return candidateCode;
    } catch (error) {
        console.error('Error generando código:', error);
        return `PROD${Date.now().toString().slice(-3)}`;
    }
}

export async function saveProduct(data: SaveProductInput) {
    try {
        const name = data.name?.trim().toUpperCase();
        if (!name || !data.categoryId) {
            return { error: 'Nombre y categoría son campos obligatorios.' };
        }

        let finalCode = data.code?.trim().toUpperCase();

        if (data.id) {
            const existingProduct = await prisma.product.findUnique({
                where: { id: data.id },
                select: { categoryId: true, code: true }
            });

            if (existingProduct) {
                if (existingProduct.categoryId !== data.categoryId) {
                    finalCode = await generateNextProductCode(data.categoryId);
                } else if (!finalCode) {
                    finalCode = existingProduct.code;
                }
            } else if (!finalCode) {
                finalCode = await generateNextProductCode(data.categoryId);
            }
        } else if (!finalCode) {
            finalCode = await generateNextProductCode(data.categoryId);
        }

        let finalImageUrl = data.imageUrl || null;

        if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
            try {
                let folderName = 'tienda-plantas/general';
                const category = await prisma.category.findUnique({
                    where: { id: data.categoryId },
                    select: { name: true }
                });

                if (category) {
                    const cleanCategoryName = category.name
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/g, '-');
                    folderName = `tienda-plantas/${cleanCategoryName}`;
                }

                const uploadResponse = await cloudinary.uploader.upload(finalImageUrl, {
                    folder: folderName,
                });
                finalImageUrl = uploadResponse.secure_url;
            } catch (cloudinaryError) {
                console.error('Error al subir imagen a Cloudinary:', cloudinaryError);
                return { error: 'No se pudo subir la imagen a la nube. Intenta nuevamente.' };
            }
        }

        const productData = {
            name,
            code: finalCode,
            category: {
                connect: { id: data.categoryId }
            },
            ...(data.supplierId ? {
                supplier: {
                    connect: { id: data.supplierId }
                }
            } : {}),
            cost: Number(data.cost) || 0,
            otherCosts: Number(data.otherCosts) || 0,
            margin: Number(data.margin) || 0,
            customMargin: Boolean(data.customMargin),
            taxRate: Number(data.taxRate) || 0,
            price: Number(data.price) || 0,
            stock: Number(data.stock) || 0,
            minStock: Number(data.minStock) || 0,
            destacado: Boolean(data.destacado),
            color: data.color ? data.color.trim().toUpperCase() : null,
            tamano: data.tamano ? data.tamano.trim().toUpperCase() : null,
            stockWeb: data.stockWeb !== undefined ? Number(data.stockWeb) : Number(data.stock) || 0,
            imageUrl: finalImageUrl || '/sinfoto.png'
        };

        if (data.id) {
            await prisma.product.update({
                where: { id: data.id },
                data: {
                    ...productData,
                    supplier: data.supplierId ? { connect: { id: data.supplierId } } : { disconnect: true }
                }
            });
        } else {
            await prisma.product.create({
                data: productData
            });
        }

        revalidatePath('/');
        revalidatePath('/tienda');
        revalidatePath('/productos');

        return { success: true };
    } catch (error: any) {
        console.error('Error detallado al guardar producto:', error);

        if (error.code === 'P2002') {
            return { error: 'Ya existe un producto registrado con ese código. Por favor, utilizá un código diferente.' };
        }

        return { error: 'Error al procesar la solicitud del producto.' };
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return { error: 'No se pudo eliminar el producto.' };
    }
}

export async function importProductsBatch(productsData: any[]) {
    try {
        let count = 0;
        for (const raw of productsData) {
            const name = raw.Nombre || raw.name;
            if (!name) continue;

            const categoryName = (raw.Categoria || raw.category || 'GENERAL').toUpperCase();
            let category = await prisma.category.findFirst({ where: { name: categoryName } });
            if (!category) {
                category = await prisma.category.create({
                    data: { name: categoryName, defaultMargin: 30 },
                });
            }

            const cost = Math.round(parseFloat(raw.CostoBase || raw.cost) || 0);
            const otherCosts = Math.round(parseFloat(raw.FleteOtros || raw.otherCosts) || 0);
            const margin = parseFloat(raw.Margen || raw.margin) || 100;
            const taxRate = parseFloat(raw.IVA || raw.taxRate) || 21;
            const price = Math.round(parseFloat(raw.PrecioFinal || raw.price) || 0);
            const stock = Math.round(parseInt(raw.Stock || raw.stock) || 0);
            const stockWeb = Math.round(parseInt(raw.StockWeb || raw.stockWeb || stock) || 0);
            const minStock = Math.round(parseInt(raw.StockMinimo || raw.minStock) || 2);
            const code = raw.Codigo || raw.code || (await generateNextProductCode(category.id));

            const imageUrl = raw.Imagen || raw.imageUrl || raw.Image || "https://res.cloudinary.com/mfzvsfah/image/upload/v1787528074/sinfoto.jpg";

            await prisma.product.upsert({
                where: { code },
                update: {
                    name: name.toUpperCase(),
                    cost,
                    otherCosts,
                    margin,
                    taxRate,
                    price,
                    stock,
                    stockWeb,
                    minStock,
                    category: { connect: { id: category.id } },
                    imageUrl,
                },
                create: {
                    code,
                    name: name.toUpperCase(),
                    category: { connect: { id: category.id } },
                    cost,
                    otherCosts,
                    margin,
                    taxRate,
                    price,
                    stock,
                    stockWeb,
                    minStock,
                    imageUrl,
                },
            });
            count++;
        }

        revalidateTag('categories');
        return { success: true, count };
    } catch (error) {
        console.error('Error en importación batch:', error);
        return { error: 'Error al importar los productos.' };
    }
}

export async function adjustStock(
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT' = 'IN'
) {
    try {
        const currentProduct = await prisma.product.findUnique({
            where: { id: productId },
            select: { stock: true },
        });
        if (!currentProduct) {
            return { error: 'El producto seleccionado no existe.' };
        }

        let newStock = currentProduct.stock;
        const roundedQty = Math.round(quantity);
        if (type === 'IN') {
            if (roundedQty <= 0) return { error: 'La cantidad a ingresar debe ser mayor a cero.' };
            newStock += roundedQty;
        } else if (type === 'OUT') {
            if (roundedQty <= 0) return { error: 'La cantidad a retirar debe ser mayor a cero.' };
            if (currentProduct.stock - roundedQty < 0) {
                return { error: `Stock insuficiente. Stock actual: ${currentProduct.stock} unidades.` };
            }
            newStock -= roundedQty;
        } else if (type === 'ADJUSTMENT') {
            if (roundedQty < 0) return { error: 'El stock final no puede ser un número negativo.' };
            newStock = roundedQty;
        }

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { stock: newStock },
        });
        return { success: true, product: updatedProduct };
    } catch (error) {
        console.error('Error al actualizar el stock:', error);
        return { error: 'No se pudo actualizar el stock del producto en la base de datos.' };
    }
}