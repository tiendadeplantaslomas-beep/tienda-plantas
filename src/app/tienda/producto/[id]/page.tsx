// src/app/tienda/producto/[id]/page.tsx
'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft, ShieldCheck, Tag, Barcode, Check } from 'lucide-react';

export default function FichaProductoPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const productId = resolvedParams.id;

    const [producto, setProducto] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
    const [tamanoSeleccionado, setTamanoSeleccionado] = useState<string>('');
    const [cantidad, setCantidad] = useState<number>(1);

    const [agregadoExito, setAgregadoExito] = useState(false);
    const [customer, setCustomer] = useState<any>(null);

    useEffect(() => {
        if (!productId) return;

        fetch(`/api/products/${productId}`)
            .then(res => {
                if (!res.ok) throw new Error('Producto no encontrado');
                return res.json();
            })
            .then(data => {
                setProducto(data);
                if (data?.color) setColorSeleccionado(data.color);
                if (data?.tamano) setTamanoSeleccionado(data.tamano);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [productId]);

    if (loading) {
        return (
            <div className="min-h-[70vh] bg-stone-50 flex items-center justify-center p-6 text-stone-500 font-medium text-xs">
                Cargando detalles de la especie...
            </div>
        );
    }

    if (error || !producto) {
        return (
            <div className="min-h-[70vh] bg-stone-50 flex flex-col items-center justify-center p-6 text-stone-600 space-y-4">
                <p className="font-bold text-sm">El producto buscado no se encuentra disponible.</p>
                <Link href="/tienda" className="bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs">
                    Volver al catálogo
                </Link>
            </div>
        );
    }

    const precioUnitario = Number(producto.price || 0);
    const precioTotal = precioUnitario * cantidad;

    const taxRateDecimal = (Number(producto.taxRate) || 21) / 100;
    const precioSinIva = Math.round(precioTotal / (1 + taxRateDecimal));

    const stockWebDisponible = producto.stockWeb !== undefined ? producto.stockWeb : (producto.stock || 0);

    const handleAddToCart = () => {
        if (stockWebDisponible <= 0) return;

        const cartItem = {
            id: producto.id,
            nombre: producto.name,
            precio: precioUnitario,
            imagenUrl: producto.imageUrl,
            cantidad: cantidad,
            color: colorSeleccionado || null,
            tamano: tamanoSeleccionado || null,
            sku: producto.sku || producto.code
        };

        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const index = existingCart.findIndex((item: any) => item.id === cartItem.id && item.color === cartItem.color && item.tamano === cartItem.tamano);

        if (index > -1) {
            existingCart[index].cantidad += cantidad;
        } else {
            existingCart.push(cartItem);
        }

        localStorage.setItem('cart', JSON.stringify(existingCart));
        window.dispatchEvent(new Event('cartUpdated'));

        setAgregadoExito(true);
        setTimeout(() => setAgregadoExito(false), 3500);
    };

    return (
        <div className="w-full flex flex-col bg-stone-50 text-stone-800 p-4 md:p-6 font-sans">
            <div className="max-w-5xl mx-auto w-full space-y-4 pb-12">

                {/* NAVEGACIÓN SUPERIOR */}
                <div className="flex justify-between items-center">
                    <Link href="/tienda" className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-emerald-800 transition">
                        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
                    </Link>
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                        REF: {producto.code}
                    </span>
                </div>

                {/* CONTENEDOR PRINCIPAL */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                    {/* COLUMNA IZQUIERDA: IMAGEN + PANEL DE COMPRA */}
                    <div className="space-y-3">
                        <div className="h-60 md:h-[280px] w-full bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 relative group shadow-2xs">
                            <img
                                src={producto.imageUrl || "https://res.cloudinary.com/mfzvsfah/image/upload/v1/sinfoto"}
                                alt={producto.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                        </div>

                        {/* PANEL DE COMPRA COMPACTO */}
                        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center border border-stone-300 rounded-xl bg-white overflow-hidden shrink-0 shadow-2xs">
                                    <button
                                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                                        className="px-2.5 py-2 text-xs font-black hover:bg-stone-100 transition cursor-pointer"
                                    >
                                        -
                                    </button>
                                    <span className="px-3 text-xs font-black text-stone-900 font-mono">{cantidad}</span>
                                    <button
                                        onClick={() => setCantidad(Math.min(stockWebDisponible, cantidad + 1))}
                                        className="px-2.5 py-2 text-xs font-black hover:bg-stone-100 transition cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    onClick={handleAddToCart}
                                    disabled={stockWebDisponible <= 0}
                                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 ${stockWebDisponible > 0
                                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                                        : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                        }`}
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    {stockWebDisponible > 0 ? 'Añadir al carrito' : 'Sin Stock'}
                                </button>
                            </div>

                            {agregadoExito && (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xl p-2 font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> ¡Añadido al carrito!</span>
                                    <Link href="/tienda" className="underline text-[10px] font-extrabold text-emerald-900">Ver tienda</Link>
                                </div>
                            )}

                            {!customer && (
                                <div className="text-[10px] text-amber-800 bg-amber-50/90 p-2 rounded-xl border border-amber-200/80 flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Iniciá sesión para guardar tus datos y acumular beneficios.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: TÍTULO, PRECIO Y VARIANTES DINÁMICAS */}
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 px-3 py-0.5 rounded-full">
                                {producto.category?.name || 'Vivero & Jardinería'}
                            </span>

                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${stockWebDisponible > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                {stockWebDisponible > 0 ? `Stock Web: ${stockWebDisponible} un.` : 'Agotado'}
                            </span>
                        </div>

                        <h1 className="text-xl md:text-2xl font-black text-stone-900 tracking-tight leading-snug">
                            {producto.name}
                        </h1>

                        <div className="bg-stone-50/80 p-3 rounded-2xl border border-stone-200/80 space-y-0.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400 block">
                                Precio Total
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-900 font-mono">
                                    $ {precioTotal.toLocaleString('es-AR')}
                                </span>
                            </div>
                            <p className="text-[10px] text-stone-500 font-medium font-mono">
                                Sin impuestos aprox (IVA {producto.taxRate || 21}%): $ {precioSinIva.toLocaleString('es-AR')}
                            </p>
                        </div>

                        {/* COLOR DINÁMICO (SOLO SI TIENE CONFIGURADO) */}
                        {producto.color && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-stone-800 uppercase tracking-wide block">
                                    Color: <span className="text-emerald-700 font-bold">{colorSeleccionado}</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-stone-900 text-white shadow-2xs">
                                        {producto.color}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* TAMAÑO / MEDIDA DINÁMICO (SOLO SI TIENE CONFIGURADO) */}
                        {producto.tamano && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-stone-800 uppercase tracking-wide block">
                                    Tamaño / Medida: <span className="text-emerald-700 font-bold">{tamanoSeleccionado}</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-700 text-white shadow-xs">
                                        {producto.tamano}
                                    </span>
                                </div>
                            </div>
                        )}

                        {producto.description && (
                            <div className="pt-1.5 border-t border-stone-100">
                                <p className="text-[11px] text-stone-600 leading-relaxed">{producto.description}</p>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}