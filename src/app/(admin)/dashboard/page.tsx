"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Leaf, Package, DollarSign, FileText, AlertTriangle,
    LogOut, ShoppingCart, Users, Layers, TrendingUp
} from 'lucide-react';

export default function AdminDashboardPage() {
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState(false);

    // Protección de ruta a nivel cliente
    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role !== 'ADMIN') {
            router.push('/login');
        } else {
            setIsLoaded(true);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('user_role');
        router.push('/login');
    };

    // Previene el parpadeo de pantalla mientras verifica autenticación
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-stone-100 flex items-center justify-center">
                <p className="text-stone-500 font-medium">Cargando panel de control...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-100 text-stone-800 p-6 space-y-6">
            {/* ENCABEZADO */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-700 text-white rounded-xl shadow">
                        <Leaf className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-900">Panel General - Vivero</h1>
                        <p className="text-xs text-stone-500">Gestión administrativa y comercial</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                </button>
            </div>

            {/* TARJETAS DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase">Ventas del Día</p>
                        <h3 className="text-2xl font-bold text-stone-900">$45.800</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase">Stock Crítico</p>
                        <h3 className="text-2xl font-bold text-amber-600">8 Ítems</h3>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase">Órdenes Activas</p>
                        <h3 className="text-2xl font-bold text-stone-900">12</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <ShoppingCart className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase">Proveedores</p>
                        <h3 className="text-2xl font-bold text-stone-900">5</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Users className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {/* ACCESOS RÁPIDOS A MÓDULOS */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">Módulos de Trabajo</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => router.push('/ventas')}
                        className="p-4 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50 text-left transition space-y-2 group cursor-pointer"
                    >
                        <DollarSign className="h-6 w-6 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <p className="font-semibold text-stone-800">Punto de Venta (POS)</p>
                        <p className="text-xs text-stone-500">Registrar ventas en mostrador</p>
                    </button>

                    <button
                        onClick={() => router.push('/stock')}
                        className="p-4 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50 text-left transition space-y-2 group cursor-pointer"
                    >
                        <Package className="h-6 w-6 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <p className="font-semibold text-stone-800">Control de Stock</p>
                        <p className="text-xs text-stone-500">Ajustes e inventario de plantas</p>
                    </button>

                    <button
                        onClick={() => router.push('/compras')}
                        className="p-4 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50 text-left transition space-y-2 group cursor-pointer"
                    >
                        <FileText className="h-6 w-6 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <p className="font-semibold text-stone-800">Gestión de Compras</p>
                        <p className="text-xs text-stone-500">Ingreso de lotes e insumos</p>
                    </button>

                    <button
                        onClick={() => router.push('/vivero')}
                        className="p-4 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50 text-left transition space-y-2 group cursor-pointer"
                    >
                        <Layers className="h-6 w-6 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <p className="font-semibold text-stone-800">Módulo Vivero</p>
                        <p className="text-xs text-stone-500">Especies, macetas y sustratos</p>
                    </button>
                </div>
            </div>
        </div>
    );
}