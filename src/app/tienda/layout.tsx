// src/app/tienda/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, Store, ArrowLeft, ShoppingBag } from 'lucide-react';

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
    const [fechaActual, setFechaActual] = useState('');
    const [customer, setCustomer] = useState<any>(null);
    const [cartCount, setCartCount] = useState(0);
    const pathname = usePathname();
    const router = useRouter();

    const esPerfil = pathname === '/tienda/perfil';
    const esCarrito = pathname === '/tienda/carrito';

    useEffect(() => {
        // Fecha actual
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const fechaStr = hoy.toLocaleDateString('es-AR', opciones);
        setFechaActual(fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1));

        // Cliente logueado
        const data = localStorage.getItem('customer');
        if (data) {
            try { setCustomer(JSON.parse(data)); } catch (e) { console.error(e); }
        }

        // Función para calcular la cantidad de ítems en el carrito
        const actualizarContadorCarrito = () => {
            const cartData = localStorage.getItem('cart');
            if (cartData) {
                try {
                    const items = JSON.parse(cartData);
                    // Sumar las cantidades de cada producto
                    const totalItems = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
                    setCartCount(totalItems);
                } catch (e) {
                    setCartCount(0);
                }
            } else {
                setCartCount(0);
            }
        };

        actualizarContadorCarrito();

        // Escuchar cambios en el carrito si se actualiza desde otra pestaña o componente
        window.addEventListener('storage', actualizarContadorCarrito);
        window.addEventListener('cartUpdated', actualizarContadorCarrito);

        return () => {
            window.removeEventListener('storage', actualizarContadorCarrito);
            window.removeEventListener('cartUpdated', actualizarContadorCarrito);
        };
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('customer');
        setCustomer(null);
        router.push('/tienda/login');
    };

    return (
        <div
            className="h-screen w-screen text-slate-800 flex flex-col items-center overflow-hidden p-2 bg-cover bg-center font-sans"
            style={{
                backgroundImage: "linear-gradient(rgba(241, 245, 249, 0.70), rgba(241, 245, 249, 0.70)), url('/FONDO.jpg')"
            }}
        >
            <div className="w-full max-w-7xl h-full flex flex-col justify-between overflow-hidden gap-1">

                {/* ENCABEZADO GLOBAL */}
                <header className="w-full shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2 px-3 border border-slate-200/80 bg-white/85 backdrop-blur-xs rounded-md shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden shadow-2xs flex items-center justify-center shrink-0">
                            <img src="/logo.jpg" alt="Tienda de Plantas" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-xs font-bold text-slate-900 uppercase tracking-wide leading-tight">
                                Tienda de Plantas &mdash; Área de Clientes
                            </h1>
                            <p className="text-[9px] text-slate-500 font-medium">
                                {fechaActual || 'Cargando fecha...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        {customer && (
                            <div className="hidden md:flex flex-col items-end text-right">
                                <span className="text-[11px] font-bold text-slate-800 leading-tight">{customer.name}</span>
                                <span className="text-[9px] text-emerald-600 font-medium">Cliente Registrado</span>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5">
                            {/* Botón Catálogo / Volver */}
                            {esPerfil || esCarrito ? (
                                <Link
                                    href="/tienda"
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    <span>Catálogo</span>
                                </Link>
                            ) : (
                                <Link
                                    href="/tienda"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                                >
                                    <Store className="w-3 h-3" />
                                    <span>Tienda</span>
                                </Link>
                            )}

                            {/* Botón Carrito con Contador Badge */}
                            {!esCarrito && (
                                <Link
                                    href="/tienda/carrito"
                                    className="relative px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                                >
                                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Carrito</span>
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                                            {cartCount}
                                        </span>
                                    )}
                                </Link>
                            )}

                            {/* Botón Mi Perfil o Ingresar */}
                            {customer ? (
                                <>
                                    {!esPerfil && (
                                        <Link
                                            href="/tienda/perfil"
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                                        >
                                            <User className="w-3 h-3" />
                                            <span>Mi Perfil</span>
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        title="Cerrar sesión"
                                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                        <LogOut className="w-3 h-3" />
                                        <span>Salir</span>
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/tienda/login"
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                                >
                                    <User className="w-3 h-3" />
                                    <span>Ingresar</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* CONTENIDO PRINCIPAL */}
                <main className="w-full flex-1 min-h-0 flex flex-col overflow-hidden relative">
                    {children}
                </main>

                {/* PIE DE PÁGINA GLOBAL */}
                <footer className="w-full shrink-0 py-1 px-3 border border-slate-200/80 bg-white/85 backdrop-blur-xs rounded-md shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-500 font-medium">
                    <div>
                        <span>Tienda de Plantas &copy; {new Date().getFullYear()}</span>
                        <span className="hidden sm:inline"> &bull; Todos los derechos reservados</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Canal de Compras Directas</span>
                        <span className="font-bold text-emerald-700">v1.0.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}