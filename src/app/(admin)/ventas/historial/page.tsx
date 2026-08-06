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

    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 5;

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
        setPaginaActual(1);
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

    // Ordenamiento estricto por fecha/hora descendente (más recientes primero)
    const ventasOrdenadas = [...(data.sales || [])].sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const totalRegistros = ventasOrdenadas.length;
    const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) || 1;
    const indiceInicio = (paginaActual - 1) * registrosPorPagina;
    const ventasPaginadas = ventasOrdenadas.slice(indiceInicio, indiceInicio + registrosPorPagina);

    if (!mounted) {
        return (
            <div className="w-full flex items-center justify-center p-12 text-slate-400 text-xs font-semibold">
                Cargando historial de ventas...
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col font-sans text-slate-800 pb-1 overflow-x-hidden">

            {/* ENCABEZADO ESTÁNDAR JUSTIFICADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1.5 px-1 gap-2 shrink-0">
                <div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                        <span>📈</span> Historial e Informes de Ventas
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Consulta acumulada de facturación y detalle por rango de fechas.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-300 rounded-lg shadow-2xs">
                        <label className="text-[11px] font-bold text-slate-600">Desde:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-300 rounded-lg shadow-2xs">
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
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                    >
                        🔍 Filtrar
                    </button>

                    <Link
                        href="/caja"
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                        📊 Ir a Caja
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex items-center justify-center text-slate-400 text-xs font-semibold">
                    Cargando informe acumulado...
                </div>
            ) : (
                <div className="flex flex-col space-y-1.5">

                    {/* RESUMEN ACUMULADO DEL PERIODO */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5 shrink-0">
                        {/* TOTAL ACUMULADO */}
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-2xs border border-slate-800 col-span-2 lg:col-span-1 flex flex-col justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Acumulado</span>
                            <span className="text-base font-bold text-emerald-400 mt-0.5" suppressHydrationWarning>
                                ${(data.summary?.totalAmount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-300 font-semibold">
                                {totalRegistros} operaciones
                            </span>
                        </div>

                        {/* TARJETAS POR MEDIO DE PAGO */}
                        <div className="bg-white p-2 rounded-xl border border-slate-200/85 shadow-2xs flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm">💵</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efectivo</p>
                                <p className="text-xs font-extrabold text-emerald-700 mt-0.5" suppressHydrationWarning>
                                    ${(data.summary?.efectivo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-slate-200/85 shadow-2xs flex items-center gap-2.5">
                            <div className="p-2 bg-sky-50 text-sky-700 rounded-lg text-sm">📲</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transferencia</p>
                                <p className="text-xs font-extrabold text-sky-700 mt-0.5" suppressHydrationWarning>
                                    ${(data.summary?.transferencia || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-slate-200/85 shadow-2xs flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm">💳</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Débito</p>
                                <p className="text-xs font-extrabold text-indigo-700 mt-0.5" suppressHydrationWarning>
                                    ${(data.summary?.debito || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-slate-200/85 shadow-2xs flex items-center gap-2.5">
                            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg text-sm">💳</div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crédito</p>
                                <p className="text-xs font-extrabold text-purple-700 mt-0.5" suppressHydrationWarning>
                                    ${(data.summary?.credito || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* TABLA / GRILLA DE VENTAS CON ALTURA ESTIRADA Y ORDENADA */}
                    <div className="bg-white rounded-xl border border-slate-200/85 shadow-2xs flex flex-col">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex justify-between items-center rounded-t-xl">
                            <span>📋 Listado de Operaciones Emitidas</span>
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                {totalRegistros} registros
                            </span>
                        </div>

                        <div className="px-2 py-1.5 min-h-[310px] flex flex-col justify-between">
                            <div className="divide-y divide-slate-100">
                                {ventasPaginadas.length === 0 ? (
                                    <div className="py-14 flex flex-col items-center justify-center text-center text-slate-400">
                                        <span className="text-3xl mb-1">🔍</span>
                                        <p className="text-xs font-semibold text-slate-600">No se encontraron ventas para el período seleccionado.</p>
                                    </div>
                                ) : (
                                    ventasPaginadas.map((sale: any) => (
                                        <div key={sale.id} className="py-2 px-2 hover:bg-slate-50/80 rounded-lg transition-colors flex items-center justify-between">
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
                                                    📅 {formatDate(sale.createdAt)} {sale.user?.name ? `• 👤 ${sale.user.name}` : ''}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="font-bold text-xs text-slate-900 block" suppressHydrationWarning>
                                                    ${(sale.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* BARRA DE PAGINACIÓN */}
                            <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-xs px-1 pb-0.5">
                                <span className="text-slate-500 font-medium text-[11px]">
                                    {totalRegistros > 0
                                        ? `Mostrando ${indiceInicio + 1} a ${Math.min(indiceInicio + registrosPorPagina, totalRegistros)} de ${totalRegistros} registros`
                                        : 'Sin registros para mostrar'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={paginaActual === 1 || totalRegistros === 0}
                                        onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <span className="px-2 font-bold text-slate-700 text-[11px]">
                                        Página {totalRegistros === 0 ? 0 : paginaActual} de {totalPaginas}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={paginaActual === totalPaginas || totalRegistros === 0}
                                        onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}