'use server';

import { prisma } from '@/lib/prisma'; // o la ruta donde tengas tu instancia de Prisma/DB
import { revalidatePath } from 'next/cache';

// ... tus otras funciones (getCategories, createCategory, etc.) ...

export async function deleteCategory(categoryId: string) {
    try {
        // 1. Verificamos si hay productos usando esta categoría para evitar inconsistencias
        const productsCount = await prisma.product.count({
            where: { categoryId }
        });

        if (productsCount > 0) {
            return {
                error: `No se puede eliminar: hay ${productsCount} producto(s) asignado(s) a esta categoría.`
            };
        }

        // 2. Si está libre, la borramos
        await prisma.category.delete({
            where: { id: categoryId }
        });

        revalidatePath('/productos');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        return { error: 'Error interno al intentar eliminar la categoría.' };
    }
}

export interface ImportRowData {
    Nombre?: string;
    Categoria?: string;
    Proveedor?: string;
    CostoBase?: string | number;
    OtrosCostos?: string | number;
    StockInicial?: string | number;
    AlertaStockBajo?: string;
    StockMinimo?: string | number;
    [key: string]: string | number | undefined;
}

export interface ImportErrorLog {
    rowNumber: number;
    productName: string;
    category: string;
    reason: string;
}

const normalizeText = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

export async function getCategories() {
    return await prisma.category.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getSuppliers() {
    return await prisma.supplier.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getProducts() {
    return await prisma.product.findMany({
        include: { category: true, supplier: true },
        orderBy: { name: 'asc' }
    });
}

export async function generateNextProductCode(categoryId: string): Promise<string> {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return 'PROD-0001';

    const prefix = category.name.substring(0, 3).toUpperCase();
    const count = await prisma.product.count({ where: { categoryId } });
    const nextSeq = (count + 1).toString().padStart(4, '0');

    return `${prefix}-${nextSeq}`;
}

export async function createCategory(name: string, defaultMargin: number = 100) {
    try {
        const category = await prisma.category.create({
            data: {
                name: name.trim().toUpperCase(),
                defaultMargin: defaultMargin || 100
            }
        });
        revalidatePath('/productos');
        return { category };
    } catch (error) {
        console.error('Error al crear categoría:', error);
        return { error: 'No se pudo crear la categoría.' };
    }
}

export async function createSupplier(data: { name: string; address?: string; phone?: string; notes?: string }) {
    try {
        const supplier = await prisma.supplier.create({
            data: {
                name: data.name.trim().toUpperCase(),
                address: data.address || null,
                phone: data.phone || null,
                notes: data.notes || null,
            }
        });
        revalidatePath('/productos');
        return { supplier };
    } catch (error) {
        console.error('Error al crear proveedor:', error);
        return { error: 'No se pudo crear el proveedor.' };
    }
}

export async function saveProduct(formData: FormData) {
    try {
        const id = formData.get('id') as string || null;
        const name = (formData.get('name') as string).trim().toUpperCase();
        const categoryId = formData.get('categoryId') as string;
        const supplierId = (formData.get('supplierId') as string) || null;

        const cost = Math.round(parseFloat(formData.get('cost') as string) || 0);
        const otherCosts = Math.round(parseFloat(formData.get('otherCosts') as string) || 0);
        const margin = parseFloat(formData.get('margin') as string) || 100;
        const taxRate = parseFloat(formData.get('taxRate') as string) || 21;

        const trackStock = formData.get('trackStock') === 'true';
        const stock = parseInt(formData.get('stock') as string, 10) || 0;
        const minStock = parseInt(formData.get('minStock') as string, 10) || 0;

        // Calcular precio final
        const totalCost = cost + otherCosts;
        let priceNoTax = 0;
        if (margin >= 100) {
            priceNoTax = totalCost * (1 + margin / 100);
        } else {
            priceNoTax = totalCost / (1 - margin / 100);
        }
        const price = Math.round(priceNoTax * (1 + taxRate / 100));

        let code = formData.get('code') as string;
        if (!id || !code) {
            code = await generateNextProductCode(categoryId);
        }

        const productData = {
            code,
            name,
            categoryId,
            supplierId: supplierId || null,
            cost,
            otherCosts,
            margin,
            taxRate,
            price,
            trackStock,
            stock,
            minStock
        };

        if (id) {
            await prisma.product.update({ where: { id }, data: productData });
        } else {
            await prisma.product.create({ data: productData });
        }

        revalidatePath('/productos');
        return { success: true };
    } catch (error) {
        console.error('Error guardando producto:', error);
        return { error: 'No se pudo guardar el producto.' };
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.delete({ where: { id } });
        revalidatePath('/productos');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return { error: 'No se pudo eliminar el producto.' };
    }
}

export async function seedCategoriesAction() {
    const baseCategories = [
        { name: 'INTERIOR', defaultMargin: 100 },
        { name: 'MACETAS - PLASTICAS', defaultMargin: 60 },
        { name: 'MACETAS - CEMENTO', defaultMargin: 50 },
        { name: 'SUSTRATOS', defaultMargin: 40 },
        { name: 'AGROQUIMICOS - INSECTICIDAS', defaultMargin: 50 },
        { name: 'AGROQUIMICOS - FERTILIZANTES', defaultMargin: 50 },
        { name: 'PLANTIN', defaultMargin: 100 },
        { name: 'ACCESORIOS', defaultMargin: 50 },
        { name: 'DECO', defaultMargin: 50 }
    ];

    try {
        let createdCount = 0;
        for (const cat of baseCategories) {
            const existing = await prisma.category.findFirst({
                where: { name: cat.name }
            });
            if (!existing) {
                await prisma.category.create({ data: cat });
                createdCount++;
            }
        }
        revalidatePath('/productos');
        return { createdCount };
    } catch (error) {
        console.error('Error al poblar categorías:', error);
        return { error: 'Error al inicializar categorías.' };
    }
}

export async function importProductsBatch(rows: ImportRowData[]) {
    const logs: ImportErrorLog[] = [];
    let importedCount = 0;

    try {
        const allCategories = await prisma.category.findMany();
        const allSuppliers = await prisma.supplier.findMany();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // +2 por la cabecera del CSV y el índice 0

            const name = row.Nombre ? String(row.Nombre).trim().toUpperCase() : '';
            const categoryName = row.Categoria ? String(row.Categoria).trim() : '';
            const supplierName = row.Proveedor ? String(row.Proveedor).trim().toUpperCase() : '';

            if (!name) {
                logs.push({
                    rowNumber: rowNum,
                    productName: 'DESCONOCIDO',
                    category: categoryName || 'N/A',
                    reason: 'El nombre del producto es obligatorio.'
                });
                continue;
            }

            // 1. VALIDAR CATEGORÍA (ESTRICMA)
            const category = allCategories.find(c => normalizeText(c.name) === normalizeText(categoryName));
            if (!category) {
                logs.push({
                    rowNumber: rowNum,
                    productName: name,
                    category: categoryName || 'NO ESPECIFICADA',
                    reason: `La categoría "${categoryName}" no existe en el sistema. Debe crearse previamente para armar el código.`
                });
                continue;
            }

            // 2. BUSCAR O CREAR PROVEEDOR (GET OR CREATE)
            let supplierId: string | null = null;
            if (supplierName) {
                let supplier = allSuppliers.find(s => normalizeText(s.name) === normalizeText(supplierName));
                if (!supplier) {
                    supplier = await prisma.supplier.create({
                        data: { name: supplierName }
                    });
                    allSuppliers.push(supplier);
                }
                supplierId = supplier.id;
            }

            // 3. PARSEAR COSTOS Y CALCULAR PRECIO FINAL
            const cost = Math.round(parseFloat(String(row.CostoBase || '0')) || 0);
            const otherCosts = Math.round(parseFloat(String(row.OtrosCostos || '0')) || 0);
            const totalCost = cost + otherCosts;

            const margin = category.defaultMargin || 100;
            const taxRate = 21; // Alicuota por defecto IVA 21%

            let priceNoTax = 0;
            if (margin >= 100) {
                priceNoTax = totalCost * (1 + margin / 100);
            } else {
                priceNoTax = totalCost / (1 - margin / 100);
            }
            const price = Math.round(priceNoTax * (1 + taxRate / 100));

            // 4. GENERAR CÓDIGO Y STOCK
            const code = await generateNextProductCode(category.id);

            const trackStockStr = String(row.AlertaStockBajo || 'SI').trim().toUpperCase();
            const trackStock = trackStockStr === 'SI' || trackStockStr === 'TRUE' || trackStockStr === '1';
            const stock = parseInt(String(row.StockInicial || '0'), 10) || 0;
            const minStock = parseInt(String(row.StockMinimo || '2'), 10) || 2;

            // 5. GUARDAR PRODUCTO
            await prisma.product.create({
                data: {
                    code,
                    name,
                    categoryId: category.id,
                    supplierId,
                    cost,
                    otherCosts,
                    margin,
                    taxRate,
                    price,
                    trackStock,
                    stock,
                    minStock
                }
            });

            importedCount++;
        }

        revalidatePath('/productos');
        return { success: true, importedCount, logs };
    } catch (error) {
        console.error('Error en importación masiva:', error);
        return { success: false, importedCount: 0, logs };
    }
}