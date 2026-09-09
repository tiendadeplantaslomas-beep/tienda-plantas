'use client';
import { useRef } from 'react';
import Link from 'next/link';

export default function ProductCarousel({ products, whatsappNumber }: { products: any[], whatsappNumber: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const offset = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative">
            {/* Flechas de navegación del carrusel */}
            <div className="absolute -top-14 right-0 flex gap-2">
                <button
                    onClick={() => scroll('left')}
                    className="bg-white border border-stone-200 hover:bg-emerald-50 text-stone-700 w-9 h-9 rounded-full shadow-xs transition flex items-center justify-center font-bold"
                    aria-label="Anterior"
                >
                    ◀
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="bg-white border border-stone-200 hover:bg-emerald-50 text-stone-700 w-9 h-9 rounded-full shadow-xs transition flex items-center justify-center font-bold"
                    aria-label="Siguiente"
                >
                    ▶
                </button>
            </div>

            {/* Listado con scroll horizontal (hasta 10 productos) */}
            <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {products.slice(0, 10).map((product) => {
                    const msg = encodeURIComponent(`¡Hola! Quisiera consultar stock y detalles del producto: *${product.name}* (Código: ${product.code}) a un precio de $${product.price}.`);
                    const waUrl = `https://wa.me/${whatsappNumber}?text=${msg}`;

                    return (
                        <div key={product.id} className="min-w-[260px] max-w-[260px] bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col hover:shadow-lg hover:border-emerald-300 transition group flex-shrink-0">
                            <div className="relative h-48 w-full bg-stone-50 flex items-center justify-center p-4 overflow-hidden border-b border-stone-100">
                                <img
                                    src={product.imageUrl || "https://res.cloudinary.com/mfzvsfah/image/upload/v1/sinfoto"}
                                    alt={product.name}
                                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                                />
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-max mb-2">
                                    {product.category?.name || 'General'}
                                </span>
                                <h3 className="font-bold text-stone-800 text-sm mb-2 line-clamp-2 leading-snug">{product.name}</h3>
                                <p className="text-emerald-700 font-black text-lg mb-4">$ {product.price}</p>

                                <div className="mt-auto flex flex-col gap-2">
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded-xl text-center text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        💬 Consultar por WhatsApp
                                    </a>
                                    <Link
                                        href="/tienda/login"
                                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-1.5 px-3 rounded-xl text-center text-xs transition"
                                    >
                                        🛒 Iniciar sesión para comprar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}