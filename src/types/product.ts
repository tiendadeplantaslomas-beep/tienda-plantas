// src/types/product.ts

export interface Category {
    id: string;
    name: string;
}

export interface Supplier {
    id: string;
    name: string;
}

export interface Product {
    id: string;
    code: string;
    name: string;
    categoryId: string;
    supplierId: string;
    cost: number;
    margin: number;
    price: number;
    stock: number;
    minStock?: number;
    // Agrega aquí otros campos que use tu modelo (ej. taxRate, description, etc.)
}

export type SortField = 'name' | 'code' | 'price' | 'stock';
export type SortOrder = 'asc' | 'desc';