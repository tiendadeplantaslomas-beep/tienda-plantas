'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [fechaActual, setFechaActual] = useState('');
    const pathname = usePathname();

    // Verificamos si estamos exactamente en el dashboard (/dashboard)
    const esDashboard = pathname === '/dashboard';

    const usuarioLogueado = {
        nombre: 'Daniel Urraca',
        rol: 'Administrador General',
        sucursal: 'Lomas de Zamora'
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
    }, []);

    return (
        <div className="min-h-screen bg-slate-100/60 text-slate-800 p-2 sm:p-4 flex flex-col justify-between">
            <div className="max-w-7xl mx-auto w-full space-y-2 flex-1 flex flex-col">

                {/* ENCABEZADO GLOBAL */}
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2 px-3 border-b border-slate-200 bg-white rounded-md shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden shadow-2xs flex items-center justify-center shrink-0">
                            <img
                                src="/logo.jpg"
                                alt="Tienda de Plantas"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h1 className="text-xs font-bold text-slate-900 uppercase tracking-wide leading-tight">
                                Tienda de Plantas &mdash; ERP / CRM
                            </h1>
                            <p className="text-[9px] text-slate-500 font-medium">
                                {fechaActual || 'Cargando fecha...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="hidden md:flex flex-col items-end text-right">
                            <span className="text-[11px] font-bold text-slate-800 leading-tight">
                                {usuarioLogueado.nombre}
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">
                                {usuarioLogueado.rol} &bull; {usuarioLogueado.sucursal}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {/* Botón Volver al Dashboard (Oculto si estamos en /dashboard)[cite: 1] */}
                            {!esDashboard && (
                                <Link
                                    href="/dashboard"
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                                >
                                    <span>←</span>
                                    <span>Dashboard</span>
                                </Link>
                            )}

                            <a
                                href="/"
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-all"
                            >
                                <span>🌐</span>
                                <span>Tienda Pública</span>
                            </a>
                        </div>
                    </div>
                </header>

                {/* CONTENIDO DE LAS PÁGINAS */}
                <main className="flex-1 pb-2">
                    {children}
                </main>

            </div>

            {/* PIE DE PÁGINA GLOBAL */}
            <footer className="max-w-7xl mx-auto w-full pt-3 mt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-400 font-medium">
                <div>
                    <span>Tienda de Plantas ERP / CRM &copy; {new Date().getFullYear()}[cite: 1]</span>
                    <span className="hidden sm:inline"> &bull; Todos los derechos reservados[cite: 1]</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>Sistema de Gestión de Vivero[cite: 1]</span>
                    <span>v2.4.0[cite: 1]</span>
                </div>
            </footer>
        </div>
    );
}