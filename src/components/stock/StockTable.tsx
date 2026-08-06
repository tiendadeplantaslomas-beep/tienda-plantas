'use client';

import { useState, useMemo } from 'react';
import { ProductItem } from './StockForm';

type SortColumn = 'code' | 'name' | 'category';
type SortDirection = 'asc' | 'desc';

interface StockTableProps {
    products: ProductItem[];
    loading: boolean;
}

export default function StockTable({ products, loading }: StockTableProps) {
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            let valA = '';
            let valB = '';

            if (sortColumn === 'code') {
                valA = a.code.toLowerCase();
                valB = b.code.toLowerCase();
            } else if (sortColumn === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortColumn === 'category') {
                valA = (a.category?.name || '').toLowerCase();
                valB = (b.category?.name || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [products, sortColumn, sortDirection]);

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedProducts.slice(start, start + itemsPerPage);
    }, [sortedProducts, currentPage]);

    const renderSortIcon = (column: SortColumn) => {
        if (sortColumn !== column) return <span className="text-slate-300 ml-1">↕</span>;
        return sortDirection === 'asc' ? <span className="text-slate-800 ml-1">▲</span> : <span className="text-slate-800 ml-1">▼</span>;
    };

    return (
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between z-0">
            <div>
                <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase">Estado Actual de Inventario</span>
                    <span className="text-[10px] text-slate-500">{products.length} productos registrados</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 font-bold border-b border-slate-200 select-none">
                            <tr>
                                <th onClick={() => handleSort('code')} className="p-2 cursor-pointer hover:bg-slate-200/60 transition-colors">
                                    <div className="flex items-center">Código {renderSortIcon('code')}</div>
                                </th>
                                <th onClick={() => handleSort('name')} className="p-2 cursor-pointer hover:bg-slate-200/60 transition-colors">
                                    <div className="flex items-center">Producto {renderSortIcon('name')}</div>
                                </th>
                                <th onClick={() => handleSort('category')} className="p-2 cursor-pointer hover:bg-slate-200/60 transition-colors">
                                    <div className="flex items-center">Categoría {renderSortIcon('category')}</div>
                                </th>
                                <th className="p-2 text-right">Costo Total</th>
                                <th className="p-2 text-right">Precio Venta</th>
                                <th className="p-2 text-center">Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-slate-400 italic">Cargando inventario...</td>
                                </tr>
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-slate-400 italic">No hay productos guardados.</td>
                                </tr>
                            ) : (
                                paginatedProducts.map((p) => {
                                    const isLowStock = p.stock <= p.minStock;
                                    const totalCost = p.cost + (p.otherCosts || 0);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="p-2 font-mono font-bold text-slate-700">{p.code}</td>
                                            <td className="p-2 font-bold text-slate-800">{p.name}</td>
                                            <td className="p-2 text-slate-500">{p.category?.name || '-'}</td>
                                            <td className="p-2 text-right font-mono">$ {totalCost.toLocaleString('es-AR')}</td>
                                            <td className="p-2 text-right font-mono font-bold text-emerald-800">$ {p.price.toLocaleString('es-AR')}</td>
                                            <td className="p-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLowStock ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {p.stock} u.
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
                <div className="p-2 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-500">
                        Página <strong className="text-slate-700">{currentPage}</strong> de <strong>{totalPages}</strong>
                    </span>

                    <div className="flex space-x-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                            ◀ Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                            Siguiente ▶
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}