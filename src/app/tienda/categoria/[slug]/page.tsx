// src/app/tienda/categoria/[slug]/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Leaf, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Product {
    id: string;
    code: string;
    name: string;
    price: number;
    stock: number;
    imageUrl?: string;
    categoryId?: string;
    category?: { id: string; name: string };
}

export default function CategoriaPage() {
    const params = useParams();
    const router = useRouter();
    const slug = typeof params?.slug === 'string' ? decodeURIComponent(params.slug) : '';

    const [productos, setProductos] = useState<Product[]>([]);
    const [cargando, setCargando] = useState(true);
    const [subtituloCMS, setSubtituloCMS] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollCarrusel = (direccion: 'izquierda' | 'derecha') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const desplazamiento = clientWidth * 0.75;
            scrollRef.current.scrollTo({
                left: direccion === 'izquierda' ? scrollLeft - desplazamiento : scrollLeft + desplazamiento,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (!slug) return;

        setCargando(true);

        Promise.all([
            fetch(`/api/products?t=${Date.now()}`).then(res => res.json()),
            fetch(`/api/banners?t=${Date.now()}`).then(res => res.json()).catch(() => [])
        ])
            .then(([prodData, bannerData]) => {
                const items: Product[] = Array.isArray(prodData) ? prodData : (prodData.productos || prodData.data || []);
                const banners = Array.isArray(bannerData) ? bannerData : [];

                const normalizar = (str: string) =>
                    str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

                const slugNorm = normalizar(slug);

                // Buscamos el banner de la sección categorías que coincida exactamente con este título/slug
                const bannerAsociado = banners.find((b: any) => {
                    if (b.seccion !== 'categorias' || !b.titulo) return false;
                    return normalizar(b.titulo) === slugNorm;
                });

                if (bannerAsociado) {
                    if (bannerAsociado.subtitulo) {
                        setSubtituloCMS(bannerAsociado.subtitulo);
                    }

                    // Si se seleccionaron productos específicos en la pila, filtramos EXCLUSIVAMENTE esos IDs
                    if (Array.isArray(bannerAsociado.productosIds) && bannerAsociado.productosIds.length > 0) {
                        const idsSeleccionados = bannerAsociado.productosIds.map(String);
                        const filtradosPorPila = items.filter(p => idsSeleccionados.includes(String(p.id)));
                        setProductos(filtradosPorPila);
                        return;
                    }
                }

                // Fallback: Si no hay pila configurada en el CMS para este banner, mostramos los de la categoría general
                const filtradosPorCategoria = items.filter((p) => {
                    const catName = p.category?.name || '';
                    const catNorm = normalizar(catName);
                    const matchId = p.categoryId === slug || p.category?.id === slug;

                    return matchId || catNorm === slugNorm || catNorm.includes(slugNorm) || slugNorm.includes(catNorm);
                });

                setProductos(filtradosPorCategoria);
            })
            .catch((err) => console.error('Error al cargar datos de categoría:', err))
            .finally(() => setCargando(false));
    }, [slug]);

    return (
        <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Botón Volver */}
                <button
                    onClick={() => router.push('/tienda')}
                    className="flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-emerald-700 transition cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a la Tienda
                </button>

                {/* Cabecera de la Categoría y Controles */}
                <div className="border-b border-stone-200 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-200/80">
                            <Leaf className="h-6 w-6" />
                        </div>
                        <div>
                            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Selección Especial / Categoría</span>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-stone-900 uppercase">
                                {slug}
                            </h1>
                            {subtituloCMS && (
                                <p className="text-xs text-stone-500 mt-0.5 font-medium">{subtituloCMS}</p>
                            )}
                        </div>
                    </div>

                    {/* Botones de navegación horizontal del carrusel */}
                    {productos.length > 0 && (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                                onClick={() => scrollCarrusel('izquierda')}
                                className="p-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 transition shadow-xs cursor-pointer"
                                title="Anterior"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => scrollCarrusel('derecha')}
                                className="p-2 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 transition shadow-xs cursor-pointer"
                                title="Siguiente"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Carrusel Horizontal de Productos */}
                {cargando ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-xs">
                        <p className="text-xs text-stone-400 font-medium animate-pulse">Cargando selección de la base de datos...</p>
                    </div>
                ) : productos.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
                        <p className="text-stone-500 text-xs font-medium">No hay productos seleccionados en la pila para esta sección actualmente.</p>
                        <p className="text-[11px] text-stone-400">Podés ir a tu panel de Portada y agregar los artículos específicos a la pila de esta categoría.</p>
                        <Link href="/tienda" className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs">
                            Volver al inicio
                        </Link>
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="flex gap-5 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth no-scrollbar snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {productos.map((producto) => (
                            <div
                                key={producto.id}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xs transition hover:shadow-md justify-between shrink-0 w-64 sm:w-72 snap-start"
                            >
                                <div className="h-40 w-full rounded-xl bg-stone-100 overflow-hidden border border-stone-100 relative">
                                    <img
                                        src={producto.imageUrl?.trim() || '/sinfoto.png'}
                                        alt={producto.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    />
                                </div>
                                <div className="mt-3 flex flex-col flex-1 justify-between space-y-2.5">
                                    <div>
                                        <h3 className="text-xs font-extrabold text-stone-900 line-clamp-1">{producto.name}</h3>
                                        <p className="mt-0.5 text-[10px] text-stone-500 font-medium">Stock disponible: {producto.stock} u.</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                                        <p className="text-sm font-black text-emerald-800">${producto.price?.toLocaleString('es-AR')}</p>
                                        <Link
                                            href={`/tienda?producto=${producto.id}`}
                                            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer"
                                        >
                                            <ShoppingCart className="h-3.5 w-3.5" /> Comprar
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}