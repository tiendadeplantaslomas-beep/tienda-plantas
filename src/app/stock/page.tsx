'use client';

import { useState, useEffect } from 'react';
import { getProducts, adjustStock } from '../actions/product-actions';

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

export default function StockPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal / Formulario de Ajuste
    const [selectedProductId, setSelectedProductId] = useState('');
    const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
    const [quantityInput, setQuantityInput] = useState<number | ''>('');
    const [notesInput, setNotesInput] = useState('');

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts(data as any);
        setLoading(false);
    };

    // Producto seleccionado actualmente en el combo
    const activeProduct = products.find(p => p.id === selectedProductId);

    // Manejar selección de producto en el combo
    const handleSelectProduct = (id: string) => {
        setSelectedProductId(id);
        setQuantityInput('');
        setMessage(null);
    };

    // Procesar el ajuste de stock
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
            setSelectedProductId('');
            setQuantityInput('');
            setNotesInput('');
            // Refrescar lista local para actualizar grilla
            await loadData();
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 text-slate-800">

            {/* ENCABEZADO */}
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Gestión y Control de Stock</h1>
                    <p className="text-xs text-slate-500">Ajustes manuales, entradas y salidas manteniendo la integridad de costos de la base de datos.</p>
                </div>
            </div>

            {/* ALERTAS */}
            {message && (
                <div className={`p-3 rounded-lg text-xs font-medium flex justify-between ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-400">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* FORMULARIO DE MOVIMIENTO */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b pb-2">
                        Registrar Movimiento
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-3">

                        {/* Combo Selección Producto */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Producto
                            </label>
                            <select
                                value={selectedProductId}
                                onChange={(e) => handleSelectProduct(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium bg-white focus:ring-2 focus:ring-slate-800"
                            >
                                <option value="">-- Seleccionar producto --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        [{p.code}] {p.name} - (Stock: {p.stock})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* FICHA INFORMATIVA DEL PRODUCTO SELECCIONADO */}
                        {activeProduct && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 font-medium">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Categoría:</span>
                                    <span className="font-bold">{activeProduct.category?.name || 'S/C'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Costo Base:</span>
                                    <span className="font-mono font-bold text-slate-700">$ {activeProduct.cost.toLocaleString()}</span>
                                </div>
                                {activeProduct.otherCosts > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Flete / Varios:</span>
                                        <span className="font-mono text-amber-700">+ $ {activeProduct.otherCosts.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t pt-1 border-slate-200">
                                    <span className="text-slate-500">Costo Total Almacenado:</span>
                                    <span className="font-mono font-bold text-emerald-800">$ {(activeProduct.cost + activeProduct.otherCosts).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Precio Venta Público:</span>
                                    <span className="font-mono font-bold text-slate-900">$ {activeProduct.price.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between bg-emerald-100 p-1 rounded font-bold text-emerald-900 mt-1">
                                    <span>Stock Actual:</span>
                                    <span>{activeProduct.stock} unidades</span>
                                </div>
                            </div>
                        )}

                        {/* Tipo de Operación */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Tipo de Operación
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setMovementType('IN')}
                                    className={`py-1.5 text-xs font-bold rounded-lg border ${movementType === 'IN' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                >
                                    ➕ Entrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('OUT')}
                                    className={`py-1.5 text-xs font-bold rounded-lg border ${movementType === 'OUT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                >
                                    ➖ Salida
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType('ADJUSTMENT')}
                                    className={`py-1.5 text-xs font-bold rounded-lg border ${movementType === 'ADJUSTMENT' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                >
                                    ✏️ Ajuste
                                </button>
                            </div>
                        </div>

                        {/* Cantidad */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                {movementType === 'ADJUSTMENT' ? 'Nuevo Stock Total' : 'Cantidad a Unificar / Restar'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={quantityInput}
                                onChange={(e) => setQuantityInput(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-slate-800"
                            />
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                Observación / Motivo
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Conteo físico, rotura, etc."
                                value={notesInput}
                                onChange={(e) => setNotesInput(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedProductId}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow transition-all"
                        >
                            {submitting ? 'Procesando...' : '💾 Confirmar Movimiento'}
                        </button>

                    </form>
                </div>

                {/* TABLA DE PRODUCTOS Y STOCK EN VIVO */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 uppercase">Estado Actual de Inventario</span>
                        <span className="text-[10px] text-slate-500">{products.length} productos registrados</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 text-[10px] uppercase text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-2.5">Código</th>
                                    <th className="p-2.5">Producto</th>
                                    <th className="p-2.5">Categoría</th>
                                    <th className="p-2.5 text-right">Costo Total</th>
                                    <th className="p-2.5 text-right">Precio Venta</th>
                                    <th className="p-2.5 text-center">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">Cargando inventario...</td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">No hay productos creados aún.</td>
                                    </tr>
                                ) : (
                                    products.map((p) => {
                                        const isLowStock = p.stock <= p.minStock;
                                        const totalCost = p.cost + (p.otherCosts || 0);
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono font-bold text-slate-700">{p.code}</td>
                                                <td className="p-2.5 font-bold text-slate-800">{p.name}</td>
                                                <td className="p-2.5 text-slate-500">{p.category?.name || '-'}</td>
                                                <td className="p-2.5 text-right font-mono">$ {totalCost.toLocaleString()}</td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-800">$ {p.price.toLocaleString()}</td>
                                                <td className="p-2.5 text-center">
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

            </div>

        </div>
    );
}