'use client';

import React, { useState, useEffect } from 'react';
import { ModuloCatalogo } from './_components/ModuloCatalogo';
import ModuloClientes from './_components/ModuloClientes';
import VentasPage from './_components/ventas';
import { getProducts, getCategories } from '@/actions/product-actions';

interface Category {
    id: string;
    name: string;
    defaultMargin: number;
}

interface Product {
    id: string;
    code: string;
    name: string;
    categoryId: string;
    category?: Category;
    supplierId?: string | null;
    supplier?: any;
    cost: number;
    otherCosts: number;
    price: number;
    margin: number;
    taxRate: number;
    stock: number;
    minStock: number;
}

export default function ViveroPage() {
    const [fechaActual, setFechaActual] = useState('');
    const [tabActiva, setTabActiva] = useState('pos');

    const [productos, setProductos] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tabGuardada = localStorage.getItem('vivero_tab_activa');
        if (tabGuardada) {
            setTabActiva(tabGuardada);
        }

        const hoy = new Date();
        const fechaStr = hoy.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        setFechaActual(fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1));

        async function fetchData() {
            try {
                const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
                setProductos(prods as Product[]);
                setCategories(cats as Category[]);
            } catch (error) {
                console.error("Error al cargar datos del vivero", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const cambiarTab = (nuevaTab: string) => {
        setTabActiva(nuevaTab);
        localStorage.setItem('vivero_tab_activa', nuevaTab);
    };

    const valorTotalStock = productos.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);
    const alertasCount = productos.filter(p => (p.stock || 0) <= (p.minStock || 2)).length;

    const resumenVivero = {
        itemsRegistrados: productos.length,
        valorNetoStock: `$${Math.round(valorTotalStock).toLocaleString('es-AR')}`,
        alertasReposicion: alertasCount
    };

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col font-sans text-slate-800 pb-4">

            {/* ENCABEZADO ULTRA COMPACTO */}
            <div className="flex justify-between items-center bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs mb-2 shrink-0 gap-2">

                {/* 1. Título y fecha */}
                <div className="min-w-max pl-1">
                    <h1 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1">
                        <span>🌿</span> Vivero — Mostrador y Ventas
                    </h1>
                    <p className="text-[9px] text-slate-500 font-medium">{fechaActual}</p>
                </div>

                {/* 2. Solapas de navegación */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                    <button
                        onClick={() => cambiarTab('pos')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${tabActiva === 'pos'
                            ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                    >
                        <span>🛒</span> Caja Diaria / Vta
                    </button>

                    <button
                        onClick={() => cambiarTab('catalogo')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${tabActiva === 'catalogo'
                            ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                    >
                        <span>📖</span> Catálogo ({resumenVivero.itemsRegistrados})
                    </button>

                    <button
                        onClick={() => cambiarTab('clientes')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${tabActiva === 'clientes'
                            ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                    >
                        <span>👥</span> Clientes
                    </button>
                </div>

                {/* 3. Métricas compactas con tooltips */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0 text-xs">
                    <div
                        title="Especies en Stock"
                        className="px-2 py-0.5 bg-white rounded border border-slate-200/60 font-bold text-slate-700 flex items-center gap-1 cursor-help"
                    >
                        <span>📦</span> <span>{resumenVivero.itemsRegistrados}</span>
                    </div>

                    <div
                        title="Valor Estimado Inventario"
                        className="px-2 py-0.5 bg-white rounded border border-slate-200/60 font-bold text-emerald-700 flex items-center gap-1 cursor-help"
                    >
                        <span>💵</span> <span>{resumenVivero.valorNetoStock}</span>
                    </div>

                    <div
                        title="Stock Crítico / Alertas"
                        className="px-2 py-0.5 bg-white rounded border border-slate-200/60 font-bold text-amber-600 flex items-center gap-1 cursor-help"
                    >
                        <span>⚠️</span> <span>{resumenVivero.alertasReposicion}</span>
                    </div>
                </div>

            </div>

            {/* CONTENIDO EXPANDIDO AL 100% PARA FORZAR ALTURA HASTA EL FOOTER Y FIJAR PAGINACIÓN */}
            <div className="w-full flex-1 flex flex-col min-h-[65vh]">
                {tabActiva === 'pos' && <VentasPage />}
                {tabActiva === 'catalogo' && (
                    loading ? (
                        <div className="text-center py-20 text-xs text-slate-500 font-semibold">Cargando catálogo general...</div>
                    ) : (
                        <ModuloCatalogo productos={productos} />
                    )
                )}
                {tabActiva === 'clientes' && <ModuloClientes />}
            </div>

        </div>
    );
}