'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache, revalidateTag } from 'next/cache';
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
    taxRate?: number;
    price?: number;
    stock?: number;
    minStock?: number;
    description?: string;
    imageUrl?: string;
    trackStock?: boolean;
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

export async function deleteCategory(id: string) {
    try {
        const productsCount = await prisma.product.count({ where: { categoryId: id } });
        if (productsCount > 0) {
            return { error: `No se puede eliminar la categoría porque tiene ${productsCount} producto(s) asociado(s).` };
        }

        await prisma.category.delete({ where: { id } });
        revalidateTag('categories');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        return { error: 'No se pudo eliminar la categoría.' };
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
                category: true, // Relación correcta con la categoría
                supplier: true, // Relación correcta con el proveedor
            },
        });

        // Convertimos los campos numéricos si es necesario para asegurar la serialización
        const products = rawProducts.map((p) => ({
            ...p,
            price: Number(p.price),
            cost: Number(p.cost),
            otherCosts: Number(p.otherCosts),
            margin: Number(p.margin),
            taxRate: Number(p.taxRate),
            stock: Number(p.stock),
            minStock: Number(p.minStock),
        }));

        return products;
    } catch (error) {
        console.error("Error detallado en getProducts:", error);
        return [];
    }
}

export async function generateNextProductCode(categoryId: string): Promise<string> {
    try {
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
            select: { name: true },
        });
        const prefix = category ? category.name.substring(0, 3).toUpperCase() : 'PRO';

        // Bucle inteligente para buscar un código libre y evitar colisiones
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

        console.log('--- DEBUG SAVE PRODUCT ---');
        console.log('ID del producto:', data.id);
        console.log('Categoría seleccionada en el formulario:', data.categoryId);

        if (data.id) {
            const existingProduct = await prisma.product.findUnique({
                where: { id: data.id },
                select: { categoryId: true, code: true }
            });

            console.log('Categoría anterior en BD:', existingProduct?.categoryId);

            if (existingProduct) {
                // Si la categoría cambió respecto a la almacenada, FORZAMOS la creación de un nuevo código
                if (existingProduct.categoryId !== data.categoryId) {
                    finalCode = await generateNextProductCode(data.categoryId);
                    console.log('¡Categoría cambiada! Nuevo código generado:', finalCode);
                } else if (!finalCode) {
                    finalCode = existingProduct.code;
                }
            } else if (!finalCode) {
                finalCode = await generateNextProductCode(data.categoryId);
            }
        } else if (!finalCode) {
            finalCode = await generateNextProductCode(data.categoryId);
        }

        // --- GESTIÓN DE IMAGEN CON CLOUDINARY Y CARPETAS POR CATEGORÍA ---
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
        // ----------------------------------------------------------------

        const productData = {
            name,
            code: finalCode,
            categoryId: data.categoryId,
            supplierId: data.supplierId || null,
            description: data.description || null,
            imageUrl: finalImageUrl,
            cost: Math.round(data.cost ?? 0),
            otherCosts: Math.round(data.otherCosts ?? 0),
            margin: Math.round(data.margin ?? 0),
            taxRate: data.taxRate ?? 0,
            price: Math.round(data.price ?? 0),
            stock: Math.round(data.stock ?? 0),
            minStock: Math.round(data.minStock ?? 2),
            trackStock: data.trackStock ?? true,
        };

        if (data.id) {
            await prisma.product.update({
                where: { id: data.id },
                data: productData,
            });
        } else {
            await prisma.product.create({
                data: productData,
            });
        }

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
            const margin = Math.round(parseFloat(raw.Margen || raw.margin) || 30);
            const taxRate = parseFloat(raw.IVA || raw.taxRate) || 0;
            const price = Math.round(parseFloat(raw.PrecioFinal || raw.price) || 0);
            const stock = Math.round(parseInt(raw.Stock || raw.stock) || 0);
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
                    minStock,
                    categoryId: category.id,
                    imageUrl,
                },
                create: {
                    code,
                    name: name.toUpperCase(),
                    categoryId: category.id,
                    cost,
                    otherCosts,
                    margin,
                    taxRate,
                    price,
                    stock,
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