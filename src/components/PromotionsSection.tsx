'use client';

import { useState, useEffect } from 'react';
import { Tag, Package, Clock, MessageCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface Product {
    id: number;
    nombre: string;
    precio: number;
    categoria: string;
}

interface Promotion {
    id: number;
    titulo: string;
    descripcion?: string;
    badge?: string;
    linkWhatsapp?: string;
    imagenUrl?: string;
    stock: number;
    desde?: string;
    hasta?: string;
    categoria?: string;
    productos?: Product[];
}

export default function PromotionsSection() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedPila, setExpandedPila] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const fetchPublicPromotions = async () => {
            try {
                const res = await fetch('/api/promotions');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        // Filtrar solo las activas para el público
                        const activas = data.filter((p: Promotion) => p.activa && p.stock > 0);
                        setPromotions(activas);
                    }
                }
            } catch (err) {
                console.error('Error al cargar promociones públicas:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicPromotions();
    }, []);

    const togglePila = (id: number) => {
        setExpandedPila((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) {
        return (
            <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                Cargando ofertas exclusivas...
            </div>
        );
    }

    if (promotions.length === 0) {
        return null; // Si no hay promos activas, no mostramos nada en la tienda
    }

    return (
        <section className="max-w-7xl mx-auto px-4 py-6 font-sans">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    Ofertas y Promociones Destacadas
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.map((promo) => {
                    const isPilaOpen = expandedPila[promo.id] || false;
                    const defaultWa = 'https://wa.me/541140782378';
                    const waLink = promo.linkWhatsapp || defaultWa;
                    const mensajeWa = encodeURIComponent(`¡Hola! Me interesa la promoción: *${promo.titulo}*`);
                    const finalWaUrl = `${waLink}?text=${mensajeWa}`;

                    return (
                        <div
                            key={promo.id}
                            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-200"
                        >
                            {/* Imagen y Badge */}
                            <div className="relative h-44 bg-slate-900 overflow-hidden">
                                {promo.imagenUrl ? (
                                    <img
                                        src={promo.imagenUrl}
                                        alt={promo.titulo}
                                        className="w-full h-full object-cover opacity-90 hover:scale-105 transition duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-lg">
                                        🌿 Vivero Promo
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                                    <span className="bg-amber-400 text-stone-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase shadow-xs">
                                        {promo.badge || 'OFERTA'}
                                    </span>
                                    {promo.categoria && (
                                        <span className="bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shadow-xs">
                                            {promo.categoria}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Package className="w-3 h-3 text-emerald-400" />
                                    <span>Stock: {promo.stock} disponibles</span>
                                />
                                </div>

                                {/* Contenido */}
                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                    <div>
                                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                                            {promo.titulo}
                                        </h3>
                                        {promo.descripcion && (
                                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                                {promo.descripcion}
                                            </p>
                                        )}
                                    </div>

                                    {/* Pila de Productos Vinculados */}
                                    {promo.productos && promo.productos.length > 0 && (
                                        <div className="border border-slate-100 bg-slate-50/70 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => togglePila(promo.id)}
                                                className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                                                    Ver productos incluidos ({promo.productos.length})
                                                </span>
                                                {isPilaOpen ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                )}
                                            </button>

                                            {isPilaOpen && (
                                                <div className="px-3 pb-2 space-y-1.5 divide-y divide-slate-200/50">
                                                    {promo.productos.map((prod) => (
                                                        <div key={prod.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                                                            <span className="font-medium text-slate-800 truncate pr-2">
                                                                {prod.nombre}
                                                            </span>
                                                            <span className="font-bold text-emerald-700 shrink-0">
                                                                ${prod.precio.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Botón de Acción a WhatsApp */}
                                    <a
                                        href={finalWaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Consultar / Comprar por WhatsApp
                                    </a>
                                </div>
                            </div>
                            );
                })}
                        </div>
        </section>
    );
}