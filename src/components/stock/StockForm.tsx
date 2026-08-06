'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

export interface ProductItem {
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

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

interface StockFormProps {
    products: ProductItem[];
    onSubmit: (productId: string, quantity: number, type: MovementType, notes: string) => Promise<void>;
    submitting: boolean;
}

export default function StockForm({ products, onSubmit, submitting }: StockFormProps) {
    const [selectedProductId, setSelectedProductId] = useState('');
    const [movementType, setMovementType] = useState<MovementType>('IN');
    const [quantityInput, setQuantityInput] = useState<number | ''>('');
    const [notesInput, setNotesInput] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

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

    const activeProduct = products.find(p => p.id === selectedProductId);

    const filteredSearchProducts = useMemo(() => {
        if (!searchQuery.trim() || selectedProductId) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(
            p => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
        );
    }, [products, searchQuery, selectedProductId]);

    const handleSelectProduct = (product: ProductItem) => {
        setSelectedProductId(product.id);
        setSearchQuery(`[${product.code}] ${product.name}`);
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
        setQuantityInput('');
    };

    const handleClearSelection = () => {
        setSelectedProductId('');
        setSearchQuery('');
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
    };

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
                e.preventDefault();
                handleSelectProduct(filteredSearchProducts[focusedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
            setFocusedIndex(-1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || quantityInput === '' || Number(quantityInput) < 0) return;

        await onSubmit(selectedProductId, Number(quantityInput), movementType, notesInput);

        handleClearSelection();
        setQuantityInput('');
        setNotesInput('');
    };

    return (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3 lg:sticky lg:top-4 z-10">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1.5">
                Registrar Movimiento
            </h2>

            <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* BUSCADOR PREDICTIVO */}
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

                    {/* MENÚ DESPLEGABLE */}
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

                {/* FICHA INFORMATIVA */}
                {activeProduct && (
                    <div className="bg-slate-50 p-2 rounded-md border border-slate-200 text-[11px] space-y-1">
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-b pb-1 border-slate-200">
                            <div>
                                <span className="text-slate-400 block text-[9px] uppercase">Categoría</span>
                                <span className="font-bold text-slate-700 truncate block">{activeProduct.category?.name || 'S/C'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[9px] uppercase">Costo Base</span>
                                <span className="font-mono font-bold text-slate-700">$ {activeProduct.cost.toLocaleString('es-AR')}</span>
                            </div>
                            {activeProduct.otherCosts > 0 && (
                                <div>
                                    <span className="text-slate-400 block text-[9px] uppercase">Flete/Varios</span>
                                    <span className="font-mono text-amber-700">+ $ {activeProduct.otherCosts.toLocaleString('es-AR')}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-slate-400 block text-[9px] uppercase">Precio Público</span>
                                <span className="font-mono font-bold text-slate-900">$ {activeProduct.price.toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <div className="flex justify-between bg-emerald-100/70 px-2 py-0.5 rounded font-bold text-emerald-900 text-[11px] items-center">
                            <span>Stock Actual:</span>
                            <span>{activeProduct.stock} u.</span>
                        </div>
                    </div>
                )}

                {/* TIPO DE OPERACIÓN */}
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

                {/* CANTIDAD */}
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

                {/* OBSERVACIONES */}
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
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-md text-xs font-bold shadow transition-all mt-1 cursor-pointer disabled:cursor-not-allowed"
                >
                    {submitting ? 'Procesando...' : '💾 Confirmar Movimiento'}
                </button>
            </form>
        </div>
    );
}