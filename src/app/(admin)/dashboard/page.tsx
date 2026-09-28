'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
    Package,
    Sprout,
    ShoppingCart,
    DollarSign,
    Truck,
    Users,
    Image as ImageIcon,
    Percent,
    MessageSquare,
    BarChart3,
    AlertTriangle,
    CheckCircle2,
    Layers,
    Lock
} from 'lucide-react';

export default function DashboardPage() {
    const { data: session, status } = useSession();

    // Estados dinámicos para métricas y estado operativo
    const [cajaPendiente, setCajaPendiente] = useState(false);
    const [facturasCount, setFacturasCount] = useState(0);
    const [pedidosCount, setPedidosCount] = useState(0);
    const [loadingStats, setLoadingStats] = useState(true);

    // Estados dinámicos para el perfil del usuario activo
    const [profileName, setProfileName] = useState('Daniel Urraca');
    const [profileEmail, setProfileEmail] = useState('admin@tiendadeplantas.com');
    const [profileImage, setProfileImage] = useState('');

    const userRole = (session?.user as any)?.role || 'ADMIN';

    useEffect(() => {
        // 1. Cargar estadísticas reales de caja, facturas y pedidos desde TiDB
        async function fetchDashboardStats() {
            try {
                const res = await fetch('/api/admin/dashboard-stats');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setCajaPendiente(data.cajaPendiente);
                        setFacturasCount(data.facturasCount);
                        setPedidosCount(data.pedidosCount);
                    }
                }
            } catch (error) {
                console.error('Error al cargar estado del dashboard:', error);
            } finally {
                setLoadingStats(false);
            }
        }

        // 2. Cargar datos actualizados del perfil del usuario activo
        async function fetchProfileData() {
            try {
                const res = await fetch('/api/admin/perfil');
                if (res.ok) {
                    const data = await res.json();
                    if (data.nombre) setProfileName(data.nombre);
                    if (data.email) setProfileEmail(data.email);
                    if (data.imagenUrl !== undefined) setProfileImage(data.imagenUrl);
                }
            } catch (error) {
                console.error('Error al cargar perfil en el dashboard:', error);
            }
        }

        fetchDashboardStats();
        fetchProfileData();
    }, []);

    const operationalModules = [
        {
            title: 'Catálogo de Productos',
            description: 'Precios, marcas y costos.',
            href: '/productos',
            icon: Package,
            category: 'Inventario',
            allowedRoles: ['ADMIN', 'CAJERO', 'DEPOSITO'],
            pastelBg: 'bg-emerald-50/90 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900',
            badgeColor: 'text-emerald-700',
            iconColor: 'text-emerald-600'
        },
        {
            title: 'Gestión de Vivero',
            description: 'Especies, sustratos e insumos.',
            href: '/vivero',
            icon: Sprout,
            category: 'Botánico',
            allowedRoles: ['ADMIN', 'CAJERO', 'DEPOSITO'],
            pastelBg: 'bg-lime-50/90 hover:bg-lime-100/80 border-lime-200 text-lime-900',
            badgeColor: 'text-lime-700',
            iconColor: 'text-lime-600'
        },
        {
            title: 'Punto de Venta (POS)',
            description: 'Facturación rápida.',
            href: '/ventas',
            icon: ShoppingCart,
            category: 'Mostrador',
            allowedRoles: ['ADMIN', 'CAJERO'],
            pastelBg: 'bg-sky-50/90 hover:bg-sky-100/80 border-sky-200 text-sky-900',
            badgeColor: 'text-sky-700',
            iconColor: 'text-sky-600'
        },
        {
            title: 'Arqueo & Caja',
            description: 'Cierres de turno y pagos.',
            href: '/caja',
            icon: DollarSign,
            category: 'Tesorería',
            allowedRoles: ['ADMIN', 'CAJERO'],
            pastelBg: 'bg-amber-50/90 hover:bg-amber-100/80 border-amber-200 text-amber-900',
            badgeColor: 'text-amber-700',
            iconColor: 'text-amber-600'
        },
        {
            title: 'Compras & Proveedores',
            description: 'Órdenes de compra.',
            href: '/compras',
            icon: Truck,
            category: 'Abastecimiento',
            allowedRoles: ['ADMIN', 'DEPOSITO'],
            pastelBg: 'bg-orange-50/90 hover:bg-orange-100/80 border-orange-200 text-orange-900',
            badgeColor: 'text-orange-700',
            iconColor: 'text-orange-600'
        },
        {
            title: 'Gestión de Clientes',
            description: 'Base de datos y perfiles.',
            href: '/clientes',
            icon: Users,
            category: 'CRM / Contactos',
            allowedRoles: ['ADMIN', 'CAJERO'],
            pastelBg: 'bg-purple-50/90 hover:bg-purple-100/80 border-purple-200 text-purple-900',
            badgeColor: 'text-purple-700',
            iconColor: 'text-purple-600'
        },
        {
            title: 'Imágenes de Portada',
            description: 'Banners y hero section.',
            href: '/portada',
            icon: ImageIcon,
            category: 'Tienda Web',
            allowedRoles: ['ADMIN'],
            pastelBg: 'bg-pink-50/90 hover:bg-pink-100/80 border-pink-200 text-pink-900',
            badgeColor: 'text-pink-700',
            iconColor: 'text-pink-600'
        },
        {
            title: 'Promociones & Cupones',
            description: 'Descuentos y ofertas.',
            href: '/promociones',
            icon: Percent,
            category: 'Comercial',
            allowedRoles: ['ADMIN', 'CAJERO'],
            pastelBg: 'bg-teal-50/90 hover:bg-teal-100/80 border-teal-200 text-teal-900',
            badgeColor: 'text-teal-700',
            iconColor: 'text-teal-600'
        },
        {
            title: 'Moderación de Reseñas',
            description: 'Responder opiniones.',
            href: '/resenas',
            icon: MessageSquare,
            category: 'Comunidad',
            allowedRoles: ['ADMIN'],
            pastelBg: 'bg-rose-50/90 hover:bg-rose-100/80 border-rose-200 text-rose-900',
            badgeColor: 'text-rose-700',
            iconColor: 'text-rose-600'
        },
        {
            title: 'Centro de Reportes',
            description: 'Métricas, gráficos y vista.',
            href: '/reportes',
            icon: BarChart3,
            category: 'Analytics',
            allowedRoles: ['ADMIN', 'CAJERO'],
            pastelBg: 'bg-indigo-50/90 hover:bg-indigo-100/80 border-indigo-200 text-indigo-900',
            badgeColor: 'text-indigo-700',
            iconColor: 'text-indigo-600'
        },
        {
            title: 'Integración Jira',
            description: 'Gestión de tareas y backlog.',
            href: '/jira',
            icon: Layers,
            category: 'PMO / Agile',
            allowedRoles: ['ADMIN'],
            pastelBg: 'bg-cyan-50/90 hover:bg-cyan-100/80 border-cyan-200 text-cyan-900',
            badgeColor: 'text-cyan-700',
            iconColor: 'text-cyan-600'
        }
    ];

    if (status === 'loading') {
        return (
            <div className="h-full bg-stone-100 flex items-center justify-center text-xs text-stone-500 font-medium">
                Cargando panel de control...
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden p-3.5 md:p-4 space-y-3 font-sans text-stone-800 bg-stone-100 rounded-3xl border border-stone-200 shadow-inner flex flex-col justify-between">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">

                {/* IZQUIERDA: MÓDULOS */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-2.5">
                        <h2 className="text-[11px] font-extrabold text-stone-800 uppercase tracking-wider border-b border-stone-100 pb-2 flex items-center justify-between">
                            <span>Módulos del Sistema y Permisos (Rol: <strong className="text-emerald-700">{userRole}</strong>)</span>
                            <span className="text-[10px] font-normal text-stone-400">Versión 2.5.0 RBAC</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {operationalModules.map((mod, index) => {
                                const IconComponent = mod.icon;
                                const hasAccess = userRole === 'ADMIN' || mod.allowedRoles.includes(userRole);

                                return hasAccess ? (
                                    <Link
                                        key={index}
                                        href={mod.href}
                                        className={`p-3 border rounded-xl transition group flex flex-col justify-between shadow-2xs ${mod.pastelBg}`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wide ${mod.badgeColor}`}>{mod.category}</span>
                                                <IconComponent className={`w-4 h-4 group-hover:scale-110 transition ${mod.iconColor}`} />
                                            </div>
                                            <h3 className="text-xs font-bold text-stone-900 leading-tight">{mod.title}</h3>
                                            <p className="text-[10px] text-stone-600 mt-1 line-clamp-1">{mod.description}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold mt-2 block ${mod.badgeColor}`}>Acceder →</span>
                                    </Link>
                                ) : (
                                    <div
                                        key={index}
                                        className="p-3 bg-stone-100/70 border border-stone-200 rounded-xl opacity-50 grayscale select-none flex flex-col justify-between cursor-not-allowed"
                                        title="No tenés permisos para acceder a este módulo"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{mod.category}</span>
                                                <Lock className="w-4 h-4 text-stone-400" />
                                            </div>
                                            <h3 className="text-xs font-bold text-stone-600 leading-tight">{mod.title}</h3>
                                            <p className="text-[10px] text-stone-400 mt-1 line-clamp-1">{mod.description}</p>
                                        </div>
                                        <span className="text-[10px] font-bold mt-2 block text-stone-400">Restringido 🔒</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* DERECHA: PANEL LATERAL */}
                <div className="lg:col-span-4 flex flex-col gap-3">

                    {/* Usuario Activo */}
                    <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">Usuario Activo</span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                            >
                                Cerrar Sesión
                            </button>
                        </div>

                        <Link href="/perfil" className="flex items-center gap-3 p-1.5 -mx-1.5 hover:bg-stone-50 rounded-xl transition group">
                            <div className="w-9 h-9 bg-emerald-700 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 overflow-hidden">
                                {profileImage ? (
                                    <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    profileName.substring(0, 2).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 transition truncate">{profileName}</h3>
                                <p className="text-[10px] text-stone-500 truncate">Rol: <strong className="text-emerald-600">{userRole}</strong> — <span className="underline">Editar Perfil</span></p>
                            </div>
                        </Link>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 bg-stone-50 rounded-xl border border-stone-100">
                                <span className="block text-[8px] text-stone-400 uppercase">Sucursal</span>
                                <span className="font-bold text-stone-700 truncate block">Lomas de Zamora</span>
                            </div>
                            <div className="p-2 bg-stone-50 rounded-xl border border-stone-100">
                                <span className="block text-[8px] text-stone-400 uppercase">Cuenta</span>
                                <span className="font-bold text-stone-700 truncate block">{profileEmail}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actividad y Estado de Caja (Dinámico y Conectado a TiDB) */}
                    <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">Actividad y Estado de Caja</span>
                            {cajaPendiente ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Abierta
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Al Día
                                </span>
                            )}
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <Link href="/reportes" className="p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-xl flex flex-col justify-between transition group">
                                    <span className="text-[10px] text-stone-500 font-bold">FACTURAS</span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-base font-extrabold text-stone-800">
                                            {loadingStats ? '...' : facturasCount}
                                        </span>
                                        <span className="text-[10px] text-emerald-600 font-bold group-hover:underline">Total →</span>
                                    </div>
                                </Link>

                                <Link href="/compras" className="p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-xl flex flex-col justify-between transition group">
                                    <span className="text-[10px] text-stone-500 font-bold">PEDIDOS</span>
                                    <div className="flex items-baseline justify-between mt-1">
                                        <span className="text-base font-extrabold text-stone-800">
                                            {loadingStats ? '...' : pedidosCount}
                                        </span>
                                        <span className="text-[10px] text-sky-600 font-bold group-hover:underline">Total →</span>
                                    </div>
                                </Link>
                            </div>

                            <Link href="/caja" className={`p-2.5 border rounded-xl flex items-center justify-between transition ${cajaPendiente ? 'bg-amber-50 hover:bg-amber-100/60 border-amber-200' : 'bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-200'}`}>
                                <div className="space-y-0.5">
                                    <span className={`text-[10px] font-extrabold uppercase block ${cajaPendiente ? 'text-amber-900' : 'text-emerald-900'}`}>
                                        Arqueo de Turno
                                    </span>
                                    <p className={`text-[10px] ${cajaPendiente ? 'text-amber-700' : 'text-emerald-700'}`}>
                                        {cajaPendiente ? 'Hay una caja pendiente de cierre hoy.' : 'Cierre de caja completado hoy.'}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold underline shrink-0 ${cajaPendiente ? 'text-amber-800' : 'text-emerald-800'}`}>Ver →</span>
                            </Link>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}