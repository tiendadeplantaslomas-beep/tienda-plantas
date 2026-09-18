'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDashboardStats, getSalesEvolution } from '@/actions/dashboard-actions';

interface VentaMes {
    mes: string;
    montoTexto: string;
    valorNumerico: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [isLoaded, setIsLoaded] = useState(false);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('ADMIN');
    const [userName, setUserName] = useState<string>('Daniel Urraca');

    const [datosVentas, setDatosVentas] = useState<VentaMes[]>([]);
    const [totalPeriodo, setTotalPeriodo] = useState<string>('$0');
    const [loadingVentas, setLoadingVentas] = useState<boolean>(true);

    const [stats, setStats] = useState({
        stockBajo: 0,
        facturasPendientes: 0,
        pedidosCamino: 0,
        remitosValidar: 0,
        resenasPendientes: 0
    });

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

            cargarDatosReales(role);
        }
    }, [router]);

    const cargarDatosReales = async (role: string) => {
        setLoadingVentas(true);
        try {
            const [metricasOp, ventasRes] = await Promise.all([
                getDashboardStats(),
                getSalesEvolution(role)
            ]);

            setStats(metricasOp);
            setDatosVentas(ventasRes.datosVentas);
            setTotalPeriodo(ventasRes.totalPeriodo);
        } catch (error) {
            console.error('Error al cargar datos del dashboard:', error);
        } finally {
            setLoadingVentas(false);
        }
    };

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
            <div className="p-4 flex items-center justify-center min-h-[200px] bg-stone-100">
                <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest animate-pulse">
                    Cargando Panel...
                </p>
            </div>
        );
    }

    const esAdmin = userRole === 'ADMIN';
    const hayResenasPendientes = stats.resenasPendientes > 0;

    return (
        <div className="bg-stone-100 h-screen w-full flex flex-col overflow-hidden text-slate-800 p-1.5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 w-full flex-1 min-h-0 overflow-hidden">

                {/* COLUMNA PRINCIPAL IZQUIERDA (8 COLUMNAS) */}
                <div className="lg:col-span-8 flex flex-col gap-1.5 h-full overflow-hidden">

                    {/* MÓDULOS DEL SISTEMA */}
                    <div className="space-y-1 shrink-0">
                        <div className="flex items-center gap-1.5 px-0.5">
                            <h1 className="text-[11px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
                                Módulos del Sistema {esAdmin ? '(Administración General)' : '(Terminal de Caja)'}
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                            {esAdmin && (
                                <Link href="/productos" className="bg-white p-1.5 rounded-md border border-emerald-500/70 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between group ring-1 ring-emerald-500/10 min-h-[50px]">
                                    <div className="space-y-0.2">
                                        <span className="text-[7px] font-bold text-emerald-700 uppercase">Inventario</span>
                                        <h3 className="text-[10px] font-bold text-emerald-900 leading-tight">Catálogo de Productos</h3>
                                        <p className="text-[8px] text-slate-500 line-clamp-1">Precios, marcas y costos.</p>
                                    </div>
                                    <span className="text-emerald-600 font-bold text-[9px] self-end">→</span>
                                </Link>
                            )}

                            <Link href="/vivero" className="bg-white p-1.5 rounded-md border border-slate-200/80 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[50px]">
                                <div className="space-y-0.2">
                                    <span className="text-[7px] font-bold text-slate-400 uppercase">Botánico</span>
                                    <h3 className="text-[10px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Gestión de Vivero</h3>
                                    <p className="text-[8px] text-slate-500 line-clamp-1">Especies, sustratos e insumos.</p>
                                </div>
                                <span className="text-emerald-600 font-bold text-[9px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </Link>

                            <Link href="/ventas" className="bg-white p-1.5 rounded-md border border-slate-200/80 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[50px]">
                                <div className="space-y-0.2">
                                    <span className="text-[7px] font-bold text-slate-400 uppercase">Mostrador</span>
                                    <h3 className="text-[10px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Punto de Venta (POS)</h3>
                                    <p className="text-[8px] text-slate-500 line-clamp-1">Facturación rápida.</p>
                                </div>
                                <span className="text-emerald-600 font-bold text-[9px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </Link>

                            {esAdmin && (
                                <>
                                    <Link href="/stock" className="bg-rose-50/90 hover:bg-rose-100/80 p-1.5 rounded border border-rose-300 flex flex-col justify-between transition-all group shadow-xs min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-extrabold text-rose-800 uppercase tracking-tight">Stock Bajo</span>
                                            <div className="flex items-baseline justify-between mt-0.5">
                                                <span className="text-[11px] font-black text-slate-900">{stats.stockBajo}</span>
                                                <span className="text-[8px] font-bold text-rose-900 bg-rose-200 px-1 py-0.2 rounded">Alerta →</span>
                                            </div>
                                        </div>
                                    </Link>

                                    <Link href="/caja" className="bg-white p-1.5 rounded-md border border-slate-200/80 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase">Tesorería</span>
                                            <h3 className="text-[10px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Arqueo & Caja</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Cierres de turno.</p>
                                        </div>
                                        <span className="text-emerald-600 font-bold text-[9px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                    </Link>

                                    <Link href="/compras" className="bg-white p-1.5 rounded-md border border-slate-200/80 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase">Abastecimiento</span>
                                            <h3 className="text-[10px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Compras & Proveedores</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Órdenes de compra.</p>
                                        </div>
                                        <span className="text-emerald-600 font-bold text-[9px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                    </Link>

                                    <Link href="/clientes" className="bg-white p-1.5 rounded-md border border-slate-200/80 shadow-xs hover:border-emerald-600 transition-all flex flex-col justify-between group min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase">CRM / Contactos</span>
                                            <h3 className="text-[10px] font-bold text-slate-900 group-hover:text-emerald-700 leading-tight">Gestión de Clientes</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Base de datos y perfiles.</p>
                                        </div>
                                        <span className="text-emerald-600 font-bold text-[9px] self-end opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                    </Link>

                                    {/* MÓDULOS DE MARKETING, CMS Y COMUNIDAD */}
                                    <Link href="/portada" className="bg-white p-1.5 rounded-md border border-sky-500/60 shadow-xs hover:border-sky-600 transition-all flex flex-col justify-between group ring-1 ring-sky-500/10 min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-sky-700 uppercase">Tienda Web</span>
                                            <h3 className="text-[10px] font-bold text-sky-900 leading-tight">Imágenes de Portada</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Banners y hero section.</p>
                                        </div>
                                        <span className="text-sky-600 font-bold text-[9px] self-end">→</span>
                                    </Link>

                                    <Link href="/promociones" className="bg-white p-1.5 rounded-md border border-amber-500/60 shadow-xs hover:border-amber-600 transition-all flex flex-col justify-between group ring-1 ring-amber-500/10 min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-amber-700 uppercase">Comercial</span>
                                            <h3 className="text-[10px] font-bold text-amber-900 leading-tight">Promociones & Cupones</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Descuentos y ofertas.</p>
                                        </div>
                                        <span className="text-amber-600 font-bold text-[9px] self-end">→</span>
                                    </Link>

                                    <Link href="/campañas" className="bg-white p-1.5 rounded-md border border-purple-500/60 shadow-xs hover:border-purple-600 transition-all flex flex-col justify-between group ring-1 ring-purple-500/10 min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-purple-700 uppercase">Marketing</span>
                                            <h3 className="text-[10px] font-bold text-purple-900 leading-tight">Campañas Especiales</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Eventos y temporadas.</p>
                                        </div>
                                        <span className="text-purple-600 font-bold text-[9px] self-end">→</span>
                                    </Link>

                                    {/* MÓDULO DE MODERACIÓN DE RESEÑAS CON ALERTA DINÁMICA */}
                                    <Link
                                        href="/resenas"
                                        className={`p-1.5 rounded-md border transition-all flex flex-col justify-between group min-h-[50px] ${hayResenasPendientes
                                            ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-500/25 hover:border-amber-500 shadow-xs'
                                            : 'bg-white border-emerald-500/60 ring-1 ring-emerald-500/10 hover:border-emerald-600 shadow-xs'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.2">
                                                <span className={`text-[7px] font-bold uppercase ${hayResenasPendientes ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                    Comunidad
                                                </span>
                                                <h3 className={`text-[10px] font-bold leading-tight ${hayResenasPendientes ? 'text-amber-900' : 'text-emerald-900'}`}>
                                                    Moderación de Reseñas
                                                </h3>
                                                <p className="text-[8px] text-slate-500 line-clamp-1">Responder opiniones y emojis.</p>
                                            </div>

                                            {hayResenasPendientes ? (
                                                <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow-xs shrink-0">
                                                    {stats.resenasPendientes} sin contestar
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                                                    Al día
                                                </span>
                                            )}
                                        </div>
                                        <span className={`font-bold text-[9px] self-end ${hayResenasPendientes ? 'text-amber-600' : 'text-emerald-600'}`}>→</span>
                                    </Link>

                                    <Link href="/usuarios" className="bg-white p-1.5 rounded-md border border-slate-400 shadow-xs hover:border-slate-600 transition-all flex flex-col justify-between group min-h-[50px]">
                                        <div className="space-y-0.2">
                                            <span className="text-[7px] font-bold text-slate-600 uppercase">Sistema</span>
                                            <h3 className="text-[10px] font-bold text-slate-900 leading-tight">Usuarios ERP</h3>
                                            <p className="text-[8px] text-slate-500 line-clamp-1">Permisos y roles internos.</p>
                                        </div>
                                        <span className="text-slate-700 font-bold text-[9px] self-end">→</span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* EVOLUCIÓN DE VENTAS REAL (COMPACTADO PARA ENTRAR SIN SCROLL) */}
                    <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-2 flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-2.5 bg-emerald-600 rounded-xs"></span>
                                <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-wider">
                                    {esAdmin ? 'Evolución de Ventas Global — Últimos 6 Meses' : `Rendimiento de Ventas (${userName}) — Últimos 6 Meses`}
                                </h3>
                            </div>
                            <span className="text-[7px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                Sincronizado DB
                            </span>
                        </div>

                        {loadingVentas ? (
                            <div className="flex items-center justify-center h-20 text-[10px] text-slate-400 font-semibold animate-pulse">
                                Consultando transacciones reales...
                            </div>
                        ) : (
                            <div className="grid grid-cols-6 gap-2 items-end h-20 pt-2 pb-0.5 px-1 my-auto">
                                {(() => {
                                    const maxValor = Math.max(...datosVentas.map(d => d.valorNumerico), 1);
                                    return datosVentas.map((item, idx) => {
                                        const porcentajeAltura = Math.round((item.valorNumerico / maxValor) * 100);
                                        const colorClase = idx === datosVentas.length - 1
                                            ? 'bg-emerald-600 shadow-xs'
                                            : idx >= 3
                                                ? 'bg-emerald-500/80'
                                                : 'bg-emerald-400/60';

                                        return (
                                            <div key={idx} className="flex flex-col items-center justify-end h-full relative group">
                                                <span className="text-[9px] font-extrabold text-slate-800 mb-1 whitespace-nowrap">
                                                    {item.montoTexto}
                                                </span>
                                                <div
                                                    className={`w-full rounded-t-xs transition-all duration-300 ${colorClase}`}
                                                    style={{ height: `${porcentajeAltura > 0 ? porcentajeAltura : 4}%` }}
                                                />
                                                <span className="text-[9px] font-bold text-slate-700 mt-1">
                                                    {item.mes}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}

                        <div className="flex justify-between items-center text-[9px] text-slate-600 pt-1 mt-0.5 border-t border-slate-100 px-0.5 shrink-0">
                            <span className="font-semibold">Facturación real acumulada</span>
                            <span className="font-extrabold text-slate-900 text-[10px]">Total período: {totalPeriodo}</span>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA (4 COLUMNAS) */}
                <div className="lg:col-span-4 flex flex-col gap-1.5 h-full overflow-hidden">

                    {/* PERFIL DE USUARIO Y PENDIENTES */}
                    <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-2 space-y-1.5 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                            <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-wider">
                                Usuario Activo
                            </h3>
                            <button
                                onClick={handleLogout}
                                className="text-[8px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-1 py-0.2 rounded border border-rose-200 transition-colors cursor-pointer"
                            >
                                Cerrar Sesión
                            </button>
                        </div>

                        <div className="flex items-center gap-2 py-0.5">
                            <div className="relative group shrink-0">
                                {userPhoto ? (
                                    <img src={userPhoto} alt="Usuario" className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-xs" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black text-[10px] flex items-center justify-center tracking-wider border border-slate-300">
                                        {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[7px] font-bold text-white text-center" title="Cambiar Foto">
                                    📷
                                </label>
                                <input id="avatar-upload" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h4 className="text-[10px] font-bold text-slate-900 truncate">{userName}</h4>
                                <p className="text-[8px] font-semibold text-slate-500">{esAdmin ? 'Administrador General' : 'Cajero / Operador'}</p>
                                <label htmlFor="avatar-upload" className="text-[7px] font-bold text-emerald-600 hover:underline cursor-pointer inline-block">
                                    Cambiar foto
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[8px]">
                            <div className="bg-slate-50 p-1 rounded border border-slate-200/60">
                                <span className="font-bold text-slate-400 block text-[7px] uppercase">Sucursal</span>
                                <span className="font-bold text-slate-700 truncate block">Lomas de Zamora</span>
                            </div>
                            <div className="bg-slate-50 p-1 rounded border border-slate-200/60">
                                <span className="font-bold text-slate-400 block text-[7px] uppercase">Legajo</span>
                                <span className="font-bold text-slate-700 block">{esAdmin ? 'ADM-001' : 'CAJ-042'}</span>
                            </div>
                        </div>

                        <div className="pt-1 border-t border-slate-100 space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                Pendientes del Turno
                            </p>

                            <Link href="/caja" className="flex items-center justify-between text-[8px] p-1 bg-slate-50 hover:bg-amber-50/60 rounded border border-slate-200/60 transition-colors group">
                                <span className="font-semibold text-slate-700 group-hover:text-amber-900">⌛ Cierre de Caja</span>
                                <span className="font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-200">Pendiente →</span>
                            </Link>

                            {esAdmin && (
                                <Link href="/stock" className="flex items-center justify-between text-[8px] p-1 bg-slate-50 hover:bg-emerald-50/60 rounded border border-slate-200/60 transition-colors group">
                                    <span className="font-semibold text-slate-700 group-hover:text-emerald-900">✓ Recepción Insumos</span>
                                    <span className="font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200">Listo →</span>
                                </Link>
                            )}

                            <Link href="/stock" className="flex items-center justify-between text-[8px] p-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200/60 transition-colors group">
                                <span className="font-semibold text-slate-700">📅 Arqueo de Stock</span>
                                <span className="font-bold text-slate-500 bg-slate-200 px-1 py-0.2 rounded">18:00 Hs →</span>
                            </Link>
                        </div>
                    </div>

                    {/* RESUMEN OPERATIVO CENTRAL (COMPACTADO) */}
                    <div className="bg-white border border-slate-200/80 rounded-md shadow-xs p-2 flex-1 flex flex-col justify-between shrink-0">
                        <div>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-2.5 bg-emerald-600 rounded-xs"></span>
                                    <h2 className="text-[9px] font-black text-slate-700 uppercase tracking-wider">
                                        Resumen Operativo Central
                                    </h2>
                                </div>
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[7px] font-bold px-1 py-0.2 rounded border border-emerald-200">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                    OK
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1">
                                <Link href="/ventas" className="bg-slate-50 hover:bg-slate-100/80 p-1.5 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Facturas</span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-[11px] font-black text-slate-900">{esAdmin ? stats.facturasPendientes : '1'}</span>
                                        <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">Cobrar →</span>
                                    </div>
                                </Link>

                                {esAdmin && (
                                    <>
                                        <Link href="/compras" className="bg-slate-50 hover:bg-slate-100/80 p-1.5 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Pedidos</span>
                                            <div className="flex items-baseline justify-between mt-1">
                                                <span className="text-[11px] font-bold text-slate-900">{stats.pedidosCamino}</span>
                                                <span className="text-[8px] font-bold text-sky-800 bg-sky-100 px-1 py-0.2 rounded">Camino →</span>
                                            </div>
                                        </Link>

                                        <Link href="/compras" className="bg-slate-50 hover:bg-slate-100/80 p-1.5 rounded border border-slate-200/60 flex flex-col justify-between transition-all group">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Remitos</span>
                                            <div className="flex items-baseline justify-between mt-1">
                                                <span className="text-[11px] font-black text-slate-900">{stats.remitosValidar}</span>
                                                <span className="text-[8px] font-bold text-purple-800 bg-purple-100 px-1 py-0.2 rounded">Validar →</span>
                                            </div>
                                        </Link>
                                    </>
                                )}

                                {/* Stock Bajo con diseño de color suave y borde firme unificado */}
                                <Link href="/stock" className="bg-rose-50/90 hover:bg-rose-100/80 p-1.5 rounded border border-rose-300 flex flex-col justify-between transition-all group shadow-xs">
                                    <span className="text-[8px] font-extrabold text-rose-800 uppercase tracking-tight">Stock Bajo</span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-[11px] font-black text-slate-900">{stats.stockBajo}</span>
                                        <span className="text-[8px] font-bold text-rose-900 bg-rose-200 px-1 py-0.2 rounded">Alerta →</span>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        <div className="pt-1 text-center text-[7px] text-slate-400 uppercase tracking-wider font-semibold">
                            Sistema Sincronizado &bull; Turno Activo
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}