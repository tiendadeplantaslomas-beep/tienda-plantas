'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaf, ShoppingCart, User, Menu, LogOut, Store } from 'lucide-react';

export default function Navbar() {
    const [customer, setCustomer] = useState<any>(null);
    const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null);

    useEffect(() => {
        // 1. Verificamos si hay sesión de personal interno activa
        const adminName = localStorage.getItem('user_name');
        const adminRole = localStorage.getItem('user_role');
        if (adminName && adminRole) {
            setAdminUser({ name: adminName, role: adminRole.toUpperCase() });
            return; // Si es admin/personal interno, priorizamos esta vista
        }

        // 2. Si no es personal interno, leemos el cliente web normal
        const data = localStorage.getItem('customer');
        if (data) {
            try {
                setCustomer(JSON.parse(data));
            } catch (e) {
                console.error("Error al leer el customer del localStorage", e);
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setCustomer(null);
        setAdminUser(null);
        window.location.href = '/login';
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo / Nombre del Negocio */}
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-emerald-800 transition hover:opacity-90">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                    <span className="text-lg tracking-tight font-bold">TIENDA DE PLANTAS — ERP / CRM</span>
                </Link>

                {/* Enlaces de Navegación Condicionales */}
                {!adminUser && (
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
                        <Link href="/tienda/categoria/plantas" className="transition hover:text-emerald-700">Plantas</Link>
                        <Link href="/tienda/categoria/sustratos" className="transition hover:text-emerald-700">Sustratos</Link>
                        <Link href="/tienda/categoria/macetas" className="transition hover:text-emerald-700">Macetas</Link>
                    </nav>
                )}

                {/* Botones de Acción y Perfil */}
                <div className="flex items-center gap-4">

                    {/* Si hay un usuario interno logueado (Admin, Cajero, etc.) */}
                    {adminUser ? (
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <span className="block text-xs font-black uppercase text-stone-900">{adminUser.name}</span>
                                <span className="text-[10px] text-stone-500 font-medium">
                                    Rol: <strong className="text-emerald-700">{adminUser.role}</strong> • Lomas de Zamora
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                title="Cerrar sesión"
                                className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition border border-rose-200 cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    ) : customer ? (
                        /* Si es un cliente web normal */
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-stone-700">
                                Hola, <b>{customer.name.split(' ')[0]}</b>
                            </span>
                            <button
                                onClick={handleLogout}
                                title="Cerrar sesión"
                                className="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="hidden sm:inline">Salir</span>
                            </button>
                        </div>
                    ) : (
                        /* Si nadie está logueado */
                        <Link href="/login" className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 transition">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">Acceso Interno</span>
                        </Link>
                    )}

                </div>

            </div>
        </header>
    );
}