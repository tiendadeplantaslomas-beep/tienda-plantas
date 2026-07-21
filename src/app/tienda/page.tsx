"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, LogOut, ShoppingBag, Search } from 'lucide-react';

const CATALOGO_PUBLICO = [
    { id: 1, codigo: 'ART-001', nombre: 'FICUS LYRATA M18', categoria: 'INTERIOR', precio: 14500, stock: true },
    { id: 2, codigo: 'ART-002', nombre: 'ALOCASIA POLLY', categoria: 'INTERIOR', precio: 9800, stock: true },
    { id: 3, codigo: 'ART-003', nombre: 'SUSTRATO PREPARADO 10L', categoria: 'INSUMOS', precio: 4500, stock: true },
];

export default function TiendaPage() {
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (!role) router.push('/login');
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('user_role');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-stone-50 p-6 text-stone-800 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Cabecera */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-700 rounded-lg text-white">
                            <Leaf className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-stone-900">Catálogo del Vivero</h1>
                            <p className="text-xs text-stone-500">Módulo de Clientes</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-stone-200 hover:bg-stone-300 px-3 py-2 rounded-lg text-stone-700 transition cursor-pointer"
                    >
                        <LogOut className="h-4 w-4" /> Salir
                    </button>
                </div>

                {/* Catálogo de Productos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {CATALOGO_PUBLICO.map((p) => (
                        <div key={p.id} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-3 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-stone-400 font-mono">{p.codigo}</span>
                                <h3 className="font-bold text-stone-900 text-base">{p.nombre}</h3>
                                <span className="inline-block mt-1 bg-stone-100 text-stone-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    {p.categoria}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                                <span className="text-lg font-bold font-mono text-emerald-800">${p.precio.toLocaleString('es-AR')}</span>
                                <button className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition cursor-pointer">
                                    <ShoppingBag className="h-3.5 w-3.5" /> Consultar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}