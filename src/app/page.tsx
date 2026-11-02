// src/app/tienda/page.tsx
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProductCarousel from '@/app/tienda/components/ProductCarousel';
import { X, ShieldCheck, UserCheck, AlertCircle, Tag, MapPin, Sparkles, MessageSquarePlus, Send, Star, ExternalLink } from 'lucide-react';
import CartDrawer from '@/components/CartDrawer';

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
    respuesta?: string;
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
    const [banners, setBanners] = useState<any[]>([]);
    const [cargandoBanners, setCargandoBanners] = useState(true);
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

    const [reseñas, setReseñas] = useState<Reseña[]>([]);
    const [showResenaForm, setShowResenaForm] = useState(false);
    const [comentarioResena, setComentarioResena] = useState('');
    const [estrellasResena, setEstrellasResena] = useState(5);
    const [mensajeResenaExito, setMensajeResenaExito] = useState('');

    // Refs declarados correctamente al nivel superior del componente
    const categoriasScrollRef = useRef<HTMLDivElement>(null);
    const promosScrollRef = useRef<HTMLDivElement>(null);

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

    const fetchBanners = () => {
        setCargandoBanners(true);
        fetch(`/api/banners?t=${Date.now()}`, { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setBanners(data);
                }
            })
            .catch(() => console.log('Error cargando banners'))
            .finally(() => setCargandoBanners(false));
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
        fetchBanners();

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

    // SEPARACIÓN DINÁMICA DE BANNERS POR SECCIÓN DEL CMS (Solo activos)
    const bannersHero = banners.filter((b: any) => b.activo !== false && (!b.seccion || b.seccion === 'hero' || b.seccion === 'Hero / Banner Principal'));
    const bannersPromos = banners.filter((b: any) => b.activo !== false && (b.seccion === 'promociones' || b.seccion === 'Sección de Promociones'));
    const bannersCategoriasCMS = banners.filter((b: any) => b.activo !== false && (b.seccion === 'categorias' || b.seccion === 'Carrusel de Categorías'));
    const bannersInstitucional = banners.filter((b: any) => b.activo !== false && (b.seccion === 'institucional' || b.seccion === 'Bloque Institucional'));

    const listaCategoriasTienda = bannersCategoriasCMS;

    useEffect(() => {
        if (bannersHero.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % bannersHero.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [bannersHero.length]);

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

    const scrollPromos = (direccion: 'left' | 'right') => {
        if (promosScrollRef.current) {
            const { scrollLeft, clientWidth } = promosScrollRef.current;
            const offset = direccion === 'left' ? -clientWidth / 2 : clientWidth / 2;
            promosScrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
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

        // Filtrar los banners de la barra de beneficios desde el CMS
    const bannersBeneficios = banners.filter(
        (b: any) => b.activo !== false && (b.seccion === 'beneficios' || b.seccion === 'Barra de Beneficios')
    );

    return (
        <div className="h-full w-full overflow-y-auto flex flex-col bg-stone-50 text-stone-800 font-sans pr-1">
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

            {/* 1. HERO / BANNER PRINCIPAL DINÁMICO */}
            <section className="relative w-full h-[420px] md:h-[480px] shrink-0 overflow-hidden bg-stone-900 shadow-md">
                {cargandoBanners ? (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs">
                        Cargando portadas...
                    </div>
                ) : bannersHero.length === 0 ? (
                    <div className="absolute inset-0 opacity-100 z-10">
                        <div className="absolute inset-0 z-0">
                            <img src="https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&w=1200&q=80" alt="Tienda de Plantas" className="w-full h-full object-cover opacity-60 scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                        </div>
                        <div className="relative z-20 max-w-5xl mx-auto h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
                            <span className="bg-emerald-600/90 text-white text-[11px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm border border-emerald-400/30">
                                🌱 Bienvenidos
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                                Dale vida a tu hogar con nuestras plantas
                            </h1>
                            <p className="text-stone-200 text-sm md:text-base max-w-xl font-medium drop-shadow">
                                Explorá nuestro catálogo de especies de interior, exterior y accesorios de jardinería.
                            </p>
                            <Link
                                href="/tienda/catalogo"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 inline-block mt-2"
                            >
                                Ver Catálogo ➔
                            </Link>
                        </div>
                    </div>
                ) : (
                    bannersHero.map((banner, index) => (
                        <div
                            key={banner.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                        >
                            <div className="absolute inset-0 z-0">
                                <img src={banner.imagenUrl} alt={banner.titulo} className="w-full h-full object-cover opacity-60 scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                            </div>
                            <div className="relative z-20 max-w-5xl mx-auto h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
                                {banner.badge && (
                                    <span className="bg-emerald-600/90 text-white text-[11px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm border border-emerald-400/30">
                                        {banner.badge}
                                    </span>
                                )}
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                                    {banner.titulo}
                                </h1>
                                {banner.subtitulo && (
                                    <p className="text-stone-200 text-sm md:text-base max-w-xl font-medium drop-shadow">
                                        {banner.subtitulo}
                                    </p>
                                )}
                                {banner.link && (
                                    <Link
                                        href={banner.link}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 inline-block mt-2"
                                    >
                                        Ver Colección ➔
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {!cargandoBanners && bannersHero.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-2">
                        {bannersHero.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentBanner(idx)}
                                className={`h-2 rounded-full transition-all ${idx === currentBanner ? 'w-8 bg-emerald-400' : 'w-2 bg-white/50'}`}
                                aria-label={`Slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </section>

           {/* 2. CARRUSEL DE CATEGORÍAS */}
            {listaCategoriasTienda.length > 0 && (
                <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-xl font-black text-stone-900 tracking-tight">Comprá por Categoría</h2>
                            <p className="text-xs text-stone-500 mt-0.5">Explorá nuestras secciones y encontrá lo que buscas</p>
                        </div>
                    </div>

                    <div className="relative group bg-stone-100/80 border border-stone-200/60 rounded-3xl p-6 shadow-xs">
                        <button
                            onClick={() => scrollCategorias('left')}
                            className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-stone-200 hover:bg-emerald-50 text-stone-800 w-11 h-11 rounded-full shadow-md transition flex items-center justify-center font-bold cursor-pointer text-base"
                            aria-label="Anterior"
                        >
                            ❮
                        </button>

                        <div ref={categoriasScrollRef} className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth snap-x px-2">
                            {listaCategoriasTienda.map((cat: any) => {
                                const nombreCat = cat.titulo || cat.name || cat.nombre;
                                const imagenCat = cat.imagenUrl || cat.imagen || '/sinfoto.png';
                                const linkCat = cat.link || `/tienda?categoria=${encodeURIComponent(nombreCat)}`;
                                const isSelected = categoriaSeleccionada?.toLowerCase() === nombreCat.toLowerCase();

                                return (
                                    <Link
                                        key={cat.id || nombreCat}
                                        href={linkCat}
                                        className={`min-w-[220px] max-w-[220px] bg-white rounded-2xl p-3 shadow-sm border transition-all duration-300 group/card shrink-0 snap-start flex flex-col justify-between ${isSelected ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md' : 'border-stone-200/80 hover:border-emerald-500 hover:shadow-md'}`}
                                    >
                                        <div className="w-full h-28 rounded-xl overflow-hidden bg-stone-100 border border-stone-100 shrink-0">
                                            <img src={imagenCat} alt={nombreCat} className="w-full h-full object-cover group-hover/card:scale-105 transition duration-500" />
                                        </div>
                                        <div className="pt-2.5 flex flex-col justify-between flex-1">
                                            <div>
                                                <h4 className="text-xs font-bold text-stone-900 group-hover/card:text-emerald-700 truncate">{nombreCat}</h4>
                                                {cat.subtitulo && <p className="text-[10px] text-stone-500 truncate mt-0.5">{cat.subtitulo}</p>}
                                            </div>
                                            <span className="text-[11px] text-emerald-600 font-semibold mt-2 inline-block">Explorar sección ➔</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => scrollCategorias('right')}
                            className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-stone-200 hover:bg-emerald-50 text-stone-800 w-11 h-11 rounded-full shadow-md transition flex items-center justify-center font-bold cursor-pointer text-base"
                            aria-label="Siguiente"
                        >
                            ❯
                        </button>
                    </div>
                </section>
            )}

            {/* 3. BARRA DE BENEFICIOS Y CONFIANZA DINÁMICA */}
            <section className="max-w-7xl w-full mx-auto px-6 py-6 shrink-0">
                <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center divide-y md:divide-y-0 md:divide-x divide-stone-100">
                    {/* Tramo 1: Medios de Pago */}
                    {(() => {
                        const item = bannersBeneficios.find((b: any) => b.titulo === 'Medios de Pago');
                        return (
                            <div className="flex items-center gap-4 pt-4 md:pt-0">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-lg overflow-hidden">
                                    {item?.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-cover" /> : <span>{item?.badge || '💳'}</span>}
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">{item?.titulo || 'Medios de pago'}</h4>
                                    <p className="text-[11px] text-stone-500 font-medium">{item?.subtitulo || 'Tarjetas, efectivo y transferencias.'}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Tramo 2: Contactanos */}
                    {(() => {
                        const item = bannersBeneficios.find((b: any) => b.titulo === 'Contactanos');
                        return (
                            <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-6">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-lg overflow-hidden">
                                    {item?.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-cover" /> : <span>{item?.badge || '📞'}</span>}
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">{item?.titulo || 'Contactanos'}</h4>
                                    <p className="text-[11px] text-stone-500 font-medium">{item?.subtitulo || 'Asesoramiento al 11-4078-2378'}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Tramo 3: Envíos Programados */}
                    {(() => {
                        const item = bannersBeneficios.find((b: any) => b.titulo === 'Envíos Programados');
                        return (
                            <div className="flex items-center gap-4 pt-4 md:pt-0 md:pl-6">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-lg overflow-hidden">
                                    {item?.imagenUrl ? <img src={item.imagenUrl} alt="" className="w-full h-full object-cover" /> : <span>{item?.badge || '🚚'}</span>}
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wide">{item?.titulo || 'Envíos Programados'}</h4>
                                    <p className="text-[11px] text-stone-500 font-medium">{item?.subtitulo || 'Entregas programables en la zona.'}</p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </section>

            {/* 4. SECCIÓN DE PROMOCIONES Y OFERTAS VIGENTES */}
            {(promotions.length > 0 || bannersPromos.length > 0) && (
                <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                                🔥 Promociones y Ofertas Imperdibles
                            </h2>
                            <p className="text-xs text-stone-500 mt-0.5">Beneficios exclusivos y descuentos especiales de temporada</p>
                        </div>
                    </div>

                    <div className="relative group bg-stone-100/80 border border-stone-200/60 rounded-3xl p-6 shadow-xs">
                        <button
                            onClick={() => scrollPromos('left')}
                            className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-stone-200 hover:bg-emerald-50 text-stone-800 w-11 h-11 rounded-full shadow-md transition flex items-center justify-center font-bold cursor-pointer text-base"
                            aria-label="Anterior"
                        >
                            ❮
                        </button>

                        <div
                            ref={promosScrollRef}
                            className="flex gap-5 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth px-2"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {/* Banners de Promociones del CMS */}
                            {bannersPromos.map((bp: any) => (
                                <div
                                    key={`banner-${bp.id}`}
                                    className="relative rounded-2xl overflow-hidden shadow-sm border border-stone-200 p-4 text-white bg-stone-900 flex flex-col justify-between min-w-[280px] max-w-[280px] h-44 shrink-0 transition-all hover:shadow-md"
                                    style={{ backgroundImage: `url(${bp.imagenUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-0"></div>
                                    <div className="relative z-10 space-y-1">
                                        {bp.badge && <span className="bg-amber-400 text-stone-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">{bp.badge}</span>}
                                        <h3 className="text-sm font-black leading-snug">{bp.titulo}</h3>
                                        {bp.subtitulo && <p className="text-[11px] text-stone-200 line-clamp-1">{bp.subtitulo}</p>}
                                    </div>
                                    <div className="relative z-10 pt-2 mt-auto">
                                        <button
                                            onClick={() => handleOpenPromoModal({
                                                id: bp.id,
                                                titulo: bp.titulo,
                                                descripcion: bp.subtitulo,
                                                imagenUrl: bp.imagenUrl,
                                                badge: bp.badge || 'PROMO'
                                            })}
                                            className="bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-md transition cursor-pointer w-full text-center"
                                        >
                                            Aprovechar ➔
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Promociones Activas de la Base de Datos */}
                            {promotions.map((promo, idx) => {
                                const gradientClass = PROMO_GRADIENTS[idx % PROMO_GRADIENTS.length];

                                return (
                                    <div
                                        key={`promo-${promo.id}`}
                                        className={`relative rounded-2xl overflow-hidden shadow-sm border border-stone-200 p-4 text-white flex flex-col justify-between min-w-[280px] max-w-[280px] h-44 shrink-0 transition-all hover:shadow-md ${!promo.imagenUrl ? `bg-gradient-to-br ${gradientClass}` : 'bg-stone-900'}`}
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
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20 z-0"></div>
                                        )}

                                        <div className="relative z-10 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-amber-400 text-stone-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    {promo.badge || 'Oferta'}
                                                </span>
                                                {promo.stock !== undefined && (
                                                    <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                                                        📦 Quedan: {promo.stock}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-black tracking-tight leading-snug drop-shadow">{promo.titulo}</h3>
                                            {promo.descripcion && (
                                                <p className="text-[11px] text-stone-200 line-clamp-1 drop-shadow">{promo.descripcion}</p>
                                            )}
                                        </div>

                                        <div className="relative z-10 pt-2 flex items-center justify-between border-t border-white/10 mt-auto">
                                            <span className="text-[10px] text-amber-300 font-bold">
                                                {promo.hasta ? '⏱️ Limitado' : '✨ Exclusivo'}
                                            </span>

                                            <button
                                                onClick={() => handleOpenPromoModal(promo)}
                                                className="bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-md transition cursor-pointer"
                                            >
                                                Aprovechar ➔
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => scrollPromos('right')}
                            className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-stone-200 hover:bg-emerald-50 text-stone-800 w-11 h-11 rounded-full shadow-md transition flex items-center justify-center font-bold cursor-pointer text-base"
                            aria-label="Siguiente"
                        >
                            ❯
                        </button>
                    </div>
                </section>
            )}

            {/* 5. SECCIÓN DE PRODUCTOS DESTACADOS / FILTRADOS */}
            <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b border-stone-200 pb-3 gap-4">
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
                        <p className="text-xs text-stone-500 mt-0.5">
                            {categoriaSeleccionada ? `Mostrando artículos para ${categoriaSeleccionada}` : 'Selección especial de especies destacadas de la temporada'}
                        </p>
                    </div>

                    {!categoriaSeleccionada && (
                        /* { */
                        <div className="pt-2 md:pt-0">
                            <Link href="/tienda/catalogo" className="text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl transition shadow-xs inline-flex items-center gap-1">
                                Ver catálogo completo ➔
                            </Link>
                        </div>
                        /* } */
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

            {/* 6. SECCIÓN INSTITUCIONAL Y UBICACIÓN */}
            <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <div
                        className="rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col justify-between text-white"
                        style={bannersInstitucional.length > 0 && bannersInstitucional[0].imagenUrl ? {
                            backgroundImage: `url(${bannersInstitucional[0].imagenUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        } : { backgroundColor: '#064e3b' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-emerald-900/85 to-stone-950/95 z-0"></div>

                        <div className="relative z-10 space-y-4">
                            <span className="bg-emerald-800/90 text-emerald-200 text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider inline-block border border-emerald-700/50 shadow-xs">
                                {bannersInstitucional.length > 0 ? (bannersInstitucional[0].badge || '🌱 Nuestra Pasión') : '🌱 Nuestra Pasión'}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
                                {bannersInstitucional.length > 0 ? bannersInstitucional[0].titulo : '¿Quiénes Somos?'}
                            </h2>
                            <p className="text-emerald-100 text-xs md:text-sm leading-relaxed drop-shadow font-medium">
                                {bannersInstitucional.length > 0 ? bannersInstitucional[0].subtitulo : 'En Tienda de Plantas nos dedicamos con amor y profesionalismo al cultivo, comercialización y asesoramiento de especies de interior y exterior.'}
                            </p>
                        </div>
                        <div className="pt-6 relative z-10">
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md border border-emerald-500/50"
                            >
                                Contactar por Asesoramiento ➔
                            </a>
                        </div>
                    </div>

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

                        <div className="w-full h-44 rounded-2xl overflow-hidden border border-stone-200 relative bg-stone-100">
                            <iframe
                                title="Ubicación Tienda de Plantas"
                                src="https://maps.google.com/maps?q=Pedro+Mascagni+316,+1832,+Lomas+de+Zamora,+Buenos+Aires&t=&z=15&ie=URL&iwloc=&output=embed"
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

            {/* 7. SECCIÓN DE RESEÑAS */}
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
                            <div className="space-y-3 pt-2 border-t border-stone-100">
                                <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-xl border border-stone-200/60 flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Conectado como: <strong className="text-stone-700">{customer.name || customer.email}</strong></span>
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
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-center space-y-3 pt-2 border-t">
                                <p className="text-xs text-stone-600">Iniciá sesión para guardar esta promoción en tu perfil.</p>
                                <button
                                    onClick={handleRedirectLogin}
                                    className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
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