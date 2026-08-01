'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSalesReport } from '@/actions/reportes-actions';

export default function HistorialVentasPage() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [mounted, setMounted] = useState(false);

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ summary: {}, sales: [] });

    useEffect(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

        setStartDate(firstDayStr);
        setEndDate(todayStr);
        setMounted(true);

        loadReport(firstDayStr, todayStr);
    }, []);

    const loadReport = async (start = startDate, end = endDate) => {
        setLoading(true);
        try {
            const res = await getSalesReport({ startDate: start, endDate: end });
            if (res?.success) {
                setData(res);
            }
        } catch (error) {
            console.error('Error al cargar reporte:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!mounted) return '';
        const d = new Date(dateString);
        return `${d.toLocaleDateString('es-AR')} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs`;
    };

    if (!mounted) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100/60 text-slate-400 text-xs font-semibold">
                Cargando historial de ventas...
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-100/60 p-4 md:p-6 max-w-7xl mx-auto font-sans text-slate-800 overflow-hidden select-none">

            {/* ENCABEZADO Y FILTROS POR FECHA */}
            <header className="flex-shrink-0 flex items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                    <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">📈 Historial e Informes de Ventas</h1>
                    <p className="text-[11px] text-slate-500">Consulta acumulada de facturación y detalle por rango de fechas.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-300 rounded-lg shadow-sm">
                        <label className="text-[11px] font-bold text-slate-600">Desde:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-300 rounded-lg shadow-sm">
                        <label className="text-[11px] font-bold text-slate-600">Hasta:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => loadReport()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1 uppercase tracking-wide"
                    >
                        🔍 Filtrar
                    </button>

                    <Link
                        href="/caja"
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                        📊 Ir a Caja
                    </Link>
                </div>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-semibold">
                    Cargando informe acumulado...
                </div>
            ) : (
                <div className="flex-1 mt-3 flex flex-col space-y-3 min-h-0 overflow-hidden">

                    {/* RESUMEN ACUMULADO DEL PERIODO */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 flex-shrink-0">
                        {/* TOTAL ACUMULADO */}
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-sm border border-slate-800 col-span-1 sm:col-span-1 flex flex-col justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Acumulado</span>
                            <span className="text-xl font-bold text-emerald-400 mt-1" suppressHydrationWarning>
                                ${(data.summary?.totalAmount || 0).toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] text-emerald-300 font-semibold mt-0.5">
                                {data.summary?.totalSales || 0} operaciones
                            </span>
                        </div>

                        {/* TARJETAS POR MEDIO DE PAGO */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">💵 Efectivo</span>
                            <span className="text-base font-extrabold text-emerald-700 mt-1" suppressHydrationWarning>
                                ${(data.summary?.efectivo || 0).toLocaleString('es-AR')}
                            </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">📲 Transf.</span>
                            <span className="text-base font-extrabold text-sky-700 mt-1" suppressHydrationWarning>
                                ${(data.summary?.transferencia || 0).toLocaleString('es-AR')}
                            </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">💳 Débito</span>
                            <span className="text-base font-extrabold text-indigo-700 mt-1" suppressHydrationWarning>
                                ${(data.summary?.debito || 0).toLocaleString('es-AR')}
                            </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">💳 Crédito</span>
                            <span className="text-base font-extrabold text-purple-700 mt-1" suppressHydrationWarning>
                                ${(data.summary?.credito || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>

                    {/* TABLA / GRILLA DE VENTAS CON SCROLL */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex justify-between items-center flex-shrink-0">
                            <span>📋 Listado de Operaciones Emitidas</span>
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                {data.sales?.length || 0} registros
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                            {!data.sales || data.sales.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <span className="text-3xl mb-1">🔍</span>
                                    <p className="text-xs font-semibold text-slate-600">No se encontraron ventas para el período seleccionado.</p>
                                </div>
                            ) : (
                                data.sales.map((sale: any) => (
                                    <div key={sale.id} className="py-2.5 px-3 hover:bg-slate-50/80 rounded-lg transition-colors flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] font-bold text-slate-400">
                                                    #{sale.id.slice(-6).toUpperCase()}
                                                </span>
                                                <span className="font-bold text-xs text-slate-800 uppercase">
                                                    {sale.customerName || 'CLIENTE OCASIONAL'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium" suppressHydrationWarning>
                                                📅 {formatDate(sale.createdAt)}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="font-bold text-xs text-slate-900 block" suppressHydrationWarning>
                                                ${sale.total?.toLocaleString('es-AR')}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                                {sale.paymentMethod}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}