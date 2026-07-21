'use client';

import React from 'react';
import Link from 'next/link';
import { Leaf, ShoppingCart, User, Menu } from 'lucide-react';

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo / Nombre del Negocio */}
                <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-800 transition hover:opacity-90">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                    <span className="text-lg tracking-tight font-bold">Tienda de Plantas Lomas</span>
                </Link>

                {/* Enlaces de Navegación (Categorías rápidas) */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
                    <Link href="/categoria/plantas" className="transition hover:text-emerald-700">Plantas</Link>
                    <Link href="/categoria/sustratos" className="transition hover:text-emerald-700">Sustratos</Link>
                    <Link href="/categoria/macetas" className="transition hover:text-emerald-700">Macetas</Link>
                </nav>

                {/* Botones de Acción (Carrito y Usuario) */}
                <div className="flex items-center gap-4">
                    {/* Botón Carrito */}
                    <button className="relative p-2 text-stone-600 hover:text-emerald-700 transition" aria-label="Ver carrito">
                        <ShoppingCart className="h-5.5 w-5.5" />
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                            0
                        </span>
                    </button>

                    {/* Botón Mi Cuenta */}
                    <Link href="/login" className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 transition">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">Mi Cuenta</span>
                    </Link>

                    {/* Menú Móvil (Hamburguesa para celulares) */}
                    <button className="block md:hidden p-2 text-stone-600 hover:text-emerald-700 transition">
                        <Menu className="h-5.5 w-5.5" />
                    </button>
                </div>

            </div>
        </header>
    );
}