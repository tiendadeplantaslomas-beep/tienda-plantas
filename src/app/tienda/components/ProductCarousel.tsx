// src/app/tienda/components/ProductCarousel.tsx
'use client';
import { useRef } from 'react';
import Link from 'next/link';

export default function ProductCarousel({ products, whatsappNumber }: { products: any[], whatsappNumber: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const offset = direction === 'left' ? -clientWidth : clientWidth;
            scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative group bg-stone-100/80 border border-stone-200/60 rounded-3xl p-6 shadow-xs">
            {/* Botón Izquierdo centrado verticalmente con sombra */}
            <button
                onClick={() => scroll('left')}
                className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-stone-200 hover:bg-emerald-50 text-stone-800 w-11 h-11 rounded-full shadow-md transition flex items-center justify-center font-bold cursor-pointer text-base"
                aria-label="Anterior"
            >
                ❮
            </button>

            {/* Listado con scroll horizontal por bloques */}
            <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth px-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {products.slice(0, 10).map((product) => {
                    const msg = encodeURIComponent(`¡Hola! Quisiera consultar stock y detalles del producto: *${product.name}* (Código: ${product.code}) a un precio de $${product.price}.`);
                    const waUrl = `https://wa.me/${whatsappNumber}?text=${msg}`;

                    return (
                        <div key={product.id} className="min-w-[240px] max-w-[240px] bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col hover:shadow-md hover:border-emerald-500 transition-all duration-300 group shrink-0">
                            <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                                <img
                                    src={product.imageUrl || "https://res.cloudinary.com/mfzvsfah/image/upload/v1/sinfoto"}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                />
                            </div>

                            <div className="p-4 flex flex-col flex-grow justify-between space-y-3">
                                <div>
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md inline-block mb-1.5">
                                        {product.category?.name || 'General'}
                                    </span>
                                    <h3 className="font-bold text-stone-900 text-xs line-clamp-2 leading-snug">{product.name}</h3>
                                </div>

                                <div>
                                    <p className="text-emerald-800 font-black text-base mb-3">
                                        $ {Number(product.price || 0).toLocaleString('es-AR')}
                                    </p>

                                    <div className="flex flex-col gap-1.5">
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-xl text-center text-[11px] transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                                        >
                                            💬 Consultar WhatsApp
                                        </a>
                                        <Link
                                            href="/tienda/login"
                                            className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-1.5 px-3 rounded-xl text-center text-[10px] transition"
                                        >
                                            🛒 Iniciar sesión
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Botón Derecho centrado verticalmente con sombra */}
            <button
                onClick={() => scroll('right')}
                className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-stone-200 hover:bg-emerald-50 text-stone-800 w-11 h-11 rounded-full shadow-md transition flex items-center justify-center font-bold cursor-pointer text-base"
                aria-label="Siguiente"
            >
                ❯
            </button>
        </div>
    );
}