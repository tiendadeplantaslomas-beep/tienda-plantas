'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Leaf } from 'lucide-react';

// Simulación de productos para que veas cómo impacta visualmente según la categoría
const PRODUCTOS_MOCK = [
    { id: 1, nombre: 'Ficus Lyrata', precio: 14500, categoria: 'interior', stock: 8, foto: '🌿' },
    { id: 2, nombre: 'Alocasia Polly', precio: 9800, categoria: 'interior', stock: 5, foto: '🌱' },
    { id: 3, nombre: 'Limonero de las 4 estaciones', precio: 22000, categoria: 'exterior', stock: 3, foto: '🍋' },
    { id: 4, nombre: 'Substrato Premium 25L', precio: 4500, categoria: 'insumos', stock: 40, foto: '🪵' },
];

export default function CategoriaPage() {
    const params = useParams();
    const router = useRouter();

    // El slug es lo que viene en la URL (ej: /categoria/interior)
    const slug = typeof params?.slug === 'string' ? params.slug : '';

    // Formateamos el título para que quede lindo (ej: "interior" -> "Plantas de Interior")
    const titulos: Record<string, string> = {
        interior: 'Plantas de Interior',
        exterior: 'Plantas de Exterior',
        insumos: 'Herramientas e Insumos',
    };

    const nombreCategoria = titulos[slug] || `Categoría: ${slug}`;

    // Filtramos los productos que pertenecen a esta sección
    const productosFiltrados = PRODUCTOS_MOCK.filter(p => p.categoria === slug);

    return (
        <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl x-auto space-y-6">

                {/* Botón Volver */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-emerald-700 transition cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver al Inicio
                </button>

                {/* Cabecera de la Categoría */}
                <div className="border-b border-stone-200 pb-5 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                        <Leaf className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-stone-900">
                        {nombreCategoria}
                    </h1>
                </div>

                {/* Grilla de Productos */}
                {productosFiltrados.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-stone-200 shadow-sm">
                        <p className="text-stone-500">Próximamente cargaremos productos en esta categoría.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                        {productosFiltrados.map((producto) => (
                            <div key={producto.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                                <div className="flex h-48 w-full items-center justify-center rounded-lg bg-stone-100 text-6xl select-none group-hover:opacity-90 transition">
                                    {producto.foto}
                                </div>
                                <div className="mt-4 flex flex-col flex-1 justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-stone-800">{producto.nombre}</h3>
                                        <p className="mt-1 text-xs text-stone-500">Stock disponible: {producto.stock} u.</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-stone-100">
                                        <p className="text-lg font-bold text-stone-900">${producto.precio.toLocaleString('es-AR')}</p>
                                        <button className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition cursor-pointer">
                                            <ShoppingCart className="h-3.5 w-3.5" /> Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}