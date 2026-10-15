'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface OrderItem {
    id: string;
    code: string;
    name: string;
    price: number;
    quantity: number;
}

interface Order {
    id: string;
    createdAt: string;
    total: number;
    paidAmount: number;
    pendingBalance: number;
    paymentStatus: string;
    status: 'REGISTRADO' | 'ENTREGADO' | 'RECLAMO';
    isPaid: boolean;
    paymentMethod: string;
    paymentReference?: string;
    channel: string;
    invoiced: boolean;
    invoiceNumber?: string;
    invoiceType?: string;
    client: string;
    clientEmail: string;
    isShipping: boolean;
    shippingAddress: string;
    notes?: string;
    items: OrderItem[];
}

function OperacionesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderIdParam = searchParams.get('orderId');
    const claimIdParam = searchParams.get('claimId');
    const dateParam = searchParams.get('date');
    const tabParam = searchParams.get('tab');

    // Saber si venimos desde el perfil de un cliente (si trae orderId o claimId en la URL)
    const isFromClient = Boolean(orderIdParam || claimIdParam);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const [dateFrom, setDateFrom] = useState(dateParam || todayStr);
    const [dateTo, setDateTo] = useState(dateParam || todayStr);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Solapas: 'PENDIENTES' | 'COBRAR' | 'FINALIZADAS' | 'RECLAMOS'
    const [activeTab, setActiveTab] = useState<'PENDIENTES' | 'COBRAR' | 'FINALIZADAS' | 'RECLAMOS'>(() => {
        if (tabParam && ['PENDIENTES', 'COBRAR', 'FINALIZADAS', 'RECLAMOS'].includes(tabParam)) {
            return tabParam as any;
        }
        return 'PENDIENTES';
    });

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Modales
    const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
    const [montoAplicarInput, setMontoAplicarInput] = useState<number>(0);
    const [paymentMethodInput, setPaymentMethodInput] = useState('EFECTIVO');
    const [paymentRefInput, setPaymentRefInput] = useState('');

    // Modal de Reclamo (Crear)
    const [claimModalOrder, setClaimModalOrder] = useState<Order | null>(null);
    const [claimReasonInput, setClaimReasonInput] = useState('');

    // Modal de Resolución de Reclamo
    const [resolveModalOrder, setResolveModalOrder] = useState<Order | null>(null);
    const [resolutionInput, setResolutionInput] = useState('');

    // Sincronizar estados cada vez que cambian los parámetros de la URL
    useEffect(() => {
        if (dateParam) {
            setDateFrom(dateParam);
            setDateTo(dateParam);
        }
        if (tabParam && ['PENDIENTES', 'COBRAR', 'FINALIZADAS', 'RECLAMOS'].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [searchParams]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            let url = `/api/ventas?from=${dateFrom}&to=${dateTo}`;
            if (orderIdParam) {
                url = `/api/ventas?orderId=${orderIdParam}`;
            } else if (claimIdParam) {
                url = `/api/ventas?claimId=${claimIdParam}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);

                // Si viene un ID específico o un claimId, ajustamos la fecha y solapa automáticamente
                if ((orderIdParam || claimIdParam) && data.length > 0) {
                    const foundOrder = data[0];
                    const orderDate = foundOrder.createdAt.split('T')[0];
                    setDateFrom(orderDate);
                    setDateTo(orderDate);

                    if (!tabParam) {
                        if (claimIdParam || foundOrder.status === 'RECLAMO' || (foundOrder.notes && foundOrder.notes.includes('RECLAMO'))) {
                            setActiveTab('RECLAMOS');
                        } else if (foundOrder.pendingBalance > 0) {
                            setActiveTab('COBRAR');
                        } else if (foundOrder.status === 'ENTREGADO') {
                            setActiveTab('FINALIZADAS');
                        } else {
                            setActiveTab('PENDIENTES');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar operaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [dateFrom, dateTo, orderIdParam, claimIdParam]);

    // Registrar Reclamo con Motivo
    const handleConfirmClaim = async () => {
        if (!claimModalOrder || !claimReasonInput.trim()) return;

        try {
            const res = await fetch('/api/ventas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: claimModalOrder.id,
                    status: 'RECLAMO',
                    notes: `RECLAMO: ${claimReasonInput.trim().toUpperCase()}`
                }),
            });

            if (res.ok) {
                setClaimModalOrder(null);
                setClaimReasonInput('');
                loadOrders();
            }
        } catch (error) {
            console.error('Error al registrar reclamo:', error);
        }
    };

    // Resolver Reclamo con Nota
    const handleConfirmResolution = async () => {
        if (!resolveModalOrder || !resolutionInput.trim()) return;

        try {
            const res = await fetch('/api/ventas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: resolveModalOrder.id,
                    status: 'ENTREGADO',
                    notes: `RESUELTO: ${resolutionInput.trim().toUpperCase()}`
                }),
            });

            if (res.ok) {
                setResolveModalOrder(null);
                setResolutionInput('');
                loadOrders();
            }
        } catch (error) {
            console.error('Error al resolver reclamo:', error);
        }
    };

    const handleSavePayment = async () => {
        if (!paymentModalOrder || montoAplicarInput <= 0) return;

        const paymentPayload = {
            saleId: paymentModalOrder.id,
            amount: montoAplicarInput,
            method: paymentMethodInput,
            reference: paymentRefInput
        };

        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentPayload)
            });

            if (res.ok) {
                setPaymentModalOrder(null);
                loadOrders();
            }
        } catch (error) {
            console.error('Error al guardar pago:', error);
        }
    };

    // Filtrados para las 4 solapas
    const pendientesEntrega = useMemo(() => orders.filter(o => o.status === 'REGISTRADO'), [orders]);
    const cuentasACobrar = useMemo(() => orders.filter(o => o.pendingBalance > 0), [orders]);
    const ventasFinalizadas = useMemo(() => orders.filter(o => o.status === 'ENTREGADO' && o.pendingBalance === 0), [orders]);
    const reclamosIncidencias = useMemo(() => orders.filter(o =>
        o.status === 'RECLAMO' || (o.notes && (o.notes.includes('RECLAMO') || o.notes.includes('RESUELTO')))
    ), [orders]);

    const currentList = useMemo(() => {
        if (activeTab === 'PENDIENTES') return pendientesEntrega;
        if (activeTab === 'COBRAR') return cuentasACobrar;
        if (activeTab === 'FINALIZADAS') return ventasFinalizadas;
        return reclamosIncidencias;
    }, [activeTab, pendientesEntrega, cuentasACobrar, ventasFinalizadas, reclamosIncidencias]);

    const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return currentList.slice(start, start + itemsPerPage);
    }, [currentList, currentPage]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 rounded-2xl border border-stone-200/80 shadow-sm p-3 md:p-4 space-y-3 font-sans text-stone-800">

            {/* ENCABEZADO Y FILTROS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs shrink-0">
                <div>
                    <h1 className="text-sm font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
                        📋 Módulo de Operaciones, Logística y Reclamos
                    </h1>
                    <p className="text-[10px] text-stone-500 font-medium">
                        Control de entregas, saldos pendientes, historial y gestión de incidencias de productos.
                    </p>
                </div>

                {/* CONTENEDOR DE BOTÓN VOLVER (CONDICIONAL) Y FILTROS DE FECHA */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Botón Volver visible solo si llega desde la página de clientes */}
                    {isFromClient && (
                        <button
                            onClick={() => router.back()}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Volver al perfil del cliente"
                        >
                            ← Volver al Cliente
                        </button>
                    )}

                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                        <span className="text-[9px] font-bold text-stone-400 uppercase">Desde:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="text-xs font-mono font-bold text-stone-700 bg-transparent outline-none cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1">
                        <span className="text-[9px] font-bold text-stone-400 uppercase">Hasta:</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="text-xs font-mono font-bold text-stone-700 bg-transparent outline-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* 4 SOLAPAS (TABS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                <button
                    onClick={() => setActiveTab('PENDIENTES')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer border ${activeTab === 'PENDIENTES' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'}`}
                >
                    <span className="truncate">📦 Pendientes</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'PENDIENTES' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                        {pendientesEntrega.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('COBRAR')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer border ${activeTab === 'COBRAR' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'}`}
                >
                    <span className="truncate">💳 Cuentas a Cobrar</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'COBRAR' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
                        {cuentasACobrar.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('FINALIZADAS')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer border ${activeTab === 'FINALIZADAS' ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'}`}
                >
                    <span className="truncate">✅ Finalizadas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'FINALIZADAS' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        {ventasFinalizadas.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('RECLAMOS')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex justify-between items-center transition cursor-pointer border ${activeTab === 'RECLAMOS' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'}`}
                >
                    <span className="truncate">⚠️ Reclamos</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${activeTab === 'RECLAMOS' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                        {reclamosIncidencias.length}
                    </span>
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                <div className="p-2.5 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center shrink-0">
                    <h3 className="text-xs font-black uppercase text-stone-600 tracking-wider">
                        {activeTab === 'PENDIENTES' && '📦 Pedidos en espera de despacho o retiro'}
                        {activeTab === 'COBRAR' && '💳 Saldos pendientes asociados a clientes'}
                        {activeTab === 'FINALIZADAS' && '✅ Historial de ventas entregadas y saldadas'}
                        {activeTab === 'RECLAMOS' && '⚠️ Historial de incidencias, devoluciones y reclamos de productos'}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-stone-500">
                        Mostrando {paginatedItems.length} de {currentList.length} registros
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                        <div className="text-center py-12 text-stone-400 text-xs font-bold uppercase">Cargando operaciones...</div>
                    ) : currentList.length === 0 ? (
                        <div className="text-center py-16 text-stone-400 italic text-xs">
                            No hay registros en esta sección para el rango de fechas seleccionado.
                        </div>
                    ) : activeTab === 'FINALIZADAS' ? (
                        /* VISTA TABULAR PARA FINALIZADAS */
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-stone-50 text-[10px] uppercase text-stone-500 font-bold border-b border-stone-200 sticky top-0">
                                    <tr>
                                        <th className="p-2">ID / Fecha</th>
                                        <th className="p-2">Cliente</th>
                                        <th className="p-2">Canal</th>
                                        <th className="p-2">Pago</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 font-medium">
                                    {paginatedItems.map(ord => (
                                        <tr key={ord.id} className="hover:bg-stone-50 transition">
                                            <td className="p-2 font-mono">
                                                <span className="font-bold text-emerald-700">#{ord.id.slice(-6).toUpperCase()}</span>
                                                <span className="block text-[9px] text-stone-400">
                                                    {new Date(ord.createdAt).toLocaleDateString()} {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="p-2 font-bold uppercase text-stone-800">{ord.client}</td>
                                            <td className="p-2">
                                                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded text-[9px] font-bold">
                                                    {ord.channel}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                                                    PAGADO
                                                </span>
                                            </td>
                                            <td className="p-2 text-right font-mono font-bold text-stone-900">
                                                $ {ord.total.toLocaleString()}
                                            </td>
                                            <td className="p-2 text-center flex justify-center gap-1">
                                                <button
                                                    onClick={() => setClaimModalOrder(ord)}
                                                    className="text-[9px] text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition cursor-pointer"
                                                    title="Reportar reclamo"
                                                >
                                                    ⚠️ Reclamo
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        await fetch('/api/ventas', {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ id: ord.id, status: 'REGISTRADO' }),
                                                        });
                                                        loadOrders();
                                                    }}
                                                    className="text-[9px] text-stone-500 hover:text-stone-800 font-bold bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded transition cursor-pointer"
                                                    title="Reabrir operación"
                                                >
                                                    ↺ Reabrir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* VISTA DE MINI-TARJETAS COMPACTAS PARA PENDIENTES, COBRAR Y RECLAMOS */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {paginatedItems.map(ord => (
                                <div key={ord.id} className="p-3 bg-stone-50/90 border border-stone-200 rounded-xl space-y-1.5 text-xs flex flex-col justify-between shadow-2xs">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-start font-bold text-stone-900 border-b border-stone-200 pb-1">
                                            <div>
                                                <span className="font-mono text-emerald-700 text-[10px]">#{ord.id.slice(-6).toUpperCase()}</span>
                                                <h4 className="text-xs uppercase truncate max-w-[160px] font-extrabold">{ord.client}</h4>
                                            </div>
                                            <span className="font-mono font-black text-xs text-stone-900">$ {ord.total.toLocaleString()}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-stone-500">Canal: <strong className="text-stone-700">{ord.channel}</strong></span>
                                            <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${ord.status === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800' :
                                                ord.status === 'RECLAMO' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {ord.status}
                                            </span>
                                        </div>

                                        {ord.notes && (
                                            <div className="p-1 bg-indigo-50 border border-indigo-200 rounded text-[9px] font-medium text-indigo-900 truncate">
                                                💬 {ord.notes}
                                            </div>
                                        )}

                                        {ord.pendingBalance > 0 && (
                                            <div className="p-1 bg-rose-50 border border-rose-200 rounded text-[10px] font-bold text-rose-700 flex justify-between">
                                                <span>Deuda:</span>
                                                <span className="font-mono">$ {ord.pendingBalance.toLocaleString()}</span>
                                            </div>
                                        )}

                                        {ord.isShipping && (
                                            <div className="text-[9px] text-stone-600 bg-amber-50/80 p-1 rounded border border-amber-200 truncate">
                                                🚚 {ord.shippingAddress}
                                            </div>
                                        )}

                                        <div className="text-[9px] text-stone-500 truncate">
                                            <strong>Ítems:</strong> {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                        </div>
                                    </div>

                                    {/* ACCIONES RÁPIDAS EN MINI-TARJETA */}
                                    <div className="pt-1.5 border-t border-stone-200 flex items-center gap-1">
                                        {activeTab === 'RECLAMOS' ? (
                                            <button
                                                onClick={() => setResolveModalOrder(ord)}
                                                className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px] uppercase transition cursor-pointer text-center shadow-2xs"
                                            >
                                                ✓ Resolver Reclamo
                                            </button>
                                        ) : (
                                            <>
                                                {ord.status !== 'ENTREGADO' && (
                                                    <button
                                                        onClick={async () => {
                                                            await fetch('/api/ventas', {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ id: ord.id, status: 'ENTREGADO' }),
                                                            });
                                                            loadOrders();
                                                        }}
                                                        className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px] uppercase transition cursor-pointer text-center shadow-2xs"
                                                    >
                                                        ✓ Entregado
                                                    </button>
                                                )}

                                                {ord.pendingBalance > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setMontoAplicarInput(ord.pendingBalance);
                                                            setPaymentModalOrder(ord);
                                                        }}
                                                        className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[9px] uppercase transition cursor-pointer text-center shadow-2xs"
                                                    >
                                                        💳 Cobrar
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setClaimModalOrder(ord)}
                                                    className="py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold text-[9px] transition cursor-pointer"
                                                    title="Marcar como Reclamo"
                                                >
                                                    ⚠️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PAGINADOR INFERIOR */}
                {totalPages > 1 && (
                    <div className="p-2.5 border-t border-stone-100 bg-stone-50/50 flex justify-between items-center shrink-0">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 rounded font-bold text-xs transition cursor-pointer shadow-2xs"
                        >
                            ← Anterior
                        </button>
                        <span className="text-xs font-mono font-bold text-stone-600">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 rounded font-bold text-xs transition cursor-pointer shadow-2xs"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>

            {/* MODAL DE REPORTE DE RECLAMO (CREAR) */}
            {claimModalOrder && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-stone-900">
                                ⚠️ Registrar Reclamo (Orden #{claimModalOrder.id.slice(-6)})
                            </h3>
                            <button onClick={() => setClaimModalOrder(null)} className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer">✕</button>
                        </div>
                        <div className="space-y-3 text-xs bg-stone-50 p-3 rounded-xl border">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Cliente:</span>
                                <strong className="text-stone-800 uppercase">{claimModalOrder.client}</strong>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase">Motivo del Reclamo / Incidencia *</label>
                            <textarea
                                rows={3}
                                placeholder="EJ: PLANTA ROTADA, FALTÓ UN ACCESORIO O ERROR DE ENVÍO..."
                                value={claimReasonInput}
                                onChange={(e) => setClaimReasonInput(e.target.value)}
                                className="w-full border border-stone-300 rounded p-2 uppercase font-medium bg-stone-50 outline-none text-xs"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setClaimModalOrder(null)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs uppercase transition cursor-pointer">Cancelar</button>
                            <button onClick={handleConfirmClaim} disabled={!claimReasonInput.trim()} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs uppercase shadow transition cursor-pointer">Guardar Reclamo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE RESOLUCIÓN DE RECLAMO */}
            {resolveModalOrder && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-stone-900">
                                ✓ Resolver Reclamo (Orden #{resolveModalOrder.id.slice(-6)})
                            </h3>
                            <button onClick={() => setResolveModalOrder(null)} className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer">✕</button>
                        </div>
                        <div className="space-y-3 text-xs bg-stone-50 p-3 rounded-xl border">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Cliente:</span>
                                <strong className="text-stone-800 uppercase">{resolveModalOrder.client}</strong>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase">Nota de Resolución / Solución Aplicada *</label>
                            <textarea
                                rows={3}
                                placeholder="EJ: SE REENVÍO LA PLANTA NUEVA, SE HIZO DEVOLUCIÓN DE DINERO, ETC..."
                                value={resolutionInput}
                                onChange={(e) => setResolutionInput(e.target.value)}
                                className="w-full border border-stone-300 rounded p-2 uppercase font-medium bg-stone-50 outline-none text-xs"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setResolveModalOrder(null)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs uppercase transition cursor-pointer">Cancelar</button>
                            <button onClick={handleConfirmResolution} disabled={!resolutionInput.trim()} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs uppercase shadow transition cursor-pointer">Confirmar y Cerrar Reclamo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE COBRO RÁPIDO */}
            {paymentModalOrder && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-stone-900">
                                💳 Registrar Cobro (Orden #{paymentModalOrder.id.slice(-6)})
                            </h3>
                            <button onClick={() => setPaymentModalOrder(null)} className="text-stone-400 hover:text-stone-700 font-bold text-sm cursor-pointer">✕</button>
                        </div>
                        <div className="space-y-3 text-xs bg-stone-50 p-3 rounded-xl border">
                            <div className="flex justify-between">
                                <span className="text-stone-500">Cliente:</span>
                                <strong className="text-stone-800 uppercase">{paymentModalOrder.client}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-500">Deuda Restante:</span>
                                <strong className="font-mono text-rose-600">$ {paymentModalOrder.pendingBalance.toLocaleString()}</strong>
                            </div>
                        </div>
                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Monto a Abonar [$]</label>
                                <input
                                    type="number"
                                    value={montoAplicarInput}
                                    onChange={(e) => setMontoAplicarInput(parseFloat(e.target.value) || 0)}
                                    className="w-full border border-stone-300 rounded p-2 font-mono font-bold text-sm bg-stone-50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Medio de Pago</label>
                                <select
                                    value={paymentMethodInput}
                                    onChange={(e) => setPaymentMethodInput(e.target.value)}
                                    className="w-full border border-stone-300 rounded p-2 font-bold uppercase bg-stone-50 outline-none"
                                >
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                    <option value="DEBITO">Débito</option>
                                    <option value="CREDITO">Crédito</option>
                                    <option value="MERCADOPAGO">MercadoPago</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Nro. de Referencia (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="EJ: TR-123456"
                                    value={paymentRefInput}
                                    onChange={(e) => setPaymentRefInput(e.target.value.toUpperCase())}
                                    className="w-full border border-stone-300 rounded p-2 uppercase font-mono bg-stone-50 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setPaymentModalOrder(null)} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs uppercase transition cursor-pointer">Cancelar</button>
                            <button onClick={handleSavePayment} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase shadow transition cursor-pointer">Confirmar Cobro</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OperacionesPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-xs font-bold uppercase text-stone-400">Cargando módulo de operaciones...</div>}>
            <OperacionesContent />
        </Suspense>
    );
}