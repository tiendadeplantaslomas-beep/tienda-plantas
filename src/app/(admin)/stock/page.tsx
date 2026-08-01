'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getProducts, adjustStock } from '@/actions/product-actions';

interface ProductItem {
    id: string;
    code: string;
    name: string;
    cost: number;
    otherCosts: number;
    price: number;
    stock: number;
    minStock: number;
    category: { name: string };
    supplier?: { name: string } | null;
}

type SortColumn = 'code' | 'name' | 'category';
type SortDirection = 'asc' | 'desc';

export default function StockPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulario de Ajuste
    const [selectedProductId, setSelectedProductId] = useState('');
    const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
    const [quantityInput, setQuantityInput] = useState<number | ''>('');
    const [notesInput, setNotesInput] = useState('');

    // Estado del Buscador Predictivo (Combobox)
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Estados para Ordenamiento
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Estados para Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

    // Cerrar el menú desplegable al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setFocusedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Timer para ocultar el mensaje automáticamente
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [message]);

    const loadData = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts(data as any);
        setLoading(false);
    };

    const activeProduct = products.find(p => p.id === selectedProductId);

    // Productos filtrados para el buscador predictivo
    const filteredSearchProducts = useMemo(() => {
        if (!searchQuery.trim() || selectedProductId) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(
            p => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
        );
    }, [products, searchQuery, selectedProductId]);

    // Selección de producto
    const handleSelectProduct = (product: ProductItem) => {
        setSelectedProductId(product.id);
        setSearchQuery(`[${product.code}] ${product.name}`);
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
        setQuantityInput('');
        setMessage(null);
    };

    const handleClearSelection = () => {
        setSelectedProductId('');
        setSearchQuery('');
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
    };

    // Navegación por Teclado (Arriba, Abajo, Enter, Escape)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsDropdownOpen(true);
            return;
        }

        if (filteredSearchProducts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (focusedIndex + 1) % filteredSearchProducts.length;
            setFocusedIndex(nextIndex);
            itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (focusedIndex - 1 + filteredSearchProducts.length) % filteredSearchProducts.length;
            setFocusedIndex(prevIndex);
            itemRefs.current[prevIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            if (isDropdownOpen && focusedIndex >= 0 && focusedIndex < filteredSearchProducts.length) {
                e.preventDefault(); // Evitar envío del formulario en esta tecla Enter
                handleSelectProduct(filteredSearchProducts[focusedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
            setFocusedIndex(-1);
        }
    };

    // Lógica de Ordenamiento de Tabla
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

    // Lógica de Paginación de Tabla
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedProducts.slice(start, start + itemsPerPage);
    }, [sortedProducts, currentPage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProductId) {
            setMessage({ type: 'error', text: 'Seleccioná un producto de la lista.' });
            return;
        }

        if (quantityInput === '' || Number(quantityInput) < 0) {
            setMessage({ type: 'error', text: 'Ingresá una cantidad válida.' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        const res = await adjustStock(
            selectedProductId,
            Number(quantityInput),
            movementType,
            notesInput
        );

        setSubmitting(false);

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: 'Stock actualizado correctamente.' });
            handleClearSelection();
            setQuantityInput('');
            setNotesInput('');
            await loadData();
        }
    };

    const renderSortIcon = (column: SortColumn) => {
        if (sortColumn !== column) return <span className="text-slate-300 ml-1">↕</span>;
        return sortDirection === 'asc' ? <span className="text-slate-800 ml-1">▲</span> : <span className="text-slate-800 ml-1">▼</span>;
    };

    return (
        <div className="p-3 md:p-5 max-w-7xl mx-auto space-y-3 text-slate-800">

            {/* ENCABEZADO */}
            <div className="flex justify-between items-center border-b pb-2 border-slate-200">
                <div>
                    <h1 className="text-lg font-bold text-slate-800">Gestión y Control de Stock</h1>
                    <p className="text-[11px] text-slate-500">Ajustes manuales, entradas y salidas de inventario.</p>
                </div>
            </div>

            {/* ALERTAS CON AUTO-HIDE */}
            {message && (
                <div className={`p-2 rounded-lg text-xs font-medium flex justify-between items-center transition-all duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-400 hover:text-slate-600 ml-2">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

                {/* FORMULARIO DE MOVIMIENTO */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3 lg:sticky lg:top-4 z-10">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1.5">
                        Registrar Movimiento
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-2.5">

                        {/* BUSCADOR PREDICTIVO CON NAVEGACIÓN POR TECLADO */}
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                Buscar Producto <span className="text-slate-400 font-normal lowercase">(usá 🠑🠓 y Enter)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Escribí nombre o código..."
                                    value={searchQuery}
                                    onKeyDown={handleKeyDown}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedProductId) setSelectedProductId('');
                                        setIsDropdownOpen(true);
                                        setFocusedIndex(0);
                                    }}
                                    onFocus={() => {
                                        setIsDropdownOpen(true);
                                        setFocusedIndex(0);
                                    }}
                                    className="w-full border border-slate-300 rounded-md p-1.5 pr-7 text-xs font-medium bg-white focus:ring-1 focus:ring-slate-800"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={handleClearSelection}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* LISTA DESPLEGABLE FILTRADA */}
                            {isDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                                    {filteredSearchProducts.length === 0 ? (
                                        <div className="p-2 text-xs text-slate-400 italic text-center">
                                            No se encontraron productos
                                        </div>
                                    ) : (
                                        filteredSearchProducts.map((p, index) => {
                                            const isFocused = index === focusedIndex;
                                            return (
                                                <div
                                                    key={p.id}
                                                    ref={(el) => (itemRefs.current[index] = el)}
                                                    onClick={() => handleSelectProduct(p)}
                                                    onMouseEnter={() => setFocusedIndex(index)}
                                                    className={`p-2 text-xs cursor-pointer flex justify-between items-center transition-colors ${isFocused ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-800'}`}
                                                >
                                                    <div>
                                                        <span className={`font-mono font-bold ${isFocused ? 'text-slate-200' : 'text-slate-600'}`}>[{p.code}]</span>{' '}
                                                        <span className="font-medium">{p.name}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isFocused ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-600'}`}>
                                                        Stock: {p.stock}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* FICHA INFORMATIVA COMPACTA */}
                        {activeProduct && (
                            <div className="bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px] space-y-1">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-b pb-1 border-slate-200">
                                    <div>
                                        <span className="text-slate-400 block text-[9px] uppercase">Categoría</span>
                                        <span className="font-bold text-slate-700 truncate block">{activeProduct.category?.name || 'S/C'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[9px] uppercase">Costo Base</span>
                                        <span className="font-mono font-bold text-slate-700">$ {activeProduct.cost.toLocaleString()}</span>
                                    </div>
                                    {activeProduct.otherCosts > 0 && (
                                        <div>
                                            <span className="text-slate-400 block text-[9px] uppercase">Flete/Varios</span>
                                            <span className="font-mono text-amber-700">+ $ {activeProduct.otherCosts.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-slate-400 block text-[9px] uppercase">Precio Público</span>
                                        <span className="font-mono font-bold text-slate-900">$ {activeProduct.price.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between bg-emerald-100/70 px-2 py-0.5 rounded font-bold text-emerald-900 text-[11px] items-center">
                                    <span>Stock Actual:</span>
                                    <span>{activeProduct.stock} u.</span>
                                </div>
                            </div>
                        )}

                        {/* Tipo de Operación */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                Operación
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setMovementType('IN')}
                                    className={`py-1 text-[11px] font-bold rounded-md border ${movementType === 'IN' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    ➕ Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('OUT')}
                                    className={`py-1 text-[11px] font-bold rounded-md border ${movementType === 'OUT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    ➖ Salida
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('ADJUSTMENT')}
                                    className={`py-1 text-[11px] font-bold rounded-md border ${movementType === 'ADJUSTMENT' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    ✏️ Ajuste
                                </button>
                            </div>
                        </div>

                        {/* Cantidad */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                {movementType === 'IN'
                                    ? 'Cantidad a Sumar'
                                    : movementType === 'OUT'
                                        ? 'Cantidad a Restar'
                                        : 'Nuevo Stock Total'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={quantityInput}
                                onChange={(e) => setQuantityInput(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-md p-1.5 text-xs font-bold focus:ring-1 focus:ring-slate-800"
                            />
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                Motivo / Observación
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Conteo, rotura, etc."
                                value={notesInput}
                                onChange={(e) => setNotesInput(e.target.value)}
                                className="w-full border border-slate-300 rounded-md p-1.5 text-xs"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedProductId}
                            className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-md text-xs font-bold shadow transition-all mt-1"
                        >
                            {submitting ? 'Procesando...' : '💾 Confirmar Movimiento'}
                        </button>

                    </form>
                </div>

                {/* TABLA DE PRODUCTOS CON ORDENAMIENTO Y PAGINACIÓN */}
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
                                        <th
                                            onClick={() => handleSort('code')}
                                            className="p-2 cursor-pointer hover:bg-slate-200/60 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                Código {renderSortIcon('code')}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('name')}
                                            className="p-2 cursor-pointer hover:bg-slate-200/60 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                Producto {renderSortIcon('name')}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSort('category')}
                                            className="p-2 cursor-pointer hover:bg-slate-200/60 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                Categoría {renderSortIcon('category')}
                                            </div>
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
                                                    <td className="p-2 text-right font-mono">$ {totalCost.toLocaleString()}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-800">$ {p.price.toLocaleString()}</td>
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

                    {/* PIE DE TABLA CON CONTROLES DE PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="p-2 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                            <span className="text-[11px] text-slate-500">
                                Página <strong className="text-slate-700">{currentPage}</strong> de <strong>{totalPages}</strong>
                            </span>

                            <div className="flex space-x-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition-all"
                                >
                                    ◀ Anterior
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition-all"
                                >
                                    Siguiente ▶
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}