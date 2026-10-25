'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, AlertTriangle, FileText, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DetalleClientePage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [client, setClient] = useState<any>(null);
    const [sales, setSales] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ESTADO' | 'COMPRAS' | 'RECLAMOS'>('ESTADO');

    // Estados de paginación independientes
    const [salesPage, setSalesPage] = useState(1);
    const [claimsPage, setClaimsPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                const res = await fetch(`/api/clientes/${clientId}`);
                if (res.ok) {
                    const data = await res.json();
                    setClient(data.client);
                    setSales(data.sales || []);
                    setClaims(data.claims || []);
                }
            } catch (error) {
                console.error('Error al cargar datos del cliente:', error);
            } finally {
                setLoading(false);
            }
        };

        if (clientId) fetchClientData();
    }, [clientId]);

    // Resumen Financiero
    const totalComprado = useMemo(() => sales.reduce((acc, s) => acc + (s.total || 0), 0), [sales]);
    const deudaTotal = useMemo(() => sales.reduce((acc, s) => acc + (s.pendingBalance || 0), 0), [sales]);

    // 1. REGLA COMPRAS: Deuda primero, luego ordenadas por fecha (más recientes a más viejas)
    const sortedSales = useMemo(() => {
        return [...sales].sort((a, b) => {
            const aHasDebt = (a.pendingBalance || 0) > 0 ? 1 : 0;
            const bHasDebt = (b.pendingBalance || 0) > 0 ? 1 : 0;

            if (aHasDebt !== bHasDebt) {
                return bHasDebt - aHasDebt; // Las ventas con deuda quedan primero
            }

            // Si ambas tienen o no tienen deuda, se ordenan por fecha descendente
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [sales]);

    // 2. REGLA RECLAMOS: Reclamos ABIERTOS primero, luego ordenados por fecha descendente
    const sortedClaims = useMemo(() => {
        return [...claims].sort((a, b) => {
            const aIsOpen = a.status === 'ABIERTO' || a.status === 'RECLAMO' ? 1 : 0;
            const bIsOpen = b.status === 'ABIERTO' || b.status === 'RECLAMO' ? 1 : 0;

            if (aIsOpen !== bIsOpen) {
                return bIsOpen - aIsOpen; // Los reclamos no resueltos van arriba
            }

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [claims]);

    // Paginados
    const totalSalesPages = Math.ceil(sortedSales.length / itemsPerPage) || 1;
    const paginatedSales = useMemo(() => {
        const start = (salesPage - 1) * itemsPerPage;
        return sortedSales.slice(start, start + itemsPerPage);
    }, [sortedSales, salesPage]);

    const totalClaimsPages = Math.ceil(sortedClaims.length / itemsPerPage) || 1;
    const paginatedClaims = useMemo(() => {
        const start = (claimsPage - 1) * itemsPerPage;
        return sortedClaims.slice(start, start + itemsPerPage);
    }, [sortedClaims, claimsPage]);

    if (loading) {
        return <div className="p-12 text-center text-xs font-bold uppercase text-slate-400">Cargando perfil del cliente...</div>;
    }

    if (!client) {
        return <div className="p-12 text-center text-xs font-bold uppercase text-rose-500">Cliente no encontrado.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3 font-sans text-slate-800">

            {/* ENCABEZADO DE PERFIL Y RESUMEN FINANCIERO */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-black uppercase text-slate-900">{client.name}</h1>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                {client.role || 'CLIENTE'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{client.email} | Tel: {client.phone || 'S/D'}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Histórico</span>
                        <span className="text-xs font-mono font-black text-slate-900">$ {totalComprado.toLocaleString()}</span>
                    </div>
                    <div className={`border px-3 py-1.5 rounded-xl text-right ${deudaTotal > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        <span className="block text-[9px] font-bold uppercase opacity-80">Deuda / Saldo Pendiente</span>
                        <span className="text-xs font-mono font-black">$ {deudaTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* SOLAPAS INTERACTIVAS */}
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200/80">
                <button
                    onClick={() => setActiveTab('ESTADO')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'ESTADO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <FileText className="w-4 h-4" /> Estado de Cuenta y Resumen
                </button>
                <button
                    onClick={() => setActiveTab('COMPRAS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'COMPRAS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <ShoppingBag className="w-4 h-4" /> Historial de Compras ({sales.length})
                </button>
                <button
                    onClick={() => setActiveTab('RECLAMOS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'RECLAMOS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <AlertTriangle className="w-4 h-4" /> Reclamos e Incidencias ({claims.length})
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs min-h-[350px] flex flex-col justify-between">

                {/* SOLAPA 1: RESUMEN Y ESTADO */}
                {activeTab === 'ESTADO' && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Información General de la Cuenta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex justify-between"><span className="text-slate-500">Dirección de Envío:</span> <strong className="uppercase">{client.address || 'S/D'}</strong></div>
                                <div className="flex justify-between"><span className="text-slate-500">DNI / CUIT:</span> <strong className="font-mono">{client.dni_cuit || 'S/D'}</strong></div>
                                <div className="flex justify-between"><span className="text-slate-500">Fecha de Registro:</span> <span className="font-mono">{new Date(client.createdAt).toLocaleDateString()}</span></div>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex justify-between"><span className="text-slate-500">Total de Operaciones:</span> <strong className="font-mono">{sales.length}</strong></div>
                                <div className="flex justify-between"><span className="text-slate-500">Incidencias / Reclamos:</span> <strong className="font-mono text-indigo-600">{claims.length}</strong></div>
                                <div className="flex justify-between"><span className="text-slate-500">Estado de Cuenta:</span> <strong className={deudaTotal > 0 ? 'text-rose-600' : 'text-emerald-600'}>{deudaTotal > 0 ? '⚠️ SALDO PENDIENTE' : '✓ AL DÍA'}</strong></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SOLAPA 2: HISTORIAL DE COMPRAS (FECHA LOCAL CORREGIDA + SOLAPA DINÁMICA) */}
                {activeTab === 'COMPRAS' && (
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b">
                                    <tr>
                                        <th className="p-2.5">ID / Fecha</th>
                                        <th className="p-2.5">Canal</th>
                                        <th className="p-2.5">Estado</th>
                                        <th className="p-2.5 text-right">Saldo Pendiente</th>
                                        <th className="p-2.5 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {paginatedSales.length > 0 ? paginatedSales.map(s => {
                                        const hasDebt = (s.pendingBalance || 0) > 0;

                                        // Corrección de fecha local exacta sin desfasaje UTC
                                        const saleDateObj = new Date(s.createdAt);
                                        const localYear = saleDateObj.getFullYear();
                                        const localMonth = String(saleDateObj.getMonth() + 1).padStart(2, '0');
                                        const localDay = String(saleDateObj.getDate()).padStart(2, '0');
                                        const formattedLocalDate = `${localYear}-${localMonth}-${localDay}`;

                                        // Definición dinámica de la pestaña según el estado real de la venta
                                        let targetTab = 'FINALIZADAS';
                                        if (hasDebt) {
                                            targetTab = 'COBRAR';
                                        } else if (s.status === 'REGISTRADO' || s.status === 'PENDIENTE') {
                                            targetTab = 'PENDIENTES';
                                        }

                                        return (
                                            <tr key={s.id} className={`transition ${hasDebt ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50'}`}>
                                                <td className="p-2.5 font-mono">
                                                    <Link
                                                        href={`/operaciones?orderId=${s.id}&date=${formattedLocalDate}&tab=${targetTab}`}
                                                        className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1 group"
                                                        title="Ir a comprobante en operaciones"
                                                    >
                                                        #{s.id.slice(-6).toUpperCase()}
                                                        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                    </Link>
                                                    <span className="block text-[9px] text-slate-400">{saleDateObj.toLocaleDateString('es-AR')}</span>
                                                </td>
                                                <td className="p-2.5 uppercase">{s.channel}</td>
                                                <td className="p-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${hasDebt ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold">
                                                    {hasDebt ? (
                                                        <span className="text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">$ {s.pendingBalance.toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-slate-400">$ 0</span>
                                                    )}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">$ {s.total?.toLocaleString()}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={5} className="text-center py-8 text-slate-400 italic">Este cliente no registra compras.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINADOR COMPRAS */}
                        {totalSalesPages > 1 && (
                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                                <span className="text-slate-500 font-mono text-[11px]">Página {salesPage} de {totalSalesPages}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setSalesPage(p => Math.max(p - 1, 1))}
                                        disabled={salesPage === 1}
                                        className="p-1 border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setSalesPage(p => Math.min(p + 1, totalSalesPages))}
                                        disabled={salesPage === totalSalesPages}
                                        className="p-1 border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SOLAPA 3: RECLAMOS (ABIERTOS PRIMERO + LINK AL RECLAMO + PAGINADO) */}
                {activeTab === 'RECLAMOS' && (
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b">
                                    <tr>
                                        <th className="p-2.5">Fecha</th>
                                        <th className="p-2.5">Motivo del Reclamo</th>
                                        <th className="p-2.5">Solución Aplicada</th>
                                        <th className="p-2.5 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {paginatedClaims.length > 0 ? paginatedClaims.map(c => {
                                        const isOpen = c.status === 'ABIERTO' || c.status === 'RECLAMO';

                                        const claimDateObj = new Date(c.createdAt);
                                        const cYear = claimDateObj.getFullYear();
                                        const cMonth = String(claimDateObj.getMonth() + 1).padStart(2, '0');
                                        const cDay = String(claimDateObj.getDate()).padStart(2, '0');
                                        const formattedClaimDate = `${cYear}-${cMonth}-${cDay}`;

                                        return (
                                            <tr key={c.id} className={`transition ${isOpen ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                                <td className="p-2.5 font-mono text-slate-500">{claimDateObj.toLocaleDateString('es-AR')}</td>
                                                <td className="p-2.5 font-bold uppercase text-slate-800">
                                                    <Link
                                                        href={`/operaciones?claimId=${c.id}&date=${formattedClaimDate}&tab=RECLAMOS`}
                                                        className="hover:text-indigo-700 hover:underline inline-flex items-center gap-1 group"
                                                        title="Ver reclamo en Operaciones"
                                                    >
                                                        {c.reason}
                                                        <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                                    </Link>
                                                </td>
                                                <td className="p-2.5 uppercase text-emerald-700 font-medium">{c.resolution || 'PENDIENTE DE RESOLUCIÓN'}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isOpen ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {isOpen ? '⚠️ ABIERTO' : '✓ RESUELTO'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={4} className="text-center py-8 text-slate-400 italic">Este cliente no registra reclamos.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINADOR RECLAMOS */}
                        {totalClaimsPages > 1 && (
                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                                <span className="text-slate-500 font-mono text-[11px]">Página {claimsPage} de {totalClaimsPages}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setClaimsPage(p => Math.max(p - 1, 1))}
                                        disabled={claimsPage === 1}
                                        className="p-1 border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setClaimsPage(p => Math.min(p + 1, totalClaimsPages))}
                                        disabled={claimsPage === totalClaimsPages}
                                        className="p-1 border rounded-lg hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}