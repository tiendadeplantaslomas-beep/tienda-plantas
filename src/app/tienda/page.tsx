// src/app/tienda/page.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProductCarousel from './components/ProductCarousel';
import { X, ShieldCheck, UserCheck, AlertCircle, Tag, MapPin, Sparkles, MessageSquarePlus, Send, Star, ExternalLink } from 'lucide-react';
import CartDrawer from '@/components/CartDrawer';

const BANNERS_PORTADA = [
    {
        id: 1,
        titulo: 'El espacio ideal para tus plantas',
        subtitulo: 'Encontrá variedad, asesoramiento y todo lo necesario para tu jardín y hogar.',
        imagenUrl: 'https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=1600&q=80',
        link: '/tienda?categoria=Plantas de Interior',
        badge: '🌿 Vivero Online'
    },
    {
        id: 2,
        titulo: 'Renová tus espacios verdes',
        subtitulo: 'Especies de interior y exterior seleccionadas con la mejor calidad y vitalidad.',
        imagenUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1600&q=80',
        link: '/tienda?categoria=Plantas de Exterior',
        badge: '✨ Nueva Temporada'
    }
];

const CATEGORIAS_RAPIDAS = [
    { id: 'interior', nombre: 'Plantas de Interior', imagen: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=600&q=80', link: '/tienda?categoria=Plantas de Interior' },
    { id: 'exterior', nombre: 'Plantas de Exterior', imagen: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80', link: '/tienda?categoria=Plantas de Exterior' },
    { id: 'macetas', nombre: 'Macetas y Jardinería', imagen: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80', link: '/tienda?categoria=Macetas' },
    { id: 'sustratos', nombre: 'Sustratos y Abonos', imagen: 'https://images.unsplash.com/photo-1530968461151-8caad5f82025?auto=format&fit=crop&w=600&q=80', link: '/tienda?categoria=Sustratos' },
];

const PROMO_GRADIENTS = [
    "from-emerald-800 to-emerald-950",
    "from-blue-900 to-slate-950",
    "from-amber-700 to-stone-900",
    "from-purple-900 to-indigo-950",
    "from-rose-800 to-stone-950"
];

interface Reseña {
    id: number | string;
    nombre: string;
    comentario: string;
    estrellas: number;
    fecha?: string;
    createdAt?: string;
}

function CountdownTimer({ hasta, onExpire }: { hasta: string; onExpire: () => void }) {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        const targetString = hasta.length === 10 ? `${hasta}T23:59:59` : hasta;
        const targetDate = new Date(targetString).getTime();

        const calculateTime = () => {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                setTimeLeft(null);
                onExpire();
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [hasta, onExpire]);

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200 bg-black/40 px-3 py-1 rounded-lg backdrop-blur-xs w-fit">
            <span>⏱️ Finaliza en:</span>
            {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
            <span>{String(timeLeft.hours).padStart(2, '0')}h</span>:
            <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>:
            <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </div>
    );
}

function TiendaContent() {
    const [products, setProducts] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [currentPromo, setCurrentPromo] = useState(0);
    const WHATSAPP_NUMBER = "5491140782378";

    const searchParams = useSearchParams();
    const categoriaSeleccionada = searchParams.get('categoria');

    const [customer, setCustomer] = useState<{ id: string; name: string; email: string } | null>(null);
    const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [claimLoading, setClaimLoading] = useState(false);
    const [claimMessage, setClaimMessage] = useState('');
    const [claimSuccess, setClaimSuccess] = useState(false);

    // Estados para las reseñas y formulario interactivo
    const [reseñas, setReseñas] = useState<Reseña[]>([]);
    const [showResenaForm, setShowResenaForm] = useState(false);
    const [nombreResena, setNombreResena] = useState('');
    const [comentarioResena, setComentarioResena] = useState('');
    const [estrellasResena, setEstrellasResena] = useState(5);
    const [mensajeResenaExito, setMensajeResenaExito] = useState('');

    const categoriasScrollRef = useRef<HTMLDivElement>(null);

    const fetchPromotions = () => {
        fetch(`/api/promotions?t=${Date.now()}`, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const now = new Date().getTime();
                    const vigentes = data.filter((p: any) => {
                        if (p.activa === false) return false;
                        if (p.stock !== undefined && p.stock <= 0) return false;

                        if (p.hasta) {
                            const hastaStr = p.hasta.length === 10 ? `${p.hasta}T23:59:59` : p.hasta;
                            if (now > new Date(hastaStr).getTime()) return false;
                        }
                        if (p.desde) {
                            const desdeStr = p.desde.length === 10 ? `${p.desde}T00:00:00` : p.desde;
                            if (now < new Date(desdeStr).getTime()) return false;
                        }
                        return true;
                    });
                    setPromotions(vigentes);
                }
            })
            .catch(() => console.log('Error cargando promociones'));
    };

    const fetchReseñas = () => {
        fetch('/api/resenas')
            .then((res) => res.json())
            .then((data) => {
                const items = Array.isArray(data) ? data : (data.resenas || data.data || []);
                if (items.length > 0) {
                    setReseñas(items);
                } else {
                    setReseñas([
                        { id: 1, nombre: 'Sofía Martínez', comentario: 'Me ayudaron a elegir exactamente las especies que necesitaba para mi balcón con sombra. ¡Super recomendados!', estrellas: 5, fecha: 'Hace 2 días' },
                        { id: 2, nombre: 'Javier Rodríguez', comentario: 'Tienen una variedad increíble de sustratos y macetas. Compré y llegó todo impecable.', estrellas: 5, fecha: 'Hace 1 semana' },
                        { id: 3, nombre: 'Lucía Gómez', comentario: 'Excelente atención y asesoramiento botánico. Mis plantas de interior están hermosas.', estrellas: 4, fecha: 'Hace 2 semanas' },
                    ]);
                }
            })
            .catch(() => {
                setReseñas([
                    { id: 1, nombre: 'Sofía Martínez', comentario: 'Me ayudaron a elegir exactamente las especies que necesitaba para mi balcón con sombra. ¡Super recomendados!', estrellas: 5, fecha: 'Hace 2 días' },
                    { id: 2, nombre: 'Javier Rodríguez', comentario: 'Tienen una variedad increíble de sustratos y macetas. Compré y llegó todo impecable.', estrellas: 5, fecha: 'Hace 1 semana' },
                    { id: 3, nombre: 'Lucía Gómez', comentario: 'Excelente atención y asesoramiento botánico. Mis plantas de interior están hermosas.', estrellas: 4, fecha: 'Hace 2 semanas' },
                ]);
            });
    };

    useEffect(() => {
        fetchReseñas();
        fetchPromotions();

        fetch('/api/products')
            .then((res) => res.json())
            .then((data) => {
                const items = Array.isArray(data) ? data : (data.productos || data.data || []);
                setProducts(items);
            })
            .catch((err) => console.log('Error cargando productos:', err));

        const savedCustomer = localStorage.getItem('customer_session') || localStorage.getItem('customer');
        if (savedCustomer) {
            try {
                setCustomer(JSON.parse(savedCustomer));
            } catch (e) {
                console.error('Error al leer la sesión del cliente', e);
            }
        }
    }, []);

    // Carrusel automático para Banners
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % BANNERS_PORTADA.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    // Carrusel automático para Promociones
    useEffect(() => {
        if (promotions.length <= 1) return;
        const promoTimer = setInterval(() => {
            setCurrentPromo((prev) => {
                const next = (prev + 1) % promotions.length;
                if (next === 0) fetchPromotions();
                return next;
            });
        }, 5000);
        return () => clearInterval(promoTimer);
    }, [promotions.length]);

    const handleRemoveExpiredPromo = (id: number | string) => {
        setPromotions((prev) => prev.filter((p) => p.id !== id));
    };

    const scrollCategorias = (direccion: 'left' | 'right') => {
        if (categoriasScrollRef.current) {
            const { scrollLeft, clientWidth } = categoriasScrollRef.current;
            const scrollAmount = clientWidth * 0.75;
            categoriasScrollRef.current.scrollTo({
                left: direccion === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleOpenPromoModal = (promo: any) => {
        setSelectedPromo(promo);
        setClaimMessage('');
        setClaimSuccess(false);
        setIsModalOpen(true);
    };

    const handleClaimPromotion = async () => {
        if (!customer || !selectedPromo) return;

        setClaimLoading(true);
        setClaimMessage('');

        try {
            const res = await fetch('/api/promotions/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    promotionId: selectedPromo.id
                })
            });

            const data = await res.json();

            if (res.ok) {
                setClaimSuccess(true);
                setClaimMessage('¡Promoción guardada en tu perfil con éxito! Ya podés usarla.');
            } else {
                setClaimMessage(data.error || 'No se pudo adquirir la promoción.');
            }
        } catch (err) {
            console.error('Error:', err);
            setClaimMessage('Error de conexión con el servidor.');
        } finally {
            setClaimLoading(false);
        }
    };

    const handleRedirectLogin = () => {
        window.location.href = '/tienda/login';
    };

    const handleSubmitResena = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombreResena.trim() || !comentarioResena.trim()) return;

        try {
            const res = await fetch('/api/resenas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nombreResena,
                    comentario: comentarioResena,
                    estrellas: estrellasResena
                })
            });

            if (res.ok) {
                setMensajeResenaExito('¡Gracias por dejarnos tu opinión!');
                setNombreResena('');
                setComentarioResena('');
                setEstrellasResena(5);
                setShowResenaForm(false);
                fetchReseñas();
                setTimeout(() => setMensajeResenaExito(''), 4000);
            }
        } catch (error) {
            console.error('Error al enviar reseña:', error);
        }
    };

    const productosDestacados = products.filter(
        (p) => p.destacado === true || p.destacado === 1 || p.destacado === 'true'
    );

    const productosFiltrados = categoriaSeleccionada
        ? products.filter((p) => {
            const rawCat = p.categoria || p.category || '';
            let catProd = '';

            if (typeof rawCat === 'string') {
                catProd = rawCat;
            } else if (typeof rawCat === 'object' && rawCat !== null) {
                catProd = rawCat.nombre || rawCat.name || rawCat.descripcion || '';
            } else {
                catProd = String(rawCat);
            }

            const catProdLower = catProd.toLowerCase().trim();
            const catSelLower = String(categoriaSeleccionada).toLowerCase().trim();

            const keywordsMap: { [key: string]: string[] } = {
                'interior': ['interior', 'plantas de interior'],
                'exterior': ['exterior', 'plantas de exterior'],
                'macetas': ['maceta', 'jardineria', 'macetas y jardinería'],
                'sustratos': ['sustrato', 'abono', 'sustratos y abonos', 'tierra']
            };

            if (catProdLower === catSelLower || catProdLower.includes(catSelLower) || catSelLower.includes(catProdLower)) {
                return true;
            }

            for (const [key, aliases] of Object.entries(keywordsMap)) {
                if (catSelLower.includes(key)) {
                    return aliases.some(alias => catProdLower.includes(alias));
                }
            }

            return false;
        })
        : productosDestacados;

    return (
        <div className="h-full w-full overflow-y-auto flex flex-col bg-stone-50 text-stone-800 font-sans pr-1">
            {/* Estilos para el carrusel continuo tipo marquesina */}
            <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    display: flex;
                    width: max-content;
                    animation: marquee 35s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>

            {/* 1. HERO / BANNER PRINCIPAL */}
            <section className="relative w-full h-[420px] md:h-[480px] shrink-0 overflow-hidden bg-stone-900 shadow-md">
                {BANNERS_PORTADA.map((banner, index) => (
                    <div
                        key={banner.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                        <div className="absolute inset-0 z-0">
                            <img src={banner.imagenUrl} alt={banner.titulo} className="w-full h-full object-cover opacity-60 scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                        </div>
                        <div className="relative z-20 max-w-5xl mx-auto h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
                            <span className="bg-emerald-600/90 text-white text-[11px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm border border-emerald-400/30">
                                {banner.badge}
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                                {banner.titulo}
                            </h1>
                            <p className="text-stone-200 text-sm md:text-base max-w-xl font-medium drop-shadow">
                                {banner.subtitulo}
                            </p>
                            <Link
                                href={banner.link}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 inline-block mt-2"
                            >
                                Ver Colección ➔
                            </Link>
                        </div>
                    </div>
                ))}

                <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-2">
                    {BANNERS_PORTADA.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentBanner(idx)}
                            className={`h-2 rounded-full transition-all ${idx === currentBanner ? 'w-8 bg-emerald-400' : 'w-2 bg-white/50'}`}
                            aria-label={`Slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </section>

            {/* 2. CARRUSEL DE CATEGORÍAS */}
            <section className="max-w-7xl w-full mx-auto px-6 py-10 shrink-0">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-xl font-black text-stone-900 tracking-tight">Comprá por Categoría</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Explorá nuestras secciones y encontrá lo que buscas</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => scrollCategorias('left')} className="bg-white hover:bg-emerald-50 text-stone-700 border border-stone-200 p-2 rounded-xl shadow-xs transition cursor-pointer">❮</button>
                        <button onClick={() => scrollCategorias('right')} className="bg-white hover:bg-emerald-50 text-stone-700 border border-stone-200 p-2 rounded-xl shadow-xs transition cursor-pointer">❯</button>
                    </div>
                </div>

                <div ref={categoriasScrollRef} className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth snap-x">
                    {CATEGORIAS_RAPIDAS.map((cat) => (
                        <Link
                            key={cat.id}
                            href={cat.link}
                            className={`min-w-[240px] max-w-[260px] bg-white rounded-2xl p-4 shadow-sm border transition group shrink-0 snap-start ${categoriaSeleccionada?.toLowerCase() === cat.nombre.toLowerCase() ? 'border-emerald-600 ring-2 ring-emerald-500/30' : 'border-stone-200/80 hover:border-emerald-500 hover:shadow-md'}`}
                        >
                            <div className="w-full h-32 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                                <img src={cat.imagen} alt={cat.nombre} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-stone-900 group-hover:text-emerald-700">{cat.nombre}</h4>
                                <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Explorar sección ➔</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* 3. CARRUSEL ROTATIVO DE PROMOCIONES VIGENTES */}
            {promotions.length > 0 && (
                <section className="max-w-7xl w-full mx-auto px-6 py-6 shrink-0">
                    <div className="relative overflow-hidden rounded-3xl shadow-md">
                        {promotions.map((promo, idx) => {
                            const gradientClass = PROMO_GRADIENTS[idx % PROMO_GRADIENTS.length];
                            const isActiveSlide = idx === currentPromo;

                            return (
                                <div
                                    key={promo.id}
                                    className={`relative overflow-hidden p-6 md:p-8 text-white transition-opacity duration-700 ease-in-out flex flex-col md:flex-row items-center justify-between gap-6 ${isActiveSlide ? 'block opacity-100 z-10' : 'hidden opacity-0 z-0'
                                        } ${!promo.imagenUrl ? `bg-gradient-to-r ${gradientClass}` : 'bg-stone-900'}`}
                                    style={
                                        promo.imagenUrl
                                            ? {
                                                backgroundImage: `url(${promo.imagenUrl})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }
                                            : undefined
                                    }
                                >
                                    {promo.imagenUrl && (
                                        <div className="absolute inset-0 bg-black/50 z-0"></div>
                                    )}

                                    <div className="relative z-10 space-y-2.5 text-center md:text-left">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                            <span className="bg-amber-400 text-stone-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                                🔥 {promo.badge || 'Oferta Especial'}
                                            </span>
                                            {promo.stock !== undefined && (
                                                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                                                    📦 Quedan: {promo.stock}
                                                </span>
                                            )}
                                            {promo.productos && promo.productos.length > 0 && (
                                                <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                                                    🌿 Incluye {promo.productos.length} prod.
                                                </span>
                                            )}
                                            {promo.hasta && (
                                                <CountdownTimer
                                                    hasta={promo.hasta}
                                                    onExpire={() => handleRemoveExpiredPromo(promo.id)}
                                                />
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight drop-shadow-md">{promo.titulo}</h3>
                                        {promo.descripcion && (
                                            <p className="text-xs text-stone-100 max-w-lg drop-shadow">{promo.descripcion}</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleOpenPromoModal(promo)}
                                        className="relative z-10 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-md transition shrink-0 inline-block text-center whitespace-nowrap cursor-pointer"
                                    >
                                        Aprovechar Promo ➔
                                    </button>
                                </div>
                            );
                        })}

                        {promotions.length > 1 && (
                            <div className="absolute bottom-3 right-6 z-20 flex gap-1.5 bg-black/30 px-3 py-1 rounded-full backdrop-blur-xs">
                                {promotions.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPromo(idx)}
                                        className={`h-1.5 rounded-full transition-all ${idx === currentPromo ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/60'}`}
                                        aria-label={`Promo ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 4. SECCIÓN DE PRODUCTOS */}
            <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-stone-200 pb-3 gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-stone-900 tracking-tight">
                                {categoriaSeleccionada ? `🌿 Categoría: ${categoriaSeleccionada}` : '✨ Productos Destacados'}
                            </h2>
                            {categoriaSeleccionada && (
                                <Link
                                    href="/tienda"
                                    className="text-[10px] bg-stone-200 hover:bg-stone-300 text-stone-700 px-2.5 py-1 rounded-full font-bold transition"
                                >
                                    Limpiar filtro ✕
                                </Link>
                            )}
                        </div>
                        <p className="text-xs text-stone-500">
                            {categoriaSeleccionada ? `Mostrando artículos para ${categoriaSeleccionada}` : 'Selección especial de especies destacadas de la temporada'}
                        </p>
                    </div>
                    {!categoriaSeleccionada && (
                        <Link href="/tienda/catalogo" className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl transition shadow-xs">
                            Ver catálogo completo ➔
                        </Link>
                    )}
                </div>

                {productosFiltrados.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
                        <p className="text-stone-500 text-xs font-medium">
                            {categoriaSeleccionada
                                ? 'No hay productos en esta categoría por el momento.'
                                : 'No hay productos marcados como destacados actualmente. Marcá algunos desde tu panel.'}
                        </p>
                        {categoriaSeleccionada && (
                            <Link href="/tienda" className="inline-block bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs">
                                Volver al inicio
                            </Link>
                        )}
                    </div>
                ) : (


                    <ProductCarousel products={productosFiltrados} whatsappNumber={WHATSAPP_NUMBER} />
                )}
            </section>

            {/* 5 y 6. SECCIÓN AGRUPADA: QUIÉNES SOMOS Y UBICACIÓN CON GOOGLE MAPS */}
            <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                    {/* Quiénes Somos */}
                    <div className="bg-emerald-900 text-white rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
                            <Sparkles className="w-80 h-80" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <span className="bg-emerald-800 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                🌱 Nuestra Pasión
                            </span>
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                ¿Quiénes Somos?
                            </h2>
                            <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
                                En <strong className="text-white">Tienda de Plantas</strong> nos dedicamos con amor y profesionalismo al cultivo, comercialización y asesoramiento de especies de interior y exterior. Nuestro objetivo es llevar vida, color y naturaleza a cada rincón de tu hogar, brindándote la mejor atención y accesorios para que tu jardín luzca increíble.
                            </p>
                        </div>
                        <div className="pt-6 relative z-10">
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs border border-emerald-600"
                            >
                                Contactar por Asesoramiento ➔
                            </a>
                        </div>
                    </div>

                    {/* Ubicación y Mapa Google Maps */}
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs uppercase tracking-wider">
                                <MapPin className="w-4 h-4" />
                                Punto de Encuentro & Retiro
                            </div>
                            <h3 className="text-xl font-bold text-stone-900">¿Dónde encontrarnos?</h3>
                            <p className="text-stone-600 text-xs md:text-sm leading-relaxed">
                                Nos encontramos en <strong className="text-stone-800">Pedro Mascagni 316, 1832, Lomas de Zamora, Buenos Aires</strong>. Podes pasar a retirar tus ejemplares sin cargo coordinando previamente.
                            </p>
                        </div>

                        {/* Mapa embebido de Google Maps */}
                        <div className="w-full h-44 rounded-2xl overflow-hidden border border-stone-200 relative bg-stone-100">
                            <iframe
                                title="Ubicación Tienda de Plantas"
                                src="https://maps.google.com/maps?q=Pedro+Mascagni+316,+1832,+Lomas+de+Zamora,+Buenos+Aires&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={false}
                                loading="lazy"
                            ></iframe>
                        </div>

                        <div className="pt-1">
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=Pedro+Mascagni+316,+1832,+Lomas+de+Zamora,+Buenos+Aires"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                                <ExternalLink className="w-4 h-4 text-emerald-400" />
                                Cómo llegar en Google Maps
                            </a>
                        </div>
                    </div>

                </div>
            </section>

            {/* 7. SECCIÓN DE RESEÑAS CON FILTRO DE SESIÓN Y RESPUESTA DE LA TIENDA */}
            <section className="max-w-7xl w-full mx-auto px-6 py-10 shrink-0 border-t border-stone-200 mt-auto space-y-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs">
                    <div>
                        <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider">Comunidad Verde</span>
                        <h2 className="text-xl font-black text-stone-900 tracking-tight">Lo que dicen nuestros clientes</h2>
                        <p className="text-xs text-stone-500 mt-0.5">Experiencias reales de quienes confían en nuestro vivero</p>
                    </div>
                    <button
                        onClick={() => setShowResenaForm(!showResenaForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition cursor-pointer border border-emerald-200"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                        {showResenaForm ? 'Cerrar formulario' : 'Dejar mi opinión'}
                    </button>
                </div>

                {mensajeResenaExito && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl p-3 font-medium text-center">
                        {mensajeResenaExito}
                    </div>
                )}

                {/* Formulario condicionado al login */}
                {showResenaForm && (
                    <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-3 max-w-xl mx-auto animate-in fade-in">
                        {customer ? (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!comentarioResena.trim()) return;

                                try {
                                    const res = await fetch('/api/resenas', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            nombre: customer.name || 'Cliente Verificado',
                                            comentario: comentarioResena,
                                            estrellas: estrellasResena,
                                            customerId: customer.id
                                        })
                                    });

                                    if (res.ok) {
                                        setMensajeResenaExito('¡Gracias por dejarnos tu opinión!');
                                        setComentarioResena('');
                                        setEstrellasResena(5);
                                        setShowResenaForm(false);
                                        fetchReseñas();
                                        setTimeout(() => setMensajeResenaExito(''), 4000);
                                    }
                                } catch (error) {
                                    console.error('Error al enviar reseña:', error);
                                }
                            }} className="space-y-3">
                                <div className="flex items-center justify-between text-xs bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-800">
                                    <span>✍️ Comentando como: <strong>{customer.name || customer.email}</strong></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-stone-700">Calificación:</span>
                                    <select
                                        value={estrellasResena}
                                        onChange={(e) => setEstrellasResena(Number(e.target.value))}
                                        className="px-3 py-1 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none"
                                    >
                                        <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
                                        <option value={4}>⭐⭐⭐⭐ (Muy bueno)</option>
                                        <option value={3}>⭐⭐⭐ (Bueno)</option>
                                        <option value={2}>⭐⭐ (Regular)</option>
                                        <option value={1}>⭐ (Malo)</option>
                                    </select>
                                </div>
                                <textarea
                                    value={comentarioResena}
                                    onChange={(e) => setComentarioResena(e.target.value)}
                                    placeholder="Contanos tu experiencia con las plantas o atención..."
                                    required
                                    rows={2}
                                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    >
                                        <Send className="w-3 h-3" /> Publicar Reseña
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-4 space-y-3">
                                <p className="text-xs text-stone-600">Debes iniciar sesión con tu cuenta para poder dejar una reseña y garantizar opiniones reales.</p>
                                <button
                                    onClick={() => window.location.href = '/tienda/login'}
                                    className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer inline-block"
                                >
                                    Iniciar Sesión / Registrarse ➔
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* CARRUSEL CONTINUO (MARQUEE) CON RESPUESTA DE LA TIENDA */}
                <div className="w-full overflow-hidden relative py-2">
                    <div className="animate-marquee flex gap-5">
                        {[...reseñas, ...reseñas].map((res, index) => (
                            <div key={`${res.id}-${index}`} className="w-[300px] md:w-[340px] bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between shrink-0">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-amber-400">
                                            {Array.from({ length: res.estrellas || 5 }).map((_, i) => (
                                                <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-stone-400">{res.fecha || 'Reciente'}</span>
                                    </div>
                                    <p className="text-xs text-stone-700 italic">&ldquo;{res.comentario}&rdquo;</p>

                                    {/* Si la tienda respondió, se muestra acá */}
                                    {res.respuesta && (
                                        <div className="bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-xl space-y-1 mt-2">
                                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wide block">
                                                🌱 Tienda de Plantas respondió:
                                            </span>
                                            <p className="text-[11px] text-stone-700 font-medium">
                                                {res.respuesta}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-[10px]">
                                    <span className="font-bold text-stone-900 uppercase">{res.nombre}</span>
                                    <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">Verificado ✓</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* MODAL DE ADQUISICIÓN Y VALIDACIÓN */}
            {isModalOpen && selectedPromo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl space-y-4 text-slate-800 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full bg-slate-100 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {selectedPromo.imagenUrl && (
                            <img
                                src={selectedPromo.imagenUrl}
                                alt={selectedPromo.titulo}
                                className="w-full h-36 object-cover rounded-xl border border-slate-100"
                            />
                        )}

                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="bg-amber-100 text-stone-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                    {selectedPromo.badge || 'PROMO'}
                                </span>
                                {selectedPromo.stock !== undefined && (
                                    <span className="text-[10px] font-bold text-slate-500">
                                        Disponibles: {selectedPromo.stock} un.
                                    </span>
                                )}
                            </div>
                            <h3 className="text-base font-extrabold text-slate-900">{selectedPromo.titulo}</h3>
                            <p className="text-xs text-slate-600 mt-1">{selectedPromo.descripcion || 'Beneficio exclusivo para clientes registrados.'}</p>
                        </div>

                        {selectedPromo.productos && selectedPromo.productos.length > 0 && (
                            <div className="border border-slate-200/80 bg-slate-50/80 rounded-xl p-3 space-y-2">
                                <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                                    Productos incluidos ({selectedPromo.productos.length}):
                                </h4>
                                <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-slate-200/50 pr-1">
                                    {selectedPromo.productos.map((prod: any) => (
                                        <div key={prod.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                                            <span className="font-medium text-slate-800 truncate pr-2">
                                                {prod.nombre}
                                            </span>
                                            <span className="font-bold text-emerald-700 shrink-0">
                                                ${prod.precio?.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {claimMessage && (
                            <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${claimSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                <span>{claimMessage}</span>
                            </div>
                        )}

                        {selectedPromo.stock === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Esta promoción se ha agotado por completo.</span>
                            </div>
                        ) : customer ? (
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Conectado como: <strong className="text-slate-700">{customer.name || customer.email}</strong></span>
                                </div>

                                {!claimSuccess ? (
                                    <button
                                        onClick={handleClaimPromotion}
                                        disabled={claimLoading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                                    >
                                        {claimLoading ? 'Registrando en tu cuenta...' : 'Adquirir y Guardar Beneficio'}
                                    </button>
                                ) : (
                                    <a
                                        href={selectedPromo.linkWhatsapp || `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`¡Hola! Ya adquirí la promo ${selectedPromo.titulo} en mi cuenta y quiero canjearla.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
                                    >
                                        Canjear por WhatsApp ahora 📱
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3 pt-2 border-t">
                                <p className="text-xs text-slate-600">Iniciá sesión para guardar esta promoción en tu perfil.</p>
                                <button
                                    onClick={handleRedirectLogin}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                                >
                                    Iniciar Sesión / Registrarse ➔
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TiendaPage() {
    return (
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-stone-50 text-stone-500">Cargando tienda...</div>}>
            <TiendaContent />
            <CartDrawer whatsappNumber="5491140782378" />
        </Suspense>
    );
}