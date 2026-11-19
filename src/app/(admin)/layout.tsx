'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const [fechaActual, setFechaActual] = useState('');
    const [userName, setUserName] = useState('Personal Interno');
    const [userRole, setUserRole] = useState('CAJERO');
    const pathname = usePathname();
    const router = useRouter();

    const esDashboard = pathname === '/dashboard';

    useEffect(() => {
        // 1. Cargar fecha actual
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const fechaStr = hoy.toLocaleDateString('es-AR', opciones);
        setFechaActual(fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1));

        // 2. Cargar datos reales del usuario desde localStorage
        const storedName = localStorage.getItem('user_name');
        const storedRole = localStorage.getItem('user_role');

        if (storedName) setUserName(storedName);
        if (storedRole) setUserRole(storedRole.toUpperCase());
    }, []);

    const handleLogout = () => {
        // 1. Destruimos las cookies del servidor (sesión y email)
        document.cookie = "erp_session_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "erp_user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // 2. Limpieza total y forzada del localStorage específico del ERP
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_role');
        localStorage.clear();

        // 3. Redirección limpia bloqueando el botón atrás
        router.replace('/login');
        router.refresh();
    };

    return (
        <div
            className="h-screen w-screen text-slate-800 flex flex-col items-center overflow-hidden p-2 bg-cover bg-center"
            style={{
                backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.88)), url('/FONDO.jpg')"
            }}
        >
            <div className="w-full max-w-7xl h-full flex flex-col justify-between overflow-hidden gap-1">

                {/* ENCABEZADO GLOBAL */}
                <header className="w-full shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2 px-3 border border-slate-200 bg-white/90 backdrop-blur-xs rounded-md shadow-2xs">
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
                                {userName}
                            </span>
                            <span className="text-[9px] text-emerald-700 font-bold">
                                Rol: {userRole} &bull; Lomas de Zamora
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
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
                            <button
                                onClick={handleLogout}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold rounded shadow-2xs transition-all cursor-pointer font-bold"
                                title="Cerrar Sesión"
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                </header>

                {/* CONTENIDO PRINCIPAL */}
                <main className="w-full flex-1 min-h-0 flex flex-col overflow-hidden relative">
                    {children}
                </main>

                {/* PIE DE PÁGINA GLOBAL */}
                <footer className="w-full shrink-0 py-1 px-3 border border-slate-200 bg-white/90 backdrop-blur-xs rounded-md shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-500 font-medium">
                    <div>
                        <span>Tienda de Plantas ERP / CRM &copy; {new Date().getFullYear()}</span>
                        <span className="hidden sm:inline"> &bull; Todos los derechos reservados</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Sistema de Gestión de Vivero</span>
                        <span className="font-bold text-slate-700">v2.5.0 RBAC</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </SessionProvider>
    );
}