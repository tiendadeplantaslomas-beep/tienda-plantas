'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getPurchasesHistory, getSuppliersForSelect } from '@/actions/purchase-actions';

export default function HistorialComprasPage() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // Primer día del mes actual
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

    // Paginación de la tabla principal
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12; // Aumentado a 12 para aprovechar mejor la pantalla

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [supData, purchaseData] = await Promise.all([
                getSuppliersForSelect(),
                getPurchasesHistory({ startDate, endDate, supplierId: selectedSupplierId || undefined })
            ]);
            setSuppliers(supData);
            setPurchases(purchaseData);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error cargando historial:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = async () => {
        setLoading(true);
        const data = await getPurchasesHistory({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            supplierId: selectedSupplierId || undefined
        });
        setPurchases(data);
        setCurrentPage(1);
        setLoading(false);
    };

    // Totales
    const totalInvertido = useMemo(() => {
        return purchases.reduce((acc, p) => acc + (p.total || 0), 0);
    }, [purchases]);

    const totalFletes = useMemo(() => {
        return purchases.reduce((acc, p) => acc + (p.otherCostsTotal || 0), 0);
    }, [purchases]);

    const totalPages = Math.ceil(purchases.length / pageSize) || 1;
    const paginatedPurchases = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return purchases.slice(start, start + pageSize);
    }, [purchases, currentPage]);

    return (
        <div className="min-h-screen bg-stone-100 p-3 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto space-y-3">

                {/* ENCABEZADO SUPERCOMPACTO */}
                <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                        <h1 className="text-base font-black uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                            📜 Historial de Comprobantes de Compra
                        </h1>
                    </div>
                    <Link
                        href="/compras"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase shadow-sm transition-colors flex items-center gap-1"
                    >
                        ➕ Nueva Carga
                    </Link>
                </div>

                {/* BARRA ÚNICA COMPACTA: FILTROS + TOTALES */}
                <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">DESDE</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border border-slate-200 rounded p-1 font-medium bg-slate-50 outline-none text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">HASTA</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border border-slate-200 rounded p-1 font-medium bg-slate-50 outline-none text-xs"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 mb-0.5">PROVEEDOR</label>
                            <select
                                value={selectedSupplierId}
                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                                className="border border-slate-200 rounded p-1 font-bold uppercase bg-slate-50 outline-none text-xs max-w-[200px]"
                            >
                                <option value="">TODOS</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="self-end">
                            <button
                                onClick={handleFilter}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded font-bold uppercase shadow-sm cursor-pointer text-xs"
                            >
                                🔍 Filtrar
                            </button>
                        </div>
                    </div>

                    {/* RESUMEN DE TOTALES EN LÍNEA */}
                    <div className="flex items-center gap-4 bg-slate-900 text-white px-3 py-1.5 rounded-lg">
                        <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Invertido:</span>
                            <span className="text-base font-black font-mono text-emerald-400">$ {totalInvertido.toLocaleString()}</span>
                        </div>
                        <div className="border-l border-slate-700 pl-3 text-[10px] text-slate-300">
                            <div>Comprobantes: <strong className="text-white">{purchases.length}</strong></div>
                            <div>Fletes: <strong className="text-amber-400">$ {totalFletes.toLocaleString()}</strong></div>
                        </div>
                    </div>
                </div>

                {/* TABLA DE COMPROBANTES HISTÓRICOS */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-2.5">Fecha</th>
                                    <th className="p-2.5">Tipo / Nº Doc</th>
                                    <th className="p-2.5">Proveedor</th>
                                    <th className="p-2.5 text-center">Ítems</th>
                                    <th className="p-2.5 text-right">Subtotal</th>
                                    <th className="p-2.5 text-right">Flete/Gastos</th>
                                    <th className="p-2.5 text-right">Total Final</th>
                                    <th className="p-2.5 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                                            Cargando comprobantes...
                                        </td>
                                    </tr>
                                ) : paginatedPurchases.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-slate-400 italic">
                                            No se encontraron compras en el rango de fechas seleccionado.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPurchases.map(p => (
                                        <React.Fragment key={p.id}>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2.5 font-mono text-slate-600">
                                                    {new Date(p.date).toLocaleDateString('es-AR')}
                                                </td>
                                                <td className="p-2.5 uppercase font-bold text-slate-800">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] mr-1">
                                                        {p.docType || 'COMPRA'}
                                                    </span>
                                                    <span className="font-mono">{p.docNumber || 'S/N'}</span>
                                                </td>
                                                <td className="p-2.5 uppercase font-bold text-slate-800">
                                                    {p.supplier?.name || 'S/N'}
                                                </td>
                                                <td className="p-2.5 text-center font-bold font-mono">
                                                    {p.items?.length || 0}
                                                </td>
                                                <td className="p-2.5 text-right font-mono">
                                                    $ {(p.subtotal || 0).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-amber-600">
                                                    $ {(p.otherCostsTotal || 0).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-700 text-sm">
                                                    $ {(p.total || 0).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        onClick={() => setExpandedPurchaseId(expandedPurchaseId === p.id ? null : p.id)}
                                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer"
                                                    >
                                                        {expandedPurchaseId === p.id ? '▲ Ocultar' : '▼ Ver Ítems'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* LISTA COMPACTA DE PRODUCTOS CON SCROLL Y BARRA */}
                                            {expandedPurchaseId === p.id && (
                                                <tr className="bg-slate-100/70">
                                                    <td colSpan={8} className="p-2 border-y border-slate-200">
                                                        <div className="bg-white rounded-lg border border-slate-200 p-2 space-y-1.5 shadow-2xs">
                                                            <div className="flex justify-between items-center px-1 border-b border-slate-100 pb-1">
                                                                <h4 className="font-black text-[9px] uppercase text-slate-400 tracking-wider">
                                                                    Ítems Ingresados — Comprobante N° {p.docNumber || 'S/N'}
                                                                </h4>
                                                                <span className="text-[10px] text-slate-500 font-mono">
                                                                    Total renglones: <strong>{p.items.length}</strong>
                                                                </span>
                                                            </div>

                                                            <div className="max-h-52 overflow-y-auto rounded border border-slate-100 pr-1">
                                                                <table className="w-full text-left text-[11px]">
                                                                    <thead className="bg-slate-50 text-[9px] uppercase text-slate-400 font-bold sticky top-0 border-b border-slate-100 z-10">
                                                                        <tr>
                                                                            <th className="p-1 pl-2 bg-slate-50">Código</th>
                                                                            <th className="p-1 bg-slate-50">Producto</th>
                                                                            <th className="p-1 text-center bg-slate-50">Cantidad</th>
                                                                            <th className="p-1 text-right bg-slate-50">Costo Unit.</th>
                                                                            <th className="p-1 text-right pr-2 bg-slate-50">Subtotal</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50 font-medium">
                                                                        {p.items.map((it: any) => {
                                                                            const subtotalItem = (it.quantity || 0) * (it.unitCost || 0);
                                                                            return (
                                                                                <tr key={it.id} className="hover:bg-slate-50">
                                                                                    <td className="p-1 pl-2 font-mono font-bold text-slate-500 text-[10px]">
                                                                                        {it.product?.code || 'S/C'}
                                                                                    </td>
                                                                                    <td className="p-1 font-bold uppercase text-slate-800">
                                                                                        {it.product?.name || 'PRODUCTO'}
                                                                                    </td>
                                                                                    <td className="p-1 text-center font-mono font-bold text-slate-700">
                                                                                        {it.quantity} u.
                                                                                    </td>
                                                                                    <td className="p-1 text-right font-mono text-slate-600">
                                                                                        $ {(it.unitCost || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="p-1 text-right pr-2 font-mono font-bold text-emerald-700">
                                                                                        $ {subtotalItem.toLocaleString()}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINADOR INFERIOR */}
                    {!loading && purchases.length > 0 && (
                        <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs">
                            <span className="text-slate-500 font-medium text-[11px]">
                                Mostrando del <strong className="text-slate-800">{((currentPage - 1) * pageSize) + 1}</strong> al <strong className="text-slate-800">{Math.min(currentPage * pageSize, purchases.length)}</strong> de <strong className="text-slate-800">{purchases.length}</strong> comprobantes
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-2.5 py-1 bg-white border border-slate-200 rounded font-bold uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
                                >
                                    Anterior
                                </button>
                                <span className="px-2 py-1 font-mono font-bold text-slate-700 text-[11px]">
                                    Pág. {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-2.5 py-1 bg-white border border-slate-200 rounded font-bold uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer text-[11px]"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}