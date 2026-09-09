'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

interface CartItem {
    id: string;
    code: string;
    name: string;
    price: number;
    quantity: number;
}

interface Order {
    id: string;
    createdAt: string;
    client: string;
    clientEmail: string;
    total: number;
    status: 'PENDIENTE' | 'ATENDIDO' | 'ENTREGADO';
    paymentMethod: string;
    isShipping: boolean;
    shippingAddress: string;
    items: CartItem[];
}

export default function HistorialVentasPage() {
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // Por defecto consultamos el mes actual o una fecha inicial amplia
    const [dateFrom, setDateFrom] = useState('2026-09-01');
    const [dateTo, setDateTo] = useState(todayStr);
    const [statusFilter, setStatusFilter] = useState<string>('TODOS');
    const [searchQuery, setSearchQuery] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4;

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // CARGA DE DATOS DESDE TU API (TIDB CLOUD) CON FILTRO DE FECHAS
    useEffect(() => {
        const fetchOrdersFromDatabase = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/ventas?from=${dateFrom}&to=${dateTo}`);
                if (!response.ok) throw new Error('Error al conectar con la base de datos');

                const data = await response.json();
                setOrders(data);
            } catch (error) {
                console.error("Error al cargar el historial:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrdersFromDatabase();
    }, [dateFrom, dateTo]);

    // Filtrado local adicional (por Estado y Búsqueda de texto)
    const filteredOrders = useMemo(() => {
        return orders.filter(ord => {
            const matchesStatus = statusFilter === 'TODOS' || ord.status === statusFilter;
            const matchesQuery =
                ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ord.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ord.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesQuery;
        });
    }, [orders, statusFilter, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchQuery]);

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage]);

    const totalRevenue = useMemo(() => {
        return filteredOrders.reduce((acc, ord) => acc + ord.total, 0);
    }, [filteredOrders]);

    const averageTicket = useMemo(() => {
        return filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0;
    }, [filteredOrders, totalRevenue]);

    const paymentBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        filteredOrders.forEach(ord => {
            const method = ord.paymentMethod || 'OTRO';
            breakdown[method] = (breakdown[method] || 0) + ord.total;
        });
        return breakdown;
    }, [filteredOrders]);

    const statusBreakdown = useMemo(() => {
        const breakdown = { PENDIENTE: 0, ATENDIDO: 0, ENTREGADO: 0 };
        filteredOrders.forEach(ord => {
            if (breakdown[ord.status] !== undefined) {
                breakdown[ord.status] += 1;
            }
        });
        return breakdown;
    }, [filteredOrders]);

    // ACTUALIZAR ESTADO EN LA BASE DE DATOS (TIDB)
    const handleUpdateStatus = async (orderId: string, newStatus: 'PENDIENTE' | 'ATENDIDO' | 'ENTREGADO') => {
        try {
            const response = await fetch('/api/ventas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: newStatus }),
            });

            if (!response.ok) throw new Error('Error al actualizar');

            const updatedOrder = await response.json();

            // Actualizar estado localmente reflejando la BD
            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder(updatedOrder);
            }
        } catch (error) {
            console.error("No se pudo actualizar el estado:", error);
            alert("Error al actualizar el estado en la base de datos.");
        }
    };

    return (
        <div className="flex flex-col w-full bg-slate-100 text-slate-800 font-sans p-2.5 lg:p-3.5 space-y-2.5">

            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <h1 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                        📊 Dashboard Analítico y Historial de Ventas
                    </h1>
                    <p className="text-[10px] text-slate-500">
                        Sincronizado en tiempo real con TiDB Cloud y Prisma.
                    </p>
                </div>
                <Link
                    href="/ventas"
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] uppercase transition-colors shadow-xs"
                >
                    ← Volver al POS
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">

                {/* COLUMNA IZQUIERDA: Filtros, Métricas y Gráficos */}
                <div className="lg:col-span-5 space-y-2.5">

                    {/* FILTROS */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="flex justify-between items-center">
                            <h2 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Filtros de Fecha y Estado</h2>
                            <span className="text-[9px] font-mono text-emerald-600 font-bold">● TiDB Cloud</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">DESDE</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full text-[11px] border border-slate-200 rounded-lg p-1 font-mono font-bold bg-slate-50 outline-none"
                                />
                            </div>
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">HASTA</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full text-[11px] border border-slate-200 rounded-lg p-1 font-mono font-bold bg-slate-50 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">ESTADO</span>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full text-[11px] border border-slate-200 rounded-lg p-1 font-bold uppercase bg-slate-50 outline-none"
                                >
                                    <option value="TODOS">Todos</option>
                                    <option value="PENDIENTE">Pendientes</option>
                                    <option value="ATENDIDO">Atendidos</option>
                                    <option value="ENTREGADO">Entregados</option>
                                </select>
                            </div>
                            <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">BUSCAR CLIENTE / ID</span>
                                <input
                                    type="text"
                                    placeholder="Ej: Juan, #101..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full text-[11px] border border-slate-200 rounded-lg p-1 font-medium uppercase bg-slate-50 outline-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* TARJETAS DE MÉTRICAS */}
                    <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Recaudación</span>
                            <div className="text-xs font-black font-mono text-emerald-700 mt-0.5">
                                $ {totalRevenue.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Operaciones</span>
                            <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                                {filteredOrders.length} ops.
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Ticket Prom.</span>
                            <div className="text-xs font-black font-mono text-indigo-700 mt-0.5">
                                $ {averageTicket.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* GRÁFICO 1: MÉTODO DE PAGO */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                        <h3 className="text-[9px] font-black uppercase text-slate-700 tracking-wider">📈 Métodos de Pago</h3>
                        <div className="space-y-1">
                            {Object.entries(paymentBreakdown).map(([method, amount]) => {
                                const percentage = totalRevenue > 0 ? Math.round(((amount as number) / totalRevenue) * 100) : 0;
                                return (
                                    <div key={method} className="space-y-0.5">
                                        <div className="flex justify-between text-[9px] font-bold">
                                            <span className="text-slate-600 uppercase">{method}</span>
                                            <span className="font-mono text-slate-800">$ {(amount as number).toLocaleString()} ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(paymentBreakdown).length === 0 && (
                                <p className="text-[9px] text-slate-400 italic py-0.5">Sin datos en el período.</p>
                            )}
                        </div>
                    </div>

                    {/* GRÁFICO 2: ESTADO LOGÍSTICO */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                        <h3 className="text-[9px] font-black uppercase text-slate-700 tracking-wider">📊 Estado Logístico</h3>
                        <div className="space-y-1">
                            {Object.entries(statusBreakdown).map(([status, count]) => {
                                const totalCount = filteredOrders.length;
                                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                                const barColor =
                                    status === 'PENDIENTE' ? 'bg-rose-500' :
                                        status === 'ATENDIDO' ? 'bg-indigo-600' : 'bg-emerald-600';

                                return (
                                    <div key={status} className="space-y-0.5">
                                        <div className="flex justify-between text-[9px] font-bold">
                                            <span className="text-slate-600 uppercase">{status}</span>
                                            <span className="font-mono text-slate-800">{count} ops ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className={`${barColor} h-full rounded-full`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* COLUMNA DERECHA: Listado de Operaciones */}
                <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase flex justify-between items-center">
                        <span>Listado de Operaciones ({filteredOrders.length})</span>
                        <span className="text-[9px] font-mono font-normal text-slate-500">
                            Pág. {currentPage} de {totalPages}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <p className="text-xs font-bold text-slate-400 animate-pulse">Cargando registros...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50/70 text-[9px] uppercase text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="p-2.5">ID</th>
                                        <th className="p-2.5">Fecha</th>
                                        <th className="p-2.5">Cliente</th>
                                        <th className="p-2.5 text-center">Logística</th>
                                        <th className="p-2.5 text-right">Total</th>
                                        <th className="p-2.5 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {paginatedOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400 italic text-xs">
                                                No se encontraron operaciones en el rango seleccionado.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedOrders.map(ord => (
                                            <tr key={ord.id} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono font-bold text-slate-600">#{ord.id.slice(-6)}</td>
                                                <td className="p-2.5 font-mono text-slate-500 text-[10px]">{new Date(ord.createdAt).toLocaleDateString()}</td>
                                                <td className="p-2.5 font-bold text-slate-800 truncate max-w-[120px]">{ord.client}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ord.status === 'PENDIENTE' ? 'bg-rose-100 text-rose-800' :
                                                            ord.status === 'ATENDIDO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                                                        }`}>
                                                        {ord.status}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-800">$ {ord.total.toLocaleString()}</td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        onClick={() => setSelectedOrder(ord)}
                                                        className="text-indigo-600 font-bold hover:underline text-[11px] cursor-pointer"
                                                    >
                                                        👁️ Ver
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs mt-auto">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                            >
                                ← Anterior
                            </button>
                            <span className="font-mono text-slate-500 font-bold text-[11px]">
                                Pág. {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* MODAL DETALLE DE ORDEN */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="font-extrabold text-xs uppercase tracking-wider">
                                    Detalle de Operación #{selectedOrder.id.slice(-6)}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-mono">
                                    {new Date(selectedOrder.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white font-bold text-base cursor-pointer">✕</button>
                        </div>

                        <div className="p-4 overflow-y-auto bg-slate-50 space-y-3 text-xs text-slate-800">
                            <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Cliente</span>
                                    <strong className="text-slate-800">{selectedOrder.client}</strong>
                                    <div className="text-[10px] text-slate-500 font-mono">{selectedOrder.clientEmail}</div>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Condición de Pago</span>
                                    <strong className="text-slate-800">{selectedOrder.paymentMethod}</strong>
                                </div>
                            </div>

                            {selectedOrder.isShipping && (
                                <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-[11px] text-amber-900">
                                    <strong>🚚 Dirección de Envío:</strong> {selectedOrder.shippingAddress}
                                </div>
                            )}

                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <div className="p-2 bg-slate-100 font-bold text-slate-700 uppercase text-[9px]">
                                    Productos Comprados
                                </div>
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="border-b border-slate-200 text-slate-500 uppercase text-[9px]">
                                        <tr>
                                            <th className="p-2">Cód</th>
                                            <th className="p-2">Descripción</th>
                                            <th className="p-2 text-center">Cant</th>
                                            <th className="p-2 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedOrder.items?.map((it, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2 font-mono text-slate-600">{it.code}</td>
                                                <td className="p-2 font-bold">{it.name}</td>
                                                <td className="p-2 text-center">{it.quantity}</td>
                                                <td className="p-2 text-right font-mono font-bold">$ {(it.price * it.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center bg-slate-900 text-white p-2.5 rounded-lg font-mono">
                                <span className="font-bold text-xs uppercase">Total de la Venta:</span>
                                <span className="text-sm font-black text-emerald-400">$ {selectedOrder.total.toLocaleString()}</span>
                            </div>

                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Actualizar Estado Logístico en TiDB</span>
                                <div className="flex gap-2">
                                    {(['PENDIENTE', 'ATENDIDO', 'ENTREGADO'] as const).map((st) => (
                                        <button
                                            key={st}
                                            onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                                            className={`flex-1 py-1 rounded font-bold text-[10px] uppercase border cursor-pointer ${selectedOrder.status === st ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
                            <button onClick={() => setSelectedOrder(null)} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase cursor-pointer">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}