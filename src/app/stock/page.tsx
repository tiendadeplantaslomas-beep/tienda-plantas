'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '../actions/product-actions';
import { updateStock, MovementType } from '../actions/stock-actions';

interface Product {
    id: string;
    code: string;
    name: string;
    stock: number;
    minStock: number;
    category?: { name: string };
}

export default function StockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState<number | ''>('');
    const [movementType, setMovementType] = useState<MovementType>('IN');
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [search, setSearch] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    // Auto-ocultar alertas
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const loadProducts = async () => {
        const data = await getProducts();
        setProducts(data as Product[]);
    };

    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !quantity || Number(quantity) <= 0) {
            setMessage({ type: 'error', text: 'Ingresá un producto y una cantidad válida.' });
            return;
        }

        const res = await updateStock(selectedProduct.id, Number(quantity), movementType, notes);
        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: `Stock actualizado. Nuevo saldo: ${res.newStock} u.` });
            setSelectedProduct(null);
            setQuantity('');
            setNotes('');
            loadProducts();
        }
    };

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
        const matchesLow = filterLowStock ? p.stock <= p.minStock : true;
        return matchesSearch && matchesLow;
    });

    return (
        <div className="h-screen max-h-screen overflow-hidden bg-slate-50 p-3 md:p-5 flex flex-col space-y-3 max-w-7xl mx-auto text-slate-800">

            {/* ENCABEZADO */}
            <div className="flex-none flex justify-between items-center border-b pb-3 border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Control de Inventario</h1>
                    <p className="text-xs text-slate-500">Ingresos, bajas y alertas de stock mínimo.</p>
                </div>
                <button
                    onClick={() => setFilterLowStock(!filterLowStock)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filterLowStock
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                        }`}
                >
                    ⚠️ {filterLowStock ? 'Viendo: Stock Bajo' : 'Filtrar Stock Bajo'}
                </button>
            </div>

            {/* NOTIFICACIÓN */}
            {message && (
                <div className={`flex-none p-2.5 rounded-lg text-xs font-medium flex justify-between ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-400">✕</button>
                </div>
            )}

            {/* FORMULARIO DE MOVIMIENTO */}
            {selectedProduct && (
                <form onSubmit={handleStockSubmit} className="flex-none bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center border-b pb-1">
                        <span className="text-xs font-bold uppercase text-slate-700">
                            Ajustar Stock: <span className="text-emerald-700">{selectedProduct.name}</span> ({selectedProduct.code})
                        </span>
                        <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-slate-400 font-bold">✕</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Tipo</label>
                            <select
                                value={movementType}
                                onChange={(e) => setMovementType(e.target.value as MovementType)}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold bg-white"
                            >
                                <option value="IN">➕ Entrada (Compra/Ingreso)</option>
                                <option value="OUT">➖ Salida (Baja/Rotura)</option>
                                <option value="ADJUSTMENT">⚙️ Ajuste Directo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold"
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Observación / Nota</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                                placeholder="ej. Factura N° 1234 / Muestra rota"
                            />
                        </div>

                        <div className="flex items-end">
                            <button type="submit" className="w-full py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm">
                                💾 Registrar Movimiento
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* FILTRO DE BÚSQUEDA */}
            <div className="flex-none bg-white p-2 rounded-xl border border-slate-200">
                <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o código..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1 text-xs"
                />
            </div>

            {/* TABLA CON SCROLL EXCLUSIVO */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2">Categoría</th>
                                <th className="px-3 py-2 text-center">Stock Actual</th>
                                <th className="px-3 py-2 text-center">Mínimo</th>
                                <th className="px-3 py-2 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filtered.map(p => {
                                const isLow = p.stock <= p.minStock;
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 font-mono font-bold text-slate-700">{p.code}</td>
                                        <td className="px-3 py-2 uppercase font-bold text-slate-800">{p.name}</td>
                                        <td className="px-3 py-2 text-slate-500 font-semibold">{p.category?.name || '-'}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {isLow && '⚠️ '} {p.stock} u.
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-500">{p.minStock} u.</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => setSelectedProduct(p)}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px]"
                                            >
                                                📦 Movimiento
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}