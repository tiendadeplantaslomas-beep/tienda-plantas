'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProducts, adjustStock } from '@/actions/product-actions';
import StockForm, { ProductItem, MovementType } from '@/components/stock/StockForm';
import StockTable from '@/components/stock/StockTable';

export default function StockPage() {
    const [fechaActual, setFechaActual] = useState('');
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts(data as any);
        setLoading(false);
    };

    useEffect(() => {
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const fechaStr = hoy.toLocaleDateString('es-AR', opciones);
        setFechaActual(fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1));

        loadData();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleStockSubmit = async (productId: string, quantity: number, type: MovementType, notes: string) => {
        setSubmitting(true);
        setMessage(null);

        const res = await adjustStock(productId, quantity, type, notes);

        setSubmitting(false);

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: 'Stock actualizado correctamente.' });
            await loadData();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 max-w-7xl mx-auto text-slate-800 pb-1 items-stretch">
            <div className="lg:col-span-12 flex flex-col gap-2">

                {/* ENCABEZADO Y ACCIONES */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-0.5 gap-1 shrink-0">
                    <div className="flex items-center gap-1.5">

                        <div>
                            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                                <span>📦</span> Gestión y Control de Inventario
                            </h1>
                            <p className="text-[9px] text-slate-500 font-medium">
                                Ajustes manuales, entradas, salidas y consulta general del estado de stock. &bull; {fechaActual}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        <Link
                            href="/productos"
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-semibold rounded shadow-2xs flex items-center gap-1 transition-colors"
                        >
                            <span>🏷️</span> Ir a Catálogo
                        </Link>
                    </div>
                </div>

                {/* NOTIFICACIONES */}
                {message && (
                    <div className={`p-2.5 rounded-md text-[11px] font-medium flex justify-between items-center transition-all ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs'
                        : 'bg-rose-50 text-rose-900 border border-rose-300 shadow-2xs'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                            <span className="font-semibold">{message.text}</span>
                        </div>
                        <button type="button" onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1">✕</button>
                    </div>
                )}

                {/* GRID PRINCIPAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-start">
                    <StockForm products={products} onSubmit={handleStockSubmit} submitting={submitting} />
                    <StockTable products={products} loading={loading} />
                </div>

            </div>
        </div>
    );
}