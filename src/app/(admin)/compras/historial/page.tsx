'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getPurchasesHistory, getSuppliersForSelect, receivePurchaseBatch } from '@/actions/purchase-actions';

export default function HistorialComprasPage() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');

    // Estado para el modal de ítems
    const [selectedPurchaseModal, setSelectedPurchaseModal] = useState<any | null>(null);

    // Estados para notificaciones y modales de confirmación
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [isReceiving, setIsReceiving] = useState(false);

    // Paginación principal en 7 registros por página
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 7;

    useEffect(() => {
        loadData();
    }, []);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 4000);
    };

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
            showMessage('error', 'Error al cargar los datos del historial.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = async () => {
        setLoading(true);
        try {
            const data = await getPurchasesHistory({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                supplierId: selectedSupplierId || undefined
            });
            setPurchases(data);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error al filtrar:', err);
            showMessage('error', 'Error al aplicar los filtros.');
        } finally {
            setLoading(false);
        }
    };

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

    const handleReceiveConfirm = async () => {
        if (!confirmingId) return;
        setIsReceiving(true);
        try {
            const res = await receivePurchaseBatch(confirmingId);
            if (res.error) {
                showMessage('error', res.error);
            } else {
                showMessage('success', '¡Mercadería recibida con éxito! Stock comercial actualizado.');
                await loadData();
            }
        } catch (err: any) {
            showMessage('error', err.message || 'Error al procesar la recepción.');
        } finally {
            setIsReceiving(false);
            setConfirmingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-stone-100 p-3 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto space-y-3">

                {/* NOTIFICACIÓN FLOTANTE */}
                {notification && (
                    <div className={`p-3 rounded-xl text-xs font-bold uppercase flex items-center justify-between shadow-md transition-all ${notification.type === 'success'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                        <span>{notification.type === 'success' ? '✅ ' : '⚠️ '}{notification.text}</span>
                        <button onClick={() => setNotification(null)} className="text-current font-black ml-4 cursor-pointer">✕</button>
                    </div>
                )}

                {/* ENCABEZADO */}
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

                {/* FILTROS + TOTALES */}
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

                {/* TABLA PRINCIPAL */}
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
                                    <th className="p-2.5 text-center">Estado / Acción</th>
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
                                    paginatedPurchases.map(p => {
                                        const isReceived = p.batch?.status === 'RECIBIDO';
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
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
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => setSelectedPurchaseModal(p)}
                                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold uppercase transition-colors cursor-pointer"
                                                        >
                                                            👁️ Ver Ítems
                                                        </button>
                                                        {isReceived ? (
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-black uppercase tracking-wider">
                                                                ✓ RECIBIDO
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmingId(p.id)}
                                                                className="text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded font-bold uppercase transition-colors cursor-pointer shadow-xs"
                                                            >
                                                                📦 Recibir
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINADOR */}
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

            {/* MODAL / POPUP FLOTANTE PARA VER ÍTEMS */}
            {selectedPurchaseModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl p-4 space-y-3 font-sans max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 shrink-0">
                            <div>
                                <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5 text-emerald-800">
                                    📦 Detalle de Ítems — {selectedPurchaseModal.docType} {selectedPurchaseModal.docNumber || 'S/N'}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium uppercase">
                                    Proveedor: <strong className="text-slate-800">{selectedPurchaseModal.supplier?.name}</strong> | Fecha: {new Date(selectedPurchaseModal.date).toLocaleDateString('es-AR')}
                                </p>
                            </div>
                            <button onClick={() => setSelectedPurchaseModal(null)} className="text-slate-400 hover:text-slate-700 font-bold text-base px-2 cursor-pointer">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-scroll max-h-96 rounded border border-slate-200">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0 border-b border-slate-200 z-10 shadow-2xs">
                                    <tr>
                                        <th className="p-2 pl-3 bg-slate-50">Código</th>
                                        <th className="p-2 bg-slate-50">Producto</th>
                                        <th className="p-2 text-center bg-slate-50">Estado Producto</th>
                                        <th className="p-2 text-center bg-slate-50">Cantidad</th>
                                        <th className="p-2 text-right bg-slate-50">Costo Unit.</th>
                                        <th className="p-2 text-right pr-3 bg-slate-50">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {selectedPurchaseModal.items.map((it: any) => {
                                        const isReceived = selectedPurchaseModal.batch?.status === 'RECIBIDO';
                                        const subtotalItem = (it.quantity || 0) * (it.unitCost || 0);
                                        return (
                                            <tr key={it.id} className="hover:bg-slate-50">
                                                <td className="p-2 pl-3 font-mono font-bold text-slate-500 text-[11px]">{it.product?.code || 'S/C'}</td>
                                                <td className="p-2 font-bold uppercase text-slate-800">{it.product?.name || 'PRODUCTO'}</td>
                                                <td className="p-2 text-center">
                                                    {isReceived ? (
                                                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">DISPONIBLE</span>
                                                    ) : (
                                                        <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">STAND-BY</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-center font-mono font-bold text-slate-700">{it.quantity} u.</td>
                                                <td className="p-2 text-right font-mono text-slate-600">$ {(it.unitCost || 0).toLocaleString()}</td>
                                                <td className="p-2 text-right pr-3 font-mono font-bold text-emerald-700">$ {subtotalItem.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center shrink-0">
                            <span className="text-xs text-slate-500 font-mono">
                                Total renglones: <strong>{selectedPurchaseModal.items.length}</strong>
                            </span>
                            <button
                                onClick={() => setSelectedPurchaseModal(null)}
                                className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-bold uppercase hover:bg-slate-700 shadow-xs cursor-pointer"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN DE RECEPCIÓN */}
            {confirmingId && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-sm p-4 space-y-3 font-sans">
                        <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5 text-emerald-800">
                            📦 Confirmar Recepción Física
                        </h3>
                        <p className="text-xs text-slate-600">
                            ¿Confirma la recepción de este comprobante? Esto liberará el stock al inventario comercial del vivero de forma definitiva.
                        </p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setConfirmingId(null)}
                                disabled={isReceiving}
                                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-bold uppercase hover:bg-slate-200 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReceiveConfirm}
                                disabled={isReceiving}
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold uppercase shadow-xs cursor-pointer flex items-center gap-1"
                            >
                                {isReceiving ? 'Procesando...' : 'Confirmar Recepción'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}