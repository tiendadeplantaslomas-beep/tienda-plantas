'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProductCarousel from './components/ProductCarousel';
import { X, ShieldCheck, UserCheck, AlertCircle, Tag } from 'lucide-react';

const BANNERS_PORTADA = [
    {
        id: 1,
        titulo: 'El espacio ideal para tus plantas',
        subtitulo: 'Encontrá variedad, asesoramiento y todo lo necesario para tu jardín y hogar.',
        imagenUrl: 'https://images.unsplash.com/photo-1470058869958-2a77ade41c02?auto=format&fit=crop&w=1600&q=80',
        link: '/tienda/categoria/interior',
        badge: '🌿 Vivero Online'
    },
    {
        id: 2,
        titulo: 'Renová tus espacios verdes',
        subtitulo: 'Especies de interior y exterior seleccionadas con la mejor calidad y vitalidad.',
        imagenUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1600&q=80',
        link: '/tienda/categoria/exterior',
        badge: '✨ Nueva Temporada'
    }
];

const CATEGORIAS_RAPIDAS = [
    { id: 'interior', nombre: 'Plantas de Interior', imagen: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=600&q=80', link: '/tienda/categoria/interior' },
    { id: 'exterior', nombre: 'Plantas de Exterior', imagen: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80', link: '/tienda/categoria/exterior' },
    { id: 'macetas', nombre: 'Macetas y Jardinería', imagen: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80', link: '/tienda/categoria/macetas' },
    { id: 'sustratos', nombre: 'Sustratos y Abonos', imagen: 'https://images.unsplash.com/photo-1530968461151-8caad5f82025?auto=format&fit=crop&w=600&q=80', link: '/tienda/categoria/sustratos' },
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
    fecha: string;
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

export default function TiendaLandingPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);
    const [currentBanner, setCurrentBanner] = useState(0);
    const [currentPromo, setCurrentPromo] = useState(0);
    const WHATSAPP_NUMBER = "54911XXXXXXXX";

    const [customer, setCustomer] = useState<{ id: string; name: string; email: string } | null>(null);
    const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [claimLoading, setClaimLoading] = useState(false);
    const [claimMessage, setClaimMessage] = useState('');
    const [claimSuccess, setClaimSuccess] = useState(false);

    const [reseñas, setReseñas] = useState<Reseña[]>([
        { id: 1, nombre: 'Sofía Martínez', comentario: 'Me ayudaron a elegir exactamente las especies que necesitaba para mi balcón con sombra. ¡Super recomendados!', estrellas: 5, fecha: 'Hace 2 días' },
        { id: 2, nombre: 'Javier Rodríguez', comentario: 'Tienen una variedad increíble de sustratos y macetas. Compré y llegó todo impecable.', estrellas: 5, fecha: 'Hace 1 semana' },
        { id: 3, nombre: 'Lucía Gómez', comentario: 'Excelente atención y asesoramiento botánico. Mis plantas de interior están hermosas.', estrellas: 4, fecha: 'Hace 2 semanas' },
    ]);

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

    useEffect(() => {
        fetch('/api/resenas')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) setReseñas(data);
            })
            .catch(() => console.log('Usando reseñas locales'));

        fetchPromotions();

        const savedCustomer = localStorage.getItem('customer_session');
        if (savedCustomer) {
            try {
                setCustomer(JSON.parse(savedCustomer));
            } catch (e) {
                console.error('Error al leer la sesión del cliente', e);
            }
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % BANNERS_PORTADA.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (promotions.length <= 1) return;
        const promoTimer = setInterval(() => {
            setCurrentPromo((prev) => {
                const next = (prev + 1) % promotions.length;
                if (next === 0) {
                    fetchPromotions();
                }
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
                setClaimMessage(data.error || 'No se pudo adquirir la promoción. Recordá que no son acumulativas o puede haberse agotado el stock.');
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

    return (
        <div className="h-full w-full overflow-y-auto flex flex-col bg-stone-50 text-stone-800 font-sans pr-1">

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
                            className="min-w-[240px] max-w-[260px] bg-white rounded-2xl p-4 shadow-sm border border-stone-200/80 flex flex-col items-center text-center gap-3 hover:border-emerald-500 hover:shadow-md transition group shrink-0 snap-start"
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
                                            {/* Indicador de productos en pila */}
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

            {/* 4. PRODUCTOS DESTACADOS */}
            <section className="max-w-7xl w-full mx-auto px-6 py-8 shrink-0">
                <div className="flex justify-between items-center mb-6 border-b border-stone-200 pb-3">
                    <div>
                        <h2 className="text-xl font-black text-stone-900 tracking-tight">✨ Productos Destacados</h2>
                        <p className="text-xs text-stone-500">Novedades y especies más buscadas de la temporada</p>
                    </div>
                    <Link href="/tienda/categoria/interior" className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl transition shadow-xs">
                        Ver catálogo completo ➔
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 shadow-xs">
                        <p className="text-stone-500 text-xs font-medium">No hay productos en esta sección por el momento. ¡Pronto agregaremos más novedades!</p>
                    </div>
                ) : (


                    <ProductCarousel products={products} whatsappNumber={WHATSAPP_NUMBER} />
                )}
            </section>

            {/* MODAL DE ADQUISICIÓN Y VALIDACIÓN */}
            {isModalOpen && selectedPromo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-800 max-h-[90vh] overflow-y-auto">
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
                            <p className="text-xs text-slate-600 mt-1">{selectedPromo.descripcion || 'Beneficio exclusivo para clientes registrados. No acumulable.'}</p>
                        </div>

                        {/* PILA DE PRODUCTOS INCLUIDOS EN LA PROMO */}
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
                                <span>Esta promoción se ha agotado por completo. ¡Atento a las próximas ofertas!</span>
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
                                <p className="text-xs text-slate-700 font-medium">
                                    Para adquirir esta promoción y guardarla en tu perfil, necesitás iniciar sesión. Recordá que solo podés tener una promo activa a la vez.
                                </p>
                                <button
                                    onClick={handleRedirectLogin}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                                >
                                    Ingresar / Registrarme
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}