'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCajaSummary } from '@/actions/caja-actions';

export default function CajaPage() {
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>({
        totals: { EFECTIVO: 0, TRANSFERENCIA: 0, DEBITO: 0, CREDITO: 0, TOTAL_GENERAL: 0, CANTIDAD_VENTAS: 0 },
        sales: []
    });

    const [efectivoFisico, setEfectivoFisico] = useState<string>('');

    const loadData = async (dateStr: string) => {
        setLoading(true);
        try {
            const res = await getCajaSummary(dateStr);
            if (res && res.success) {
                setSummary(res);
            }
        } catch (error) {
            console.error('Error al cargar la caja:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(selectedDate);
    }, [selectedDate]);

    const cashInSystem = summary?.totals?.EFECTIVO || 0;
    const countedCash = parseFloat(efectivoFisico) || 0;
    const difference = countedCash - cashInSystem;

    return (
        <div className="w-full flex flex-col font-sans text-slate-800 pb-0">

            {/* ENCABEZADO COMPACTO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1 px-1 gap-1 shrink-0">
                <div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                        <span>📊</span> Resumen y Arqueo Diario
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Consulta de recaudación, auditoría de caja e ingresos del día.
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-slate-300 rounded shadow-sm">
                        <label className="text-[10px] font-bold text-slate-600">Fecha:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-[11px] font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => loadData(selectedDate)}
                        className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-semibold rounded shadow-sm transition-colors flex items-center gap-1"
                    >
                        🔄 Recargar
                    </button>

                    <Link
                        href="/ventas/historial"
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded shadow-sm transition-colors flex items-center gap-1"
                    >
                        📈 Reportes Acumulados
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400 text-xs font-medium">
                    Cargando información de caja...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-stretch">

                    {/* COLUMNA IZQUIERDA: RESUMEN Y TICKETS (8 Columnas - Altura fija reducida a 340px para dejar espacio al pie de página) */}
                    <div className="md:col-span-8 flex flex-col space-y-1.5">

                        {/* TARJETAS DE MEDIOS DE PAGO */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
                            <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">💵 Efectivo</span>
                                <span className="text-xs font-extrabold text-emerald-700 mt-0.5">${(summary?.totals?.EFECTIVO || 0).toLocaleString('es-AR')}</span>
                            </div>

                            <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">📲 Transf.</span>
                                <span className="text-xs font-extrabold text-sky-700 mt-0.5">${(summary?.totals?.TRANSFERENCIA || 0).toLocaleString('es-AR')}</span>
                            </div>

                            <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">💳 Débito</span>
                                <span className="text-xs font-extrabold text-indigo-700 mt-0.5">${(summary?.totals?.DEBITO || 0).toLocaleString('es-AR')}</span>
                            </div>

                            <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">💳 Crédito</span>
                                <span className="text-xs font-extrabold text-purple-700 mt-0.5">${(summary?.totals?.CREDITO || 0).toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        {/* BANNER TOTAL RECAUDADO */}
                        <div className="shrink-0 bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm flex justify-between items-center border border-slate-800">
                            <div>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block leading-tight">Total Recaudado</span>
                                <span className="text-[12px] text-emerald-400 font-semibold">{summary?.totals?.CANTIDAD_VENTAS || 0} operaciones registradas</span>
                            </div>
                            <span className="text-base font-bold text-emerald-400">${(summary?.totals?.TOTAL_GENERAL || 0).toLocaleString('es-AR')}</span>
                        </div>

                        {/* LISTA DE TICKETS */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[340px]">
                            <div className="p-1.5 bg-slate-50 border-b border-slate-200 font-bold text-[12px] uppercase tracking-wider text-slate-700 flex justify-between items-center shrink-0">
                                <span>📋 Detalle de Ventas Emitidas</span>
                                <span className="text-[12px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                                    {summary?.sales?.length || 0} tickets
                                </span>
                            </div>

                            <div className="flex-1 divide-y divide-slate-100 p-1.5 overflow-y-auto">
                                {!summary?.sales || summary.sales.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
                                        <span className="text-xl mb-0.5">🧾</span>
                                        <p className="text-[10px] font-semibold text-slate-600">No hay ventas registradas en esta fecha.</p>
                                    </div>
                                ) : (
                                    summary.sales.map((sale: any) => (
                                        <div key={sale.id} className="py-1 px-1.5 flex justify-between items-center hover:bg-slate-50/80 rounded transition-colors">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-[9px] font-bold text-slate-400">#{sale.id.slice(-6).toUpperCase()}</span>
                                                    <span className="font-bold text-[10px] text-slate-800 uppercase">{sale.customerName || 'CLIENTE OCASIONAL'}</span>
                                                </div>
                                                <span className="text-[8px] text-slate-400 font-medium">
                                                    ⏰ {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs | {sale.items?.length || 0} ítems
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-[10px] text-slate-900 block">${sale.total.toLocaleString('es-AR')}</span>
                                                <span className="text-[7px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    {/* COLUMNA DERECHA: CONTROL DE EFECTIVO Y ARQUEO (4 Columnas - Ligeramente más extendido a 385px para sobresalir abajo manteniendo visible el footer) */}
                    <div className="md:col-span-4 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[385px]">

                        <div className="space-y-2 overflow-y-auto pr-0.5 flex-1">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1">
                                <span>🔍</span> Control y Arqueo de Efectivo
                            </h2>

                            <div className="space-y-1.5">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Efectivo Teórico (Sistema):</label>
                                    <div className="p-1.5 bg-slate-100/80 border border-slate-200 rounded text-xs font-bold text-slate-800 font-mono">
                                        ${cashInSystem.toLocaleString('es-AR')}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Efectivo Físico en Cajón ($):</label>
                                    <input
                                        type="number"
                                        placeholder="Ingrese el dinero recontado..."
                                        value={efectivoFisico}
                                        onChange={(e) => setEfectivoFisico(e.target.value)}
                                        className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                    />
                                </div>

                                {efectivoFisico !== '' && (
                                    <div className={`p-2 rounded border text-[10px] font-semibold space-y-0.5 ${difference === 0
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : difference > 0
                                            ? 'bg-sky-50 border-sky-300 text-sky-900'
                                            : 'bg-rose-50 border-rose-300 text-rose-900'
                                        }`}>
                                        <span className="block text-[8px] uppercase font-bold text-slate-600">Estado de Arqueo:</span>
                                        {difference === 0 && <p className="font-bold">✅ Caja cuadrada perfectamente.</p>}
                                        {difference > 0 && <p className="font-bold">💙 Sobrante: +${difference.toLocaleString('es-AR')}</p>}
                                        {difference < 0 && <p className="font-bold">⚠️ Faltante: -${Math.abs(difference).toLocaleString('es-AR')}</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BOTÓN IMPRIMIR */}
                        <div className="pt-2 border-t border-slate-200 shrink-0 mt-1">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-[10px] uppercase transition-colors shadow-sm flex items-center justify-center gap-1.5 tracking-wide"
                            >
                                🖨️ Imprimir Resumen Diario
                            </button>
                        </div>

                    </div>

                </div>
            )}
        </div>
    );
}