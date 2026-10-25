'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Order {
    id: string;
    createdAt: string;
    customerName?: string;
    clientEmail?: string;
    customerPhone?: string;
    customer?: { id?: string; name?: string; email?: string; phone?: string };
    client?: { id?: string; name?: string; email?: string; phone?: string } | string;
    total: number;
    paidAmount?: number;
    pendingBalance?: number;
    status: string;
    isPaid: boolean;
    paymentStatus?: string;
    paymentMethod?: string;
    isShipping?: boolean;
    shippingAddress?: string;
    items?: any[];
    payments?: any[];
}

export default function ModuloHistorialVentas() {
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    const [dateFrom, setDateFrom] = useState(todayStr);
    const [dateTo, setDateTo] = useState(todayStr);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [montoPago, setMontoPago] = useState<number | ''>('');
    const [accionMensaje, setAccionMensaje] = useState<string | null>(null);

    // URL base dinámica que prioriza la variable pública de entorno (Localtunnel/Producción) o el origen actual
    const getBaseUrl = () => {
        if (typeof window !== 'undefined') {
            const envUrl = process.env.NEXT_PUBLIC_APP_URL;
            if (envUrl) return envUrl;
            return window.location.origin;
        }
        return '';
    };

    // Cálculos de saldo abonado y pendiente basados en la orden seleccionada
    const totalPagado = selectedOrder
        ? (selectedOrder.paidAmount ?? (selectedOrder.payments?.reduce((acc: number, p: any) => acc + (p.amount || 0), 0) ?? 0))
        : 0;

    const saldoPendiente = selectedOrder
        ? Math.max(0, selectedOrder.total - totalPagado)
        : 0;

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ventas?from=${dateFrom}&to=${dateTo}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error('Error al cargar historial de ventas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [dateFrom, dateTo]);

    // Función unificada para obtener el nombre real del cliente en cualquier formato
    const getNombreCliente = (ord: Order): string => {
        if (ord.customerName && ord.customerName.trim() !== '') return ord.customerName;
        if (ord.customer && typeof ord.customer === 'object' && ord.customer.name) return ord.customer.name;
        if (ord.client && typeof ord.client === 'object' && ord.client.name) return ord.client.name;
        if (typeof ord.client === 'string' && ord.client.trim() !== '') return ord.client;
        return 'CLIENTE MOSTRADOR';
    };

    // Función unificada robusta para obtener el email del cliente
    const getEmailCliente = (ord: Order): string => {
        if (ord.clientEmail && ord.clientEmail.trim() !== '') return ord.clientEmail;
        if (ord.customer && typeof ord.customer === 'object' && ord.customer.email) return ord.customer.email;
        if (ord.client && typeof ord.client === 'object' && ord.client.email) return ord.client.email;
        return '';
    };

    // Función unificada robusta para obtener el teléfono del cliente
    const getTelefonoCliente = (ord: Order): string => {
        if (ord.customerPhone && ord.customerPhone.trim() !== '') return ord.customerPhone;
        if (ord.customer && typeof ord.customer === 'object' && ord.customer.phone) return ord.customer.phone;
        if (ord.client && typeof ord.client === 'object' && ord.client.phone) return ord.client.phone;
        return '';
    };

    // Registrar pago seguro
    const handleRegistrarPagoWithAmount = async (targetOrder: Order, monto: number) => {
        if (!targetOrder) {
            setAccionMensaje('⚠️ No se seleccionó ninguna orden válida.');
            return;
        }

        if (!monto || monto <= 0) {
            setAccionMensaje('⚠️ Ingrese un monto válido mayor a 0.');
            return;
        }

        try {
            const resPayment = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: monto,
                    paymentMethod: targetOrder.paymentMethod || 'EFECTIVO',
                    saleId: targetOrder.id,
                    customerId: (targetOrder as any).customerId || (targetOrder.customer as any)?.id || null,
                    notes: `Pago registrado desde Historial Vivero POS`
                })
            });

            if (!resPayment.ok) {
                const errData = await resPayment.json();
                setAccionMensaje(`⚠️ ${errData.error || 'Error al procesar el pago'}`);
                return;
            }

            setAccionMensaje('✅ ¡Pago registrado correctamente!');
            loadOrders();

            setTimeout(() => {
                setSelectedOrder(null);
                setAccionMensaje(null);
                setMontoPago('');
            }, 1500);

        } catch (err: any) {
            console.error('Error al enviar pago:', err);
            setAccionMensaje('⚠️ Error de conexión al registrar el pago.');
        }
    };

    // Enviar comprobante por WhatsApp utilizando la URL pública configurada en el .env
    const handleEnviarWhatsAppConAdjunto = (order: Order) => {
        let telefono = getTelefonoCliente(order);

        if (!telefono) {
            const numManual = prompt('⚠️ El cliente no tiene teléfono en este registro. Ingresá su WhatsApp (ej: 1140782378):');
            if (!numManual) return;
            telefono = numManual;
        }

        const numLimpio = telefono.replace(/\D/g, '');
        const numFinal = numLimpio.startsWith('54') ? numLimpio : `549${numLimpio}`;

        const urlComprobante = `${getBaseUrl()}/api/ventas/${order.id}/pdf`;
        const texto = `Hola ${getNombreCliente(order)}! Te enviamos el comprobante de tu compra #${order.id.slice(-6)} en Tienda de Plantas.\n\nPuede ver y descargar su recibo oficial en el siguiente enlace:\n${urlComprobante}\n\nPedro Mascagni 316, Lomas de Zamora. ¡Muchas gracias!`;

        window.open(`https://wa.me/${numFinal}?text=${encodeURIComponent(texto)}`, '_blank');
    };

    // Enviar comprobante por E-mail (Gmail Web) utilizando la URL pública
    const handleEnviarEmailConAdjunto = (order: Order) => {
        let emailCliente = getEmailCliente(order);

        if (!emailCliente) {
            const emailManual = prompt('⚠️ El cliente no tiene e-mail en este registro. Ingresá la casilla de correo:');
            if (!emailManual) return;
            emailCliente = emailManual;
        }

        const asunto = `Comprobante de Compra #${order.id.slice(-6)} - Tienda de Plantas`;
        const urlComprobante = `${getBaseUrl()}/api/ventas/${order.id}/pdf`;
        const cuerpo =
            `Hola ${getNombreCliente(order)},\n\n` +
            `¡Muchas gracias por tu compra en Tienda de Plantas!\n\n` +
            `Te compartimos el enlace oficial para consultar y descargar tu comprobante de pago en formato PDF:\n` +
            `${urlComprobante}\n\n` +
            `Detalles de nuestro local:\n` +
            `Pedro Mascagni 316, Lomas de Zamora\n` +
            `Tel: +54 11 40782378\n\n` +
            `Atentamente,\n` +
            `Equipo de Tienda de Plantas`;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailCliente)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
        window.open(gmailUrl, '_blank');
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 text-xs">

            {/* CABECERA Y FILTROS POR FECHA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <span>📋</span> Historial de Ventas y Comprobantes
                    </h2>
                    <p className="text-[11px] text-slate-500">Consultá, aplicá cobros, imprimí y enviá comprobantes por WhatsApp o Mail.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Desde:</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="border border-slate-200 rounded p-1 font-mono font-bold text-slate-800 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Hasta:</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="border border-slate-200 rounded p-1 font-mono font-bold text-slate-800 outline-none"
                        />
                    </div>
                    <button
                        onClick={loadOrders}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold transition-colors cursor-pointer"
                    >
                        🔄 Filtrar
                    </button>
                </div>
            </div>

            {/* TABLA DE HISTORIAL DE VENTAS */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="text-center py-12 text-slate-400 font-semibold">Cargando operaciones...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic">No se registraron ventas en el rango de fechas seleccionado.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                                <th className="p-2">Hora / N°</th>
                                <th className="p-2">Cliente</th>
                                <th className="p-2">Medio Pago</th>
                                <th className="p-2 text-right">Total</th>
                                <th className="p-2 text-center">Estado Pago</th>
                                <th className="p-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {orders.map(ord => {
                                const nombreCliente = getNombreCliente(ord);
                                const estaPagado = ord.isPaid || ord.paymentStatus === 'PAGADO';

                                return (
                                    <tr key={ord.id} className="hover:bg-slate-50">
                                        <td className="p-2 font-mono font-bold text-slate-700">
                                            #{ord.id.slice(-6)}
                                            <span className="block text-[9px] font-normal text-slate-400">
                                                {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="p-2 font-bold text-slate-800 uppercase">
                                            {nombreCliente}
                                        </td>
                                        <td className="p-2 font-semibold text-slate-600 uppercase">
                                            {ord.paymentMethod || 'EFECTIVO'}
                                        </td>
                                        <td className="p-2 text-right font-mono font-bold text-emerald-800">
                                            $ {ord.total.toLocaleString('es-AR')}
                                        </td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${estaPagado
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {ord.paymentStatus || (estaPagado ? 'PAGADO' : 'PENDIENTE')}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedOrder(ord); setAccionMensaje(null); }}
                                                className={`px-3 py-1.5 rounded font-bold text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto ${estaPagado
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                                    }`}
                                            >
                                                {estaPagado ? (
                                                    <><span>👁️</span> Ver Comprobante</>
                                                ) : (
                                                    <><span>💳</span> Gestionar / Cobrar</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL CON EL COMPROBANTE INSTITUCIONAL (DOCUMENTO X) */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-5 space-y-4 font-mono text-xs text-slate-800 max-h-[90vh] overflow-y-auto relative">

                        {/* BOTÓN CERRAR */}
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Vista de Comprobante</span>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer">✕</button>
                        </div>

                        {accionMensaje && (
                            <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded font-bold text-center text-xs">
                                {accionMensaje}
                            </div>
                        )}

                        {/* CONTENEDOR DEL COMPROBANTE CON MARCA DE AGUA Y DATOS DE MARCA */}
                        <div className="relative bg-slate-50/50 p-4 rounded-xl border border-slate-200 overflow-hidden space-y-3">

                            {/* MARCA DE AGUA "NO VÁLIDO COMO FACTURA" */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-10 rotate-[-30deg]">
                                <span className="text-3xl font-black text-slate-900 tracking-widest text-center uppercase">
                                    NO VÁLIDO COMO FACTURA
                                </span>
                            </div>

                            {/* CABECERA: LOGO + DATOS LOCAL + RECUADRO "X" */}
                            <div className="relative z-10 flex justify-between items-start border-b border-slate-200 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src="/logo.jpg"
                                        alt="Tienda de Plantas"
                                        className="w-12 h-12 rounded-full border border-slate-200 object-cover"
                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                    <div>
                                        <h3 className="font-black text-xs uppercase text-slate-900 leading-tight">TIENDA DE PLANTAS</h3>
                                        <p className="text-[9px] text-slate-500 italic">Decora tu alma</p>
                                        <p className="text-[9px] text-slate-600 mt-0.5">📍 Pedro Mascagni 316, Lomas de Zamora</p>
                                        <p className="text-[9px] text-slate-600">📞 +54 11 40782378</p>
                                    </div>
                                </div>

                                {/* RECUADRO CENTRAL DOCUMENTO X */}
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 border-2 border-slate-800 flex items-center justify-center font-black text-base text-slate-900 bg-white rounded">
                                        X
                                    </div>
                                    <span className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">Doc. Interno</span>
                                </div>

                                <div className="text-right">
                                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold uppercase">
                                        Comprobante
                                    </span>
                                    <p className="font-mono font-bold text-xs text-slate-800 mt-1">#{selectedOrder.id.slice(-6)}</p>
                                    <p className="text-[9px] text-slate-400">{new Date(selectedOrder.createdAt).toLocaleDateString('es-AR')}</p>
                                </div>
                            </div>

                            {/* DATOS CLIENTE Y PAGO */}
                            <div className="relative z-10 bg-white/80 p-2.5 rounded border border-slate-200 text-[10px] space-y-0.5">
                                <p><strong>Cliente:</strong> {getNombreCliente(selectedOrder)}</p>
                                <p><strong>E-mail:</strong> {getEmailCliente(selectedOrder) || 'No registrado'}</p>
                                <p><strong>Medio de Pago:</strong> {selectedOrder.paymentMethod || 'EFECTIVO'}</p>
                                <p><strong>Estado:</strong> <span className="font-bold text-emerald-700">{selectedOrder.paymentStatus || (selectedOrder.isPaid ? 'PAGADO' : 'PENDIENTE')}</span></p>
                            </div>

                            {/* TABLA DE ÍTEMS */}
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <table className="relative z-10 w-full text-left text-[10px] border-collapse bg-white/80 rounded">
                                    <thead className="border-b text-slate-500 uppercase text-[8px]">
                                        <tr>
                                            <th className="p-1">Descripción</th>
                                            <th className="p-1 text-center">Cant</th>
                                            <th className="p-1 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedOrder.items.map((it: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="p-1 font-bold">{it.productName || it.name || 'Producto'}</td>
                                                <td className="p-1 text-center">{it.quantity}</td>
                                                <td className="p-1 text-right font-bold">$ {(it.price * it.quantity).toLocaleString('es-AR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* TOTALES Y DESGLOSE FINANCIERO */}
                            <div className="relative z-10 border-t border-slate-300 pt-2 space-y-0.5 font-mono text-[11px]">
                                <div className="flex justify-between items-center font-bold text-slate-700">
                                    <span>TOTAL VENTA:</span>
                                    <span>$ {selectedOrder.total.toLocaleString('es-AR')}</span>
                                </div>

                                {totalPagado > 0 && (
                                    <div className="flex justify-between items-center font-semibold text-emerald-700">
                                        <span>MONTO ABONADO:</span>
                                        <span>- $ {totalPagado.toLocaleString('es-AR')}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center font-extrabold text-xs border-t border-slate-200 pt-1 text-slate-900">
                                    <span>SALDO PENDIENTE:</span>
                                    <span className={saldoPendiente > 0 ? "text-amber-700" : "text-emerald-700"}>
                                        $ {saldoPendiente.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* REGISTRAR PAGO DENTRO DEL MODAL SI QUEDA SALDO */}
                        {saldoPendiente > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-amber-900 text-[11px] uppercase">⚡ Registrar Cobro / Entrega</p>
                                    <span className="text-[10px] font-bold text-amber-800">Resta: $ {saldoPendiente.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder={`Monto (Sugerido: $${saldoPendiente})`}
                                        value={montoPago}
                                        onChange={(e) => setMontoPago(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full p-1.5 border border-amber-300 rounded text-xs bg-white font-mono outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const montoAbonar = montoPago === '' ? saldoPendiente : Number(montoPago);
                                            handleRegistrarPagoWithAmount(selectedOrder, montoAbonar);
                                        }}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs whitespace-nowrap cursor-pointer"
                                    >
                                        Confirmar Pago
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ACCIONES (IMPRIMIR, WHATSAPP, EMAIL) */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <button
                                onClick={() => window.print()}
                                className="py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                            >
                                🖨️ Imprimir
                            </button>
                            <button
                                onClick={() => handleEnviarWhatsAppConAdjunto(selectedOrder)}
                                className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                            >
                                📱 WhatsApp
                            </button>
                            <button
                                onClick={() => handleEnviarEmailConAdjunto(selectedOrder)}
                                className="py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold flex items-center justify-center gap-1 cursor-pointer text-[11px]"
                            >
                                📧 E-mail
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}