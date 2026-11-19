// src/components/ModalListadoProductos.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Eye } from 'lucide-react';

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
    const [viewingProduct, setViewingProduct] = useState<any | null>(null);
    const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number>(0);
    const handleCloseModal = () => {
        setQuery('');
        setTab('catalogo');
        setViewingProduct(null);
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setTab('catalogo');
            setViewingProduct(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const totalAlertas = products.filter(p => p.stock <= p.minStock).length;

    const filtered = products.filter(p => {
        const matchTab = tab === 'catalogo' || (tab === 'alertas' && p.stock <= p.minStock);
        if (!matchTab) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.category?.name || '').toLowerCase().includes(q)
        );
    });

    const openProductView = (prod: any) => {
        setViewingProduct(prod);
        setSelectedSupplierIndex(0);
    };

    const supplierTabs = viewingProduct?.suppliersBreakdown?.length > 0
        ? viewingProduct.suppliersBreakdown
        : [
            {
                supplierId: viewingProduct?.supplierId || 'GENERAL',
                supplierName: viewingProduct?.supplier?.name || 'CARGA MANUAL / GENERAL',
                unitCost: Number(viewingProduct?.cost || 0),
                allocatedOtherCost: Number(viewingProduct?.otherCosts || 0),
                finalUnitCost: Number(viewingProduct?.cost || 0) + Number(viewingProduct?.otherCosts || 0),
                salePrice: Number(viewingProduct?.price || 0),
                lastQuantity: Number(viewingProduct?.stock || 0),
                totalPurchasedQuantity: Number(viewingProduct?.stock || 0),
                lastPurchaseDate: null,
            }
        ];

    const activeSupplierTab = supplierTabs[selectedSupplierIndex] || supplierTabs[0];

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="p-4 bg-stone-100 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">📋 Catálogo General de Productos & Inventario</h3>
                        <p className="text-[10px] text-slate-500">
                            Los productos marcados con <span className="font-black text-amber-700">*</span> registran más de 1 distribuidor.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Filtros y solapas */}
                <div className="p-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setTab('catalogo')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${tab === 'catalogo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                                }`}
                        >
                            📋 Catálogo ({products.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('alertas')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${tab === 'alertas' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
                                }`}
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
                                <th className="py-2 px-2 text-right">Precio Venta</th>
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
                                    const multiSupplier = Boolean(prod.hasMultipleSuppliers);
                                    return (
                                        <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-1.5 px-2 text-center">
                                                <div className="w-7 h-7 mx-auto rounded overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                                                    <img src={prod.imageUrl?.trim() || '/sinfoto.png'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-2 font-mono font-bold text-slate-600">{prod.code}</td>
                                            <td className="py-1.5 px-2 font-bold text-slate-800 uppercase">
                                                <span>{prod.name}</span>
                                                {multiSupplier && (
                                                    <span
                                                        className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-black text-[10px]"
                                                        title="Este producto registra más de 1 distribuidor"
                                                    >
                                                        *
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-1.5 px-2 text-slate-600 uppercase text-[10px]">{prod.category?.name || '-'}</td>
                                            <td className="py-1.5 px-2 text-right font-black text-emerald-700 font-mono">
                                                ${Number(prod.price || 0).toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-1.5 px-2 text-center font-mono">
                                                <span
                                                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                        }`}
                                                >
                                                    {prod.stock} un.
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openProductView(prod)}
                                                        className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded cursor-pointer"
                                                        title="Ver Detalle por Distribuidor"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 inline" />
                                                    </button>
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
                    <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                        Cerrar Ventana
                    </button>
                </div>

            </div>

            {/* MODAL DE DETALLE (SOLO LECTURA) CON SOLAPAS POR DISTRIBUIDOR */}
            {viewingProduct && (
                <div className="fixed inset-0 z-60 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-4 bg-stone-100 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">
                                        Vista de Detalle • {viewingProduct.code}
                                    </span>
                                    {viewingProduct.hasMultipleSuppliers && (
                                        <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                                            * Múltiples Distribuidores ({supplierTabs.length})
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-sm font-black text-slate-900 uppercase">
                                    {viewingProduct.name}
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingProduct(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 text-xs">
                            {/* FICHA GENERAL Y PRECIO DE VENTA ÚNICO */}
                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                                <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                                    <img
                                        src={viewingProduct.imageUrl?.trim() || '/sinfoto.png'}
                                        alt={viewingProduct.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/sinfoto.png'; }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1 w-full">
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Categoría</p>
                                        <p className="font-bold text-slate-800 uppercase">{viewingProduct.category?.name || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Margen / IVA Ficha</p>
                                        <p className="font-bold text-slate-800 font-mono">
                                            {viewingProduct.margin ?? 0}% • IVA {viewingProduct.taxRate ?? 21}%
                                        </p>
                                    </div>
                                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                                        <p className="text-[9px] font-bold text-emerald-800 uppercase">Precio Venta (Único)</p>
                                        <p className="font-black text-emerald-700 font-mono text-sm">
                                            ${Number(viewingProduct.price || 0).toLocaleString('es-AR')}
                                        </p>
                                    </div>
                                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Stock Físico / Web</p>
                                        <p className="font-black text-slate-900 font-mono">
                                            {viewingProduct.stock ?? 0} un. / {viewingProduct.stockWeb ?? 0} web
                                        </p>
                                    </div>
                                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Stock Mínimo</p>
                                        <p className="font-black text-slate-900 font-mono">{viewingProduct.minStock ?? 0} un.</p>
                                    </div>
                                    <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Variante / Dest.</p>
                                        <p className="font-semibold text-slate-800 uppercase truncate">
                                            {[viewingProduct.color, viewingProduct.tamano].filter(Boolean).join(' • ') || '-'}
                                            {viewingProduct.destacado ? ' ⭐' : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SOLAPAS POR DISTRIBUIDOR */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
                                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                                        🚚 Desglose por Distribuidor
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {supplierTabs.map((sup: any, idx: number) => (
                                            <button
                                                key={`${sup.supplierId}-${idx}`}
                                                type="button"
                                                onClick={() => setSelectedSupplierIndex(idx)}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${selectedSupplierIndex === idx
                                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {sup.supplierName}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {activeSupplierTab && (
                                    <div className="p-3 space-y-2.5">
                                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                                            <span>
                                                Distribuidor: <strong className="text-slate-800 uppercase">{activeSupplierTab.supplierName}</strong>
                                            </span>
                                            {activeSupplierTab.lastPurchaseDate && (
                                                <span className="font-mono">Última compra: {activeSupplierTab.lastPurchaseDate}</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Comprado (Últ. / Acum.)</p>
                                                <p className="font-black text-slate-900 font-mono text-sm">
                                                    {Number(activeSupplierTab.lastQuantity || 0)} un.
                                                </p>
                                                <p className="text-[9px] text-slate-500 font-mono">
                                                    Acum.: {Number(activeSupplierTab.totalPurchasedQuantity || 0)} un.
                                                </p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Costo Base Unit.</p>
                                                <p className="font-black text-slate-800 font-mono text-sm">
                                                    ${Number(activeSupplierTab.unitCost || 0).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Gastos / Prorrateo</p>
                                                <p className="font-black text-amber-700 font-mono text-sm">
                                                    ${Number(activeSupplierTab.allocatedOtherCost || 0).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Costo Final Unit.</p>
                                                <p className="font-black text-slate-900 font-mono text-sm">
                                                    ${Number(activeSupplierTab.finalUnitCost || 0).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                                                <p className="text-[9px] font-bold text-emerald-800 uppercase">Precio Venta (Único)</p>
                                                <p className="font-black text-emerald-700 font-mono text-sm">
                                                    ${Number(activeSupplierTab.salePrice || 0).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-stone-100 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const target = viewingProduct;
                                    setViewingProduct(null);
                                    onEdit(target);
                                    onClose();
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                                ✏️ Editar en Formulario
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingProduct(null)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                                Cerrar Vista
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}