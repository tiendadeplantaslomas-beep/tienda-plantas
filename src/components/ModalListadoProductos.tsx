// src/components/ModalListadoProductos.tsx
'use client';

import React, { useState } from 'react';
import { X, Search, AlertTriangle, Edit, Trash2 } from 'lucide-react';

interface ModalListadoProps {
    isOpen: boolean;
    onClose: () => void;
    products: any[];
    loading: boolean;
    onEdit: (prod: any) => void;
    onDelete: (id: string, name: string) => void;
    onQuickStock: (prod: any) => void;
}

export default function ModalListadoProductos({
    isOpen,
    onClose,
    products,
    loading,
    onEdit,
    onDelete,
    onQuickStock
}: ModalListadoProps) {
    const [tab, setTab] = useState<'catalogo' | 'alertas'>('catalogo');
    const [query, setQuery] = useState('');

    if (!isOpen) return null;

    const totalAlertas = products.filter(p => p.stock <= p.minStock).length;

    const filtered = products.filter(p => {
        const matchTab = tab === 'catalogo' || (tab === 'alertas' && p.stock <= p.minStock);
        if (!matchTab) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.category?.name || '').toLowerCase().includes(q);
    });

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="p-4 bg-stone-100 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">📋 Catálogo General de Productos & Inventario</h3>
                        <p className="text-[10px] text-slate-500">Buscá, auditá stock o cargá un producto al formulario principal.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filtros y solapas */}
                <div className="p-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setTab('catalogo')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${tab === 'catalogo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
                        >
                            📋 Catálogo ({products.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('alertas')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${tab === 'alertas' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'}`}
                        >
                            ⚠️ Bajo Stock ({totalAlertas})
                        </button>
                    </div>

                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                            type="text"
                            placeholder="Buscar código, nombre o categoría..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 pl-8 text-[11px] text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* Tabla de productos con scroll */}
                <div className="overflow-y-auto p-3 flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-extrabold text-slate-600 uppercase tracking-wider">
                                <th className="py-2 px-2 text-center">Img</th>
                                <th className="py-2 px-2">Código</th>
                                <th className="py-2 px-2">Producto</th>
                                <th className="py-2 px-2">Categoría</th>
                                <th className="py-2 px-2 text-right">Precio Final</th>
                                <th className="py-2 px-2 text-center">Stock</th>
                                <th className="py-2 px-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">Cargando inventario...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">No se encontraron productos.</td>
                                </tr>
                            ) : (
                                filtered.map(prod => {
                                    const isLow = prod.stock <= prod.minStock;
                                    return (
                                        <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-1.5 px-2 text-center">
                                                <div className="w-7 h-7 mx-auto rounded overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                    <img src={prod.imageUrl?.trim() || '/sinfoto.png'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-2 font-mono font-bold text-slate-600">{prod.code}</td>
                                            <td className="py-1.5 px-2 font-bold text-slate-800 uppercase">{prod.name}</td>
                                            <td className="py-1.5 px-2 text-slate-600 uppercase text-[10px]">{prod.category?.name || '-'}</td>
                                            <td className="py-1.5 px-2 text-right font-black text-emerald-700 font-mono">${prod.price.toLocaleString('es-AR')}</td>
                                            <td className="py-1.5 px-2 text-center font-mono">
                                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {prod.stock} un.
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => onQuickStock(prod)}
                                                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                                        title="Ajuste Rápido de Stock"
                                                    >
                                                        ⚡
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { onEdit(prod); onClose(); }}
                                                        className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded cursor-pointer"
                                                        title="Cargar en Formulario"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDelete(prod.id, prod.name)}
                                                        className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-3 bg-stone-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
                    <span>Mostrando {filtered.length} productos</span>
                    <button onClick={onClose} className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer">
                        Cerrar Ventana
                    </button>
                </div>

            </div>
        </div>
    );
}