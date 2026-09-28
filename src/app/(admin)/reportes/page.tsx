'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, ArrowLeft, RefreshCw, Printer, Maximize2, Minimize2, FileText, Filter, Database, Calendar, Layers, ShoppingBag, Users, Globe, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface MetricItem {
    label: string;
    val: string;
    var: string;
    up: boolean;
}

interface ChartBar {
    label: string;
    pct: number;
    val: string;
    color: string;
}

interface ReportResponse {
    success: boolean;
    titulo: string;
    metrics: MetricItem[];
    chartTitle: string;
    chartData: ChartBar[];
    hasData: boolean;
}

export default function ReportesPage() {
    const [reportData, setReportData] = useState<ReportResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [modulo, setModulo] = useState<'erp' | 'crm' | 'web'>('erp');
    const [tipoReporte, setTipoReporte] = useState('ventas');
    const [fechaDesde, setFechaDesde] = useState('2026-09-01');
    const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
    const [pantallaCompleta, setPantallaCompleta] = useState(false);

    useEffect(() => {
        if (modulo === 'erp') setTipoReporte('ventas');
        if (modulo === 'crm') setTipoReporte('historial');
        if (modulo === 'web') setTipoReporte('online_mas_vendidos');
    }, [modulo]);

    const cargarDatosReporte = useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                modulo,
                tipo: tipoReporte,
                desde: fechaDesde,
                hasta: fechaHasta
            });

            const res = await fetch(`/api/reportes?${queryParams.toString()}`);
            const json = await res.json();

            if (json.success) {
                setReportData(json);
            } else {
                setReportData({
                    success: false,
                    titulo: 'Sin Información',
                    metrics: [],
                    chartTitle: 'Sin Datos Registrados',
                    chartData: [],
                    hasData: false
                });
            }
        } catch (error) {
            console.error('Error al cargar reporte dinámico:', error);
            setReportData({
                success: false,
                titulo: 'Error de Conexión',
                metrics: [],
                chartTitle: 'Sin Datos',
                chartData: [],
                hasData: false
            });
        } finally {
            setLoading(false);
        }
    }, [modulo, tipoReporte, fechaDesde, fechaHasta]);

    useEffect(() => {
        cargarDatosReporte();
    }, [cargarDatosReporte]);

    const handleImprimir = () => {
        window.print();
    };

    const esReporteTemporal = ['ventas', 'cuenta_corriente', 'caja', 'costos'].includes(tipoReporte);

    return (
        <div className={`space-y-3 font-sans text-stone-800 pb-4 ${pantallaCompleta ? 'fixed inset-0 z-50 bg-stone-100 p-4 overflow-auto' : ''}`}>

            {/* ENCABEZADO SUPERIOR */}
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition text-stone-600">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-emerald-700" />
                            Centro de Reportes y Balance (Tienda de Plantas)
                        </h1>
                        <p className="text-[10px] text-stone-500">Datos conectados directamente con ventas, stock y cuentas corrientes.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={cargarDatosReporte}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                    <button
                        onClick={handleImprimir}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                        <Printer className="w-3 h-3 text-emerald-400" /> Imprimir / PDF
                    </button>
                    <button
                        onClick={() => setPantallaCompleta(!pantallaCompleta)}
                        className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
                        title={pantallaCompleta ? "Minimizar" : "Pantalla Completa"}
                    >
                        {pantallaCompleta ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* VISTA PARTIDA: CONFIGURADOR + VISUALIZACIÓN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

                {/* COLUMNA IZQUIERDA: CONFIGURADOR DE REPORTES (4 Columnas) */}
                <div className="lg:col-span-4 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3 print:hidden">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                        <Filter className="w-4 h-4 text-emerald-700" />
                        <h2 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">Configurador de Reporte</h2>
                    </div>

                    <div className="space-y-2.5">
                        {/* Selector de Módulo */}
                        <div>
                            <label className="text-[10px] font-bold text-stone-700 uppercase block mb-1 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-emerald-700" /> Seleccionar Módulo
                            </label>
                            <div className="grid grid-cols-3 gap-1 p-1 bg-stone-100 rounded-xl">
                                <button
                                    onClick={() => setModulo('erp')}
                                    className={`py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${modulo === 'erp' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    ERP
                                </button>
                                <button
                                    onClick={() => setModulo('crm')}
                                    className={`py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${modulo === 'crm' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    CRM
                                </button>
                                <button
                                    onClick={() => setModulo('web')}
                                    className={`py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${modulo === 'web' ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    WEB
                                </button>
                            </div>
                        </div>

                        {/* Selector de Sub-reporte según el Módulo */}
                        <div>
                            <label className="text-[10px] font-bold text-stone-700 uppercase block mb-1">Tipo de Reporte ({modulo.toUpperCase()})</label>
                            <select
                                value={tipoReporte}
                                onChange={(e) => setTipoReporte(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900 cursor-pointer"
                            >
                                {modulo === 'erp' && (
                                    <>
                                        <option value="ventas">📊 Reporte de Ventas y Facturación</option>
                                        <option value="cuenta_corriente">📑 Cuenta Corriente y Balance</option>
                                        <option value="stock">Control de Stock e Inventario</option>
                                        <option value="costos">Costos de Insumos y Materias Primas</option>
                                        <option value="rentabilidad">Rentabilidad por Producto</option>
                                        <option value="caja">Arqueos y Cierres de Turno</option>
                                    </>
                                )}
                                {modulo === 'crm' && (
                                    <>
                                        <option value="historial">Historial de Compras por Cliente</option>
                                        <option value="embudo">Embudo de Ventas y Prospectos</option>
                                        <option value="mas_vendidos">Productos Más Vendidos</option>
                                    </>
                                )}
                                {modulo === 'web' && (
                                    <>
                                        <option value="online_mas_vendidos">Productos Más Visitados Online</option>
                                        <option value="stock_sincronizado">Rendimiento de Stock Sincronizado</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {/* Rango de Fechas */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-stone-600 uppercase block mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-stone-500" /> Desde
                                </label>
                                <input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-1.5 text-[11px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-stone-600 uppercase block mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-stone-500" /> Hasta
                                </label>
                                <input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-1.5 text-[11px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
                                />
                            </div>
                        </div>

                        <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-0.5">
                            <span className="text-[10px] font-bold text-emerald-900 uppercase block flex items-center gap-1">
                                <Database className="w-3 h-3 text-emerald-700" /> Base de Datos Activa
                            </span>
                            <p className="text-[10px] text-emerald-700">Reflejando compras y transacciones recientes.</p>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DATOS Y GRÁFICO (8 Columnas) */}
                <div className="lg:col-span-8 space-y-3 print:col-span-12">
                    <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-100 pb-2.5 gap-2">
                            <div>
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block flex items-center gap-1">
                                    {modulo === 'erp' && <ShoppingBag className="w-3 h-3 text-emerald-600" />}
                                    {modulo === 'crm' && <Users className="w-3 h-3 text-emerald-600" />}
                                    {modulo === 'web' && <Globe className="w-3 h-3 text-emerald-600" />}
                                    Módulo {modulo.toUpperCase()} — {reportData?.titulo || 'Cargando...'}
                                </span>
                                <h3 className="text-xs font-black text-stone-900 uppercase">
                                    {reportData?.titulo || 'Generando Reporte...'}
                                </h3>
                            </div>
                            <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-lg font-bold">
                                {fechaDesde} al {fechaHasta}
                            </span>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center text-xs text-stone-400 animate-pulse font-semibold">
                                Consultando registros en la base de datos...
                            </div>
                        ) : !reportData || !reportData.hasData || reportData.metrics.length === 0 ? (
                            <div className="py-16 text-center space-y-2 bg-stone-50/60 rounded-2xl border border-dashed border-stone-300">
                                <AlertCircle className="w-7 h-7 text-amber-600 mx-auto" />
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-black text-stone-800 uppercase">Sin Datos</h4>
                                    <p className="text-[10px] text-stone-500 max-w-xs mx-auto">
                                        No se encontraron registros de este tipo entre las fechas {fechaDesde} y {fechaHasta}.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {reportData.metrics.map((m, idx) => (
                                        <div key={idx} className="bg-stone-50 p-3 rounded-xl border border-stone-200/60 space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-stone-500 uppercase">{m.label}</span>
                                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${m.up ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                                                    {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {m.var}
                                                </span>
                                            </div>
                                            <div className="text-lg font-black text-stone-900">{m.val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/80 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-extrabold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-emerald-700" /> {reportData.chartTitle}
                                        </span>
                                        <span className="text-[9px] text-stone-400 font-bold">
                                            {esReporteTemporal ? 'Evolución Temporal' : 'Ranking y Desglose'}
                                        </span>
                                    </div>

                                    {reportData.chartData.length === 0 ? (
                                        <div className="py-10 text-center text-xs text-stone-400 font-medium">
                                            Sin Datos para graficar.
                                        </div>
                                    ) : esReporteTemporal ? (
                                        /* 📊 GRÁFICO DE COLUMNAS VERTICALES (Altura reducida a h-48 para evitar solapamiento) */
                                        <div className="h-48 w-full flex items-end justify-between gap-3 pt-6 px-4 bg-white rounded-xl border border-stone-200/80 shadow-2xs">
                                            {reportData.chartData.map((bar, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                                                    <div className="absolute -top-7 bg-stone-900 text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 shadow-md">
                                                        {bar.label}: {bar.val}
                                                    </div>
                                                    <span className="text-[9px] font-black text-stone-500 opacity-0 group-hover:opacity-100 transition">
                                                        {bar.val}
                                                    </span>
                                                    <div
                                                        style={{ height: `${Math.max(bar.pct, 12)}%` }}
                                                        className={`w-full max-w-[44px] rounded-t-lg transition-all duration-500 flex flex-col justify-start items-center pt-1.5 text-white text-[9px] font-black shadow-xs ${bar.color || 'bg-emerald-600'}`}
                                                    >
                                                        {bar.pct > 18 && <span>{bar.pct}%</span>}
                                                    </div>
                                                    <span className="text-[9px] text-stone-600 font-bold truncate max-w-[60px] text-center" title={bar.label}>
                                                        {bar.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* 🏆 RANKING DE BARRAS HORIZONTALES */
                                        <div className="space-y-1.5">
                                            {reportData.chartData.map((bar, index) => (
                                                <div key={index} className="bg-white hover:bg-stone-50 border border-stone-200/70 p-2.5 rounded-xl transition space-y-1 shadow-2xs">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-lg bg-stone-900 text-white flex items-center justify-center text-[10px] font-black">
                                                                #{index + 1}
                                                            </span>
                                                            <span className="font-bold text-stone-800 uppercase tracking-tight text-[11px]" title={bar.label}>
                                                                {bar.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-extrabold text-emerald-700 text-xs">{bar.val}</span>
                                                            <span className="text-[10px] font-bold text-stone-400">({bar.pct}%)</span>
                                                        </div>
                                                    </div>

                                                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${index === 0 ? 'bg-emerald-600' : index === 1 ? 'bg-sky-600' : 'bg-stone-700'}`}
                                                            style={{ width: `${bar.pct}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}