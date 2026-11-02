'use client';

// src/app/(admin)/caja/page.tsx
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { getCajaSummary, createCashMovement, closeDailyCash, isDayClosed } from '@/actions/caja-actions';

export default function CashRegisterPage() {
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // Datos del resumen devueltos por la Server Action
    const [summary, setSummary] = useState<any>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Modal de Apertura de Caja
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [initialCashInput, setInitialCashInput] = useState('');

    // Formulario de nuevo movimiento
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [movementType, setMovementType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');

    // Modal de Cierre de Caja y Arqueo Físico
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [actualPhysicalCash, setActualPhysicalCash] = useState('');
    const [closeNotes, setCloseNotes] = useState('');
    const [closedBy, setClosedBy] = useState('ADMINISTRADOR');

    // Cargar datos al cambiar la fecha
    const loadData = async (dateStr: string) => {
        setLoading(true);
        const res = await getCajaSummary(dateStr);
        const locked = await isDayClosed(dateStr);

        if (res.success) {
            setSummary(res);
            setIsOpen(Boolean(res.cashMovements?.length > 0 || res.sales?.length > 0));
        }
        setIsLocked(locked);
        setLoading(false);
    };

    useEffect(() => {
        loadData(selectedDate);
    }, [selectedDate]);

    // Registrar apertura de caja
    const handleOpenCash = async (e: React.FormEvent) => {
        e.preventDefault();
        const initialMonto = Number(initialCashInput) || 0;

        startTransition(async () => {
            const result = await createCashMovement({
                type: 'INGRESO',
                description: 'APERTURA DE CAJA - FONDO INICIAL',
                amount: initialMonto,
            });

            if (!result.success) {
                alert(`Error al abrir caja: ${result.error}`);
                return;
            }

            setShowOpenModal(false);
            setInitialCashInput('');
            loadData(selectedDate);
        });
    };

    // Registrar movimiento manual
    const handleAddMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !amount) return;

        startTransition(async () => {
            const result = await createCashMovement({
                type: movementType,
                description: desc,
                amount: Number(amount),
            });

            if (!result.success) {
                alert(`Error: ${result.error}`);
                return;
            }

            setDesc('');
            setAmount('');
            loadData(selectedDate);
        });
    };

    // Ejecutar el cierre de caja
    const handleCloseCash = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const expectedCash = totals.EFECTIVO_EN_CAJA_NETO;
            const realCash = Number(actualPhysicalCash) || 0;
            const diff = realCash - expectedCash;
            const diffText = diff === 0 ? 'DIFERENCIA $0 (CAJA CUADRADA)' : `DIFERENCIA: $${diff.toLocaleString('es-AR')}`;

            const fullNotes = `[${diffText}] ${closeNotes}`.trim();

            const result = await closeDailyCash({
                date: selectedDate,
                closedBy,
                notes: fullNotes,
            });

            if (!result.success) {
                alert(`Error al cerrar caja: ${result.error}`);
                return;
            }

            alert(`¡Caja cerrada exitosamente! Resultado: ${diffText}`);
            setShowCloseModal(false);
            loadData(selectedDate);
        });
    };

    if (loading || !summary) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-stone-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                Cargando información de caja...
            </div>
        );
    }

    const { totals, sales, cashMovements } = summary;
    const expectedCashInBox = totals.EFECTIVO_EN_CAJA_NETO || 0;
    const physicalInputVal = Number(actualPhysicalCash) || 0;
    const cashDifference = physicalInputVal - expectedCashInBox;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 text-slate-800 overflow-hidden font-sans">

            {/* ENCABEZADO PRINCIPAL */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-3 pt-3 pb-1 shrink-0 gap-2">
                <div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                        💵 Caja Diaria y Arqueo
                        {isLocked ? (
                            <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                🔒 Cerrado y Bloqueado
                            </span>
                        ) : isOpen ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                🔓 Abierta
                            </span>
                        ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                ⚠️ Sin Abrir
                            </span>
                        )}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Control de ingresos por medios de pago, movimientos manuales y arqueo diario.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Selector de Fecha */}
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Fecha:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="text-xs font-mono font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                        />
                    </div>

                    <Link
                        href="/ventas/historial"
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                        📈 Historial de Ventas
                    </Link>
                </div>
            </div>

            {/* CUERPO PRINCIPAL EN 3 COLUMNAS */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* COLUMNA IZQUIERDA: APERTURA Y MOVIMIENTOS */}
                <div className="lg:col-span-3 flex flex-col gap-2.5 shrink-0 overflow-y-auto">

                    {!isOpen && !isLocked && (
                        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl shadow-2xs space-y-1.5">
                            <h3 className="text-xs font-black uppercase text-emerald-900 tracking-wide">
                                🔓 Apertura de Caja Requerida
                            </h3>
                            <p className="text-[10px] text-emerald-700">
                                Inicie el turno registrando el fondo inicial o dinero con el que abre la caja.
                            </p>
                            <button
                                onClick={() => setShowOpenModal(true)}
                                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-lg shadow cursor-pointer transition-colors"
                            >
                                + Abrir Caja del Día
                            </button>
                        </div>
                    )}

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Registrar Movimiento
                        </h3>

                        {isLocked ? (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] font-medium text-center">
                                Este día está cerrado. No se pueden agregar nuevos movimientos manuales.
                            </div>
                        ) : (
                            <form onSubmit={handleAddMovement} className="space-y-1.5 text-xs">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">TIPO</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setMovementType('INGRESO')}
                                            className={`py-1 font-bold rounded border transition-colors ${movementType === 'INGRESO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                        >
                                            Ingreso (+)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMovementType('EGRESO')}
                                            className={`py-1 font-bold rounded border transition-colors ${movementType === 'EGRESO' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                        >
                                            Egreso (-)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">MOTIVO / DESCRIPCIÓN *</label>
                                    <input
                                        type="text"
                                        placeholder="EJ. RETIRO, PAGO FLETE..."
                                        value={desc}
                                        onChange={(e) => setDesc(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1 uppercase font-medium bg-slate-50 outline-none text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-0.5">MONTO [$] *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1 font-mono font-bold bg-slate-50 outline-none text-xs"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded font-bold uppercase shadow-sm transition-colors mt-1 cursor-pointer text-xs"
                                >
                                    {isPending ? 'Guardando...' : 'Guardar Movimiento'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* COLUMNA CENTRAL: GRILLAS DE VENTAS Y MOVIMIENTOS */}
                <div className="lg:col-span-6 flex flex-col gap-2.5 h-full overflow-hidden">

                    {/* Ventas del Día */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Ventas Registradas ({totals.CANTIDAD_VENTAS})</h3>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold">Total: $ {totals.TOTAL_VENTAS.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="overflow-y-auto flex-1 max-h-[220px]">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2">Hora</th>
                                        <th className="p-2">Cliente / Canal</th>
                                        <th className="p-2">Método Pago</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {sales.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-6 text-slate-400 italic text-xs">
                                                No hay ventas registradas en esta fecha.
                                            </td>
                                        </tr>
                                    ) : (
                                        sales.map((sale: any) => (
                                            <tr key={sale.id} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono text-slate-500">
                                                    {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-2 font-bold text-slate-800">
                                                    {sale.customerName || sale.customer?.name || 'CONSUMIDOR FINAL'}
                                                    <span className="block text-[9px] text-slate-400 uppercase font-normal">{sale.channel}</span>
                                                </td>
                                                <td className="p-2">
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold">
                                                        {sale.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                                    $ {sale.total.toLocaleString('es-AR')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Movimientos Manuales */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Ingresos / Egresos Manuales</h3>
                            <span className="text-[10px] font-mono text-slate-400">{cashMovements.length} Movimientos</span>
                        </div>
                        <div className="overflow-y-auto flex-1 max-h-[180px]">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2">Hora</th>
                                        <th className="p-2">Tipo</th>
                                        <th className="p-2">Descripción</th>
                                        <th className="p-2 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {cashMovements.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-6 text-slate-400 italic text-xs">
                                                Sin movimientos manuales en esta fecha.
                                            </td>
                                        </tr>
                                    ) : (
                                        cashMovements.map((m: any) => (
                                            <tr key={m.id} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono text-slate-500">
                                                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.amount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                                                        {m.type}
                                                    </span>
                                                </td>
                                                <td className="p-2 font-bold text-slate-800 uppercase">{m.description}</td>
                                                <td className={`p-2 text-right font-mono font-bold ${m.amount > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                    $ {m.amount.toLocaleString('es-AR')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* COLUMNA DERECHA: RESUMEN COMPRIMIDO Y BOTÓN DE CIERRE AL PIE */}
                <div className="lg:col-span-3 flex flex-col gap-2 shrink-0 overflow-y-auto">

                    {/* Tarjeta Efectivo en Caja (Comprimida) */}
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-md space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Efectivo Esperado en Caja:</span>
                        <div className="text-2xl font-black font-mono text-emerald-400">
                            $ {totals.EFECTIVO_EN_CAJA_NETO.toLocaleString('es-AR')}
                        </div>
                        <p className="text-[9px] text-slate-400 truncate">
                            (Apertura + Ventas Efectivo + Ingresos) - Egresos[cite: 9].
                        </p>
                    </div>

                    {/* Desglose por Medio de Pago (Comprimido) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Desglose por Medio de Pago
                        </h3>
                        <div className="space-y-1 text-slate-600 font-medium text-[11px]">
                            <p className="flex justify-between">
                                <span>Efectivo:</span>
                                <strong className="font-mono text-slate-800">$ {totals.EFECTIVO.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Transferencia:</span>
                                <strong className="font-mono text-slate-800">$ {totals.TRANSFERENCIA.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Débito:</span>
                                <strong className="font-mono text-slate-800">$ {totals.DEBITO.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Crédito:</span>
                                <strong className="font-mono text-slate-800">$ {totals.CREDITO.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>MercadoPago:</span>
                                <strong className="font-mono text-slate-800">$ {totals.MERCADOPAGO.toLocaleString('es-AR')}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Totales del Día (Comprimido) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Totales del Día
                        </h3>
                        <div className="space-y-1 text-slate-600 font-medium text-[11px]">
                            <p className="flex justify-between">
                                <span>Total Ventas:</span>
                                <strong className="text-emerald-700 font-mono">+ $ {totals.TOTAL_VENTAS.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Ingresos Manuales:</span>
                                <strong className="text-emerald-700 font-mono">+ $ {totals.INGRESOS_MANUALES.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Egresos Manuales:</span>
                                <strong className="text-rose-600 font-mono">- $ {totals.EGRESOS_MANUALES.toLocaleString('es-AR')}</strong>
                            </p>
                        </div>
                    </div>

                    {/* BOTÓN DE CIERRE DEBAJO DE TOTALES DEL DÍA */}
                    {!isLocked && isOpen && (
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                            <button
                                onClick={() => setShowCloseModal(true)}
                                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg font-bold text-xs uppercase shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                🔒 Cerrar Caja del Día
                            </button>
                        </div>
                    )}

                </div>

            </div>

            {/* MODAL DE APERTURA DE CAJA */}
            {showOpenModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-sm font-black uppercase text-slate-900">
                                🔓 Apertura de Caja ({selectedDate})
                            </h2>
                            <button
                                onClick={() => setShowOpenModal(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleOpenCash} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">MONTO INICIAL EN EFECTIVO ($) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    placeholder="EJ. 5000"
                                    value={initialCashInput}
                                    onChange={(e) => setInitialCashInput(e.target.value)}
                                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-slate-800 bg-slate-50 outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <p className="text-[9px] text-slate-400 mt-1">Este valor ingresará como fondo inicial en el efectivo esperado de caja.</p>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowOpenModal(false)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold uppercase cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded font-bold uppercase shadow cursor-pointer"
                                >
                                    {isPending ? 'Abriendo...' : 'Confirmar Apertura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CIERRE Y ARQUEO FÍSICO */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-sm font-black uppercase text-slate-900">
                                🔒 Cierre & Arqueo Físico ({selectedDate})
                            </h2>
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="flex justify-between">
                                <span className="text-slate-500 font-bold">Efectivo Esperado en Sistema:</span>
                                <strong className="font-mono text-emerald-700 font-black text-sm">$ {expectedCashInBox.toLocaleString('es-AR')}</strong>
                            </p>
                        </div>

                        <form onSubmit={handleCloseCash} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">EFECTIVO FÍSICO CONTADO EN CAJA ($) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    placeholder="Ingrese el conteo de billetes..."
                                    value={actualPhysicalCash}
                                    onChange={(e) => setActualPhysicalCash(e.target.value)}
                                    className="w-full border border-slate-300 rounded p-2 font-mono font-bold text-slate-900 bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {actualPhysicalCash !== '' && (
                                    <div className={`mt-1.5 p-1.5 rounded text-[10px] font-bold text-center ${cashDifference === 0 ? 'bg-emerald-100 text-emerald-800' : cashDifference > 0 ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {cashDifference === 0
                                            ? '✅ Arqueo perfecto: Diferencia $0 (Caja Cuadrada)'
                                            : cashDifference > 0
                                                ? `⚠️ Sobrante en caja: +$${cashDifference.toLocaleString('es-AR')}`
                                                : `🚨 Faltante en caja: -$${Math.abs(cashDifference).toLocaleString('es-AR')}`}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">CIERRE REALIZADO POR</label>
                                <input
                                    type="text"
                                    value={closedBy}
                                    onChange={(e) => setClosedBy(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 uppercase font-medium bg-slate-50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">OBSERVACIONES</label>
                                <textarea
                                    rows={2}
                                    placeholder="EJ. ARQUEO FISICO OK, SIN DIFERENCIAS..."
                                    value={closeNotes}
                                    onChange={(e) => setCloseNotes(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 uppercase font-medium bg-slate-50 outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCloseModal(false)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold uppercase transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || actualPhysicalCash === ''}
                                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white rounded font-bold uppercase shadow transition-colors cursor-pointer"
                                >
                                    {isPending ? 'Procesando...' : 'Confirmar Cierre'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}