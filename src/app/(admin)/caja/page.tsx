'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CashMovement {
    id: string;
    type: 'INGRESO' | 'EGRESO' | 'VENTA';
    description: string;
    amount: number;
    time: string;
}

export default function CashRegisterPage() {
    const [movements, setMovements] = useState<CashMovement[]>([
        { id: '1', type: 'INGRESO', description: 'Fondo inicial de caja', amount: 15000, time: '08:30' },
        { id: '2', type: 'VENTA', description: 'Ticket #_2026081201 (Ficus Lyrata)', amount: 30000, time: '09:15' },
        { id: '3', type: 'EGRESO', description: 'Compra insumos de limpieza', amount: -4500, time: '11:00' },
    ]);

    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [movementType, setMovementType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');

    const handleAddMovement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc || !amount) return;

        const value = Number(amount);
        const finalAmount = movementType === 'EGRESO' ? -Math.abs(value) : Math.abs(value);

        const newMov: CashMovement = {
            id: Date.now().toString(),
            type: movementType,
            description: desc.toUpperCase(),
            amount: finalAmount,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMovements([newMov, ...movements]);
        setDesc('');
        setAmount('');
    };

    const totalCash = movements.reduce((acc, m) => acc + m.amount, 0);
    const totalIngresos = movements.filter(m => m.amount > 0).reduce((acc, m) => acc + m.amount, 0);
    const totalEgresos = movements.filter(m => m.amount < 0).reduce((acc, m) => acc + m.amount, 0);

    return (


        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 text-slate-800 overflow-hidden font-sans">

            {/* ENCABEZADO PRINCIPAL CON NAVEGACIÓN Y ACCESOS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-3 pt-3 pb-1 shrink-0 gap-2">
                <div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                        💵 Caja Diaria y Arqueo
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Control de movimientos en efectivo, ingresos, egresos y cierre diario.
                    </p>
                </div>

                {/* BOTÓN DE ACCESO AL HISTORIAL DE VENTAS */}
                <div className="flex items-center gap-2">
                    <Link
                        href="/ventas/historial"
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        📈 Ver Historial de Ventas
                    </Link>
                </div>
            </div>

            {/* CUERPO PRINCIPAL EN 3 COLUMNAS PARA CAJA */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* COLUMNA IZQUIERDA: FORMULARIO DE NUEVO MOVIMIENTO */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Registrar Movimiento
                        </h3>
                        <form onSubmit={handleAddMovement} className="space-y-2 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">TIPO DE MOVIMIENTO</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMovementType('INGRESO')}
                                        className={`py-1.5 font-bold rounded border transition-colors ${movementType === 'INGRESO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                    >
                                        Ingreso (+)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMovementType('EGRESO')}
                                        className={`py-1.5 font-bold rounded border transition-colors ${movementType === 'EGRESO' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                    >
                                        Egreso (-)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">DESCRIPCIÓN / MOTIVO *</label>
                                <input
                                    type="text"
                                    placeholder="EJ. RETIRO, PAGO PROVEEDOR..."
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">MONTO [$] *</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold bg-slate-50 outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold uppercase shadow-sm transition-colors mt-2 cursor-pointer"
                            >
                                Guardar Movimiento
                            </button>
                        </form>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 flex-1 flex flex-col justify-end">
                        <button className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg font-bold text-xs uppercase shadow-2xs transition-colors cursor-pointer">
                            🔒 Cerrar Caja del Día
                        </button>
                    </div>
                </div>

                {/* COLUMNA CENTRAL: GRILLA DE MOVIMIENTOS DEL DÍA */}
                <div className="lg:col-span-6 flex flex-col gap-3 h-full overflow-hidden">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Movimientos de Caja Diaria</h3>
                            <span className="text-[10px] font-mono text-slate-400">Turno: Mañana / Tarde</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2.5">Hora</th>
                                        <th className="p-2.5">Tipo</th>
                                        <th className="p-2.5">Descripción</th>
                                        <th className="p-2.5 text-right">Monto [$]</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {movements.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-12 text-slate-400 italic text-xs">
                                                No hay movimientos registrados en la caja de hoy.
                                            </td>
                                        </tr>
                                    ) : (
                                        movements.map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono text-slate-500">{m.time}</td>
                                                <td className="p-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.amount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                                                        {m.type}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 font-bold text-slate-800 uppercase">{m.description}</td>
                                                <td className={`p-2.5 text-right font-mono font-bold ${m.amount > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
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

                {/* COLUMNA DERECHA: RESUMEN Y ARQUEO */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">

                    {/* TARJETA DE SALDO EN CAJA */}
                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Efectivo en Caja:</span>
                        <div className="text-3xl font-black font-mono text-emerald-400">
                            $ {totalCash.toLocaleString('es-AR')}
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1">
                            Balance neto del día actual.
                        </p>
                    </div>

                    {/* DESGLOSE DE INGRESOS Y EGRESOS */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Arqueo Parcial
                        </h3>
                        <div className="space-y-2 text-slate-600 font-medium">
                            <p className="flex justify-between">
                                <span>Total Ingresos:</span>
                                <strong className="text-emerald-700 font-mono">+ $ {totalIngresos.toLocaleString('es-AR')}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Total Egresos:</span>
                                <strong className="text-rose-600 font-mono">- $ {Math.abs(totalEgresos).toLocaleString('es-AR')}</strong>
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}