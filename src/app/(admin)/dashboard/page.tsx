"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState(false);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('ADMIN');
    const [userName, setUserName] = useState<string>('Daniel Urraca');

    useEffect(() => {
        const role = localStorage.getItem('user_role') || 'ADMIN';
        const name = localStorage.getItem('user_name') || 'Daniel Urraca';

        if (role !== 'ADMIN' && role !== 'CAJERO') {
            router.push('/login');
        } else {
            setUserRole(role);
            setUserName(name);
            setIsLoaded(true);
            const savedPhoto = localStorage.getItem('user_avatar');
            if (savedPhoto) setUserPhoto(savedPhoto);
        }
    }, [router]);

    const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Photo = reader.result as string;
                setUserPhoto(base64Photo);
                localStorage.setItem('user_avatar', base64Photo);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        router.push('/login');
    };

    if (!isLoaded) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[200px]">
                <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest animate-pulse">
                    Cargando Panel...
                </p>
            </div>
        );
    }

    const esAdmin = userRole === 'ADMIN';
    // Alturas de barras normalizadas y seguras para evitar que pisen los textos
    const datosVentas = esAdmin
        ? [
            { mes: 'Mar', monto: '$1.2M', altura: 'h-10', valor: 1.2 },
            { mes: 'Abr', monto: '$1.5M', altura: 'h-14', valor: 1.5 },
            { mes: 'May', monto: '$1.4M', altura: 'h-12', valor: 1.4 },
            { mes: 'Jun', monto: '$1.9M', altura: 'h-20', valor: 1.9 },
            { mes: 'Jul', monto: '$2.2M', altura: 'h-24', valor: 2.2 },
            { mes: 'Ago', monto: '$2.4M', altura: 'h-28', valor: 2.4 },
        ]
        : [
            { mes: 'Mar', monto: '$0.3M', altura: 'h-6', valor: 0.3 },
            { mes: 'Abr', monto: '$0.4M', altura: 'h-8', valor: 0.4 },
            { mes: 'May', monto: '$0.4M', altura: 'h-8', valor: 0.4 },
            { mes: 'Jun', monto: '$0.6M', altura: 'h-12', valor: 0.6 },
            { mes: 'Jul', monto: '$0.7M', altura: 'h-14', valor: 0.7 },
            { mes: 'Ago', monto: '$0.8M', altura: 'h-16', valor: 0.8 },
        ];

    const totalPeriodo = esAdmin ? '$10.6M' : '$3.2M (Personal)';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 max-w-7xl mx-auto text-slate-800 pb-1 items-stretch">

            {/* COLUMNA PRINCIPAL IZQUIERDA (8 COLUMNAS) */}
            <div className="lg:col-span-8 flex flex-col gap-2">

                {/* MÓDULOS DEL SISTEMA */}
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 px-0.5">
                        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                            Módulos del Sistema {esAdmin ? '(Administración General)' : '(Terminal de Caja)'}
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {esAdmin && (
                            <Link href="/productos" className="bg-white p-2 rounded-md border border-emerald-500/70 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between group ring-1 ring-emerald-500/10 min-h-[60px]">
                                <div className="space-y-0.5">
                                    <span className="text-[8px] font-bold text-emerald-700 uppercase">Inventario</span>
                                    <h3 className="text-[12px] font-bold text-emerald-900 leading-tight">Catálogo de Productos</h3>
                                    <p className="text-[9px] text-slate-500 line-clamp-1">Precios, marcas y costos.</p>
                                </div>
                                <span className="text-emerald-600 font-bold text-[10px] self-end">→</span>
                            </Link>
                        )}

                        <Link href="/vivero" className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[60px]">
                            <div className="space-y-0.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Botánico</span>
                                <h3 className="text-[12px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Gestión de Vivero</h3>
                                <p className="text-[9px] text-slate-500 line-clamp-1">Especies, sustratos e insumos.</p>
                            </div>
                            <span className="text-emerald-600 font-bold text-[10px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>

                        <Link href="/ventas" className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[60px]">
                            <div className="space-y-0.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Mostrador</span>
                                <h3 className="text-[12px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Punto de Venta (POS)</h3>
                                <p className="text-[9px] text-slate-500 line-clamp-1">Facturación rápida.</p>
                            </div>
                            <span className="text-emerald-600 font-bold text-[10px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>

                        {esAdmin && (
                            <>
                                <Link href="/stock" className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[60px]">
                                    <div className="space-y-0.5">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Operaciones</span>
                                        <h3 className="text-[12px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Control de Stock</h3>
                                        <p className="text-[9px] text-slate-500 line-clamp-1">Ajustes e ingresos.</p>
                                    </div>
                                    <span className="text-emerald-600 font-bold text-[10px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </Link>

                                <Link href="/caja" className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[60px]">
                                    <div className="space-y-0.5">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Tesorería</span>
                                        <h3 className="text-[12px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Arqueo & Caja</h3>
                                        <p className="text-[9px] text-slate-500 line-clamp-1">Cierres de turno.</p>
                                    </div>
                                    <span className="text-emerald-600 font-bold text-[10px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </Link>

                                <Link href="/compras" className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[60px]">
                                    <div className="space-y-0.5">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Abastecimiento</span>
                                        <h3 className="text-[12px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Compras & Proveedores</h3>
                                        <p className="text-[9px] text-slate-500 line-clamp-1">Órdenes de compra.</p>
                                    </div>
                                    <span className="text-emerald-600 font-bold text-[10px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* EVOLUCIÓN DE VENTAS */}
                <div className="bg-white border border-slate-200/80 rounded-md shadow-2xs p-3 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-3 bg-emerald-600 rounded-xs"></span>
                            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                {esAdmin ? 'Evolución de Ventas Global — Últimos 6 Meses' : `Rendimiento de Ventas (${userName}) — Últimos 6 Meses`}
                            </h3>
                        </div>
                        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            +14.2% vs período anterior
                        </span>
                    </div>

                    {/* Gráfico optimizado con separación superior generosa para evitar solapamientos */}
                    <div className="grid grid-cols-6 gap-3 items-end h-48 pt-12 pb-1 px-2 my-auto">
                        {datosVentas.map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center justify-end h-full relative">
                                <span className="text-[10px] font-extrabold text-slate-800 mb-2 whitespace-nowrap">
                                    {item.monto}
                                </span>
                                <div className={`w-full bg-emerald-${idx === 5 ? '700 shadow-2xs' : (idx > 2 ? '600' : '400')} rounded-t-xs ${item.altura}`}></div>
                                <span className="text-[10px] font-bold text-slate-700 mt-2">
                                    {item.mes}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 pt-2.5 mt-1 border-t border-slate-100 px-1 gap-1">
                        <span className="font-semibold">Facturación estimada mensual</span>
                        <span className="font-extrabold text-slate-900 text-[11px]">Total período: {totalPeriodo}</span>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA (4 COLUMNAS) */}
            <div className="lg:col-span-4 flex flex-col gap-2">

                {/* PERFIL DE USUARIO Y PENDIENTES */}
                <div className="bg-white border border-slate-200/80 rounded-md shadow-2xs p-2.5 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                            Usuario Activo
                        </h3>
                        <button
                            onClick={handleLogout}
                            className="text-[9px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </div>

                    <div className="flex items-center gap-2.5 py-1">
                        <div className="relative group shrink-0">
                            {userPhoto ? (
                                <img
                                    src={userPhoto}
                                    alt="Usuario"
                                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-black text-xs flex items-center justify-center tracking-wider border border-slate-300">
                                    {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <label
                                htmlFor="avatar-upload"
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[8px] font-bold text-white text-center"
                                title="Cambiar Foto"
                            >
                                📷
                            </label>
                            <input id="avatar-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <h4 className="text-[12px] font-bold text-slate-900 truncate">{userName}</h4>
                            <p className="text-[9px] font-semibold text-slate-500">{esAdmin ? 'Administrador General' : 'Cajero / Operador'}</p>
                            <label htmlFor="avatar-upload" className="text-[8px] font-bold text-emerald-600 hover:underline cursor-pointer inline-block pt-0.5">
                                Cambiar foto de perfil
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-200/60">
                            <span className="font-bold text-slate-400 block text-[9px] uppercase">Sucursal</span>
                            <span className="font-bold text-slate-700 truncate block">Lomas de Zamora</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded border border-slate-200/60">
                            <span className="font-bold text-slate-400 block text-[9px] uppercase">Legajo</span>
                            <span className="font-bold text-slate-700 block">{esAdmin ? 'ADM-001' : 'CAJ-042'}</span>
                        </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 space-y-1">
                        <p className="text-[10px] font-bold-black text-slate-400 uppercase tracking-wider">
                            Pendientes del Turno
                        </p>

                        <Link href="/caja" className="flex items-center justify-between text-[9px] p-1.5 bg-slate-50 hover:bg-amber-50/60 rounded border border-slate-200/60 transition-colors group">
                            <span className="font-semibold text-slate-700 group-hover:text-amber-900">⌛ Cierre de Caja</span>
                            <span className="font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded border border-amber-200">
                                Pendiente →
                            </span>
                        </Link>

                        {esAdmin && (
                            <Link href="/stock" className="flex items-center justify-between text-[9px] p-1.5 bg-slate-50 hover:bg-emerald-50/60 rounded border border-slate-200/60 transition-colors group">
                                <span className="font-semibold text-slate-700 group-hover:text-emerald-900">✓ Recepción Insumos</span>
                                <span className="font-bold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded border border-emerald-200">
                                    Listo →
                                </span>
                            </Link>
                        )}

                        <Link href="/stock" className="flex items-center justify-between text-[9px] p-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200/60 transition-colors group">
                            <span className="font-semibold text-slate-700">📅 Arqueo de Stock</span>
                            <span className="font-bold text-slate-500 bg-slate-200 px-1 py-0.5 rounded">
                                18:00 Hs →
                            </span>
                        </Link>
                    </div>
                </div>

                {/* RESUMEN OPERATIVO CENTRAL */}
                <div className="bg-white border border-slate-200/80 rounded-md shadow-2xs p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-2">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-3 bg-emerald-600 rounded-xs"></span>
                                <h2 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                    Resumen Operativo Central
                                </h2>
                            </div>
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                OK
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            <Link href="/ventas" className="bg-slate-50 hover:bg-slate-100/80 p-2 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Facturas</span>
                                <div className="flex items-baseline justify-between mt-2">
                                    <span className="text-xs font-black text-slate-900">{esAdmin ? '3' : '1'}</span>
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded">Cobrar →</span>
                                </div>
                            </Link>

                            {esAdmin && (
                                <>
                                    <Link href="/compras" className="bg-slate-50 hover:bg-slate-100/80 p-2 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Pedidos</span>
                                        <div className="flex items-baseline justify-between mt-2">
                                            <span className="text-xs font-bold text-slate-900">5</span>
                                            <span className="text-[9px] font-bold text-sky-800 bg-sky-100 px-1 py-0.5 rounded">Camino →</span>
                                        </div>
                                    </Link>

                                    <Link href="/compras" className="bg-slate-50 hover:bg-slate-100/80 p-2 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Remitos</span>
                                        <div className="flex items-baseline justify-between mt-2">
                                            <span className="text-xs font-black text-slate-900">2</span>
                                            <span className="text-[9px] font-bold text-purple-800 bg-purple-100 px-1 py-0.5 rounded">Validar →</span>
                                        </div>
                                    </Link>
                                </>
                            )}

                            <Link href="/stock" className="bg-slate-50 hover:bg-slate-100/80 p-2 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Stock Bajo</span>
                                <div className="flex items-baseline justify-between mt-2">
                                    <span className="text-xs font-black text-slate-900">4</span>
                                    <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1 py-0.5 rounded">Alerta →</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="pt-2 text-center text-[8px] text-slate-400 uppercase tracking-wider font-semibold">
                        Sistema Sincronizado &bull; Turno Activo
                    </div>
                </div>

            </div>

        </div>
    );
}