'use client';

import React, { useState, useEffect } from 'react';

export default function ModuloCompras({
    productos = [],
    setProductos,
    historialCompras = [],
    setHistorialCompras
}: {
    productos?: any[];
    setProductos?: React.Dispatch<React.SetStateAction<any[]>>;
    historialCompras?: any[];
    setHistorialCompras?: React.Dispatch<React.SetStateAction<any[]>>;
}) {
    const [compraProductoId, setCompraProductoId] = useState('');
    const [compraCantidad, setCompraCantidad] = useState<number | ''>(1);
    const [compraCostoUnitario, setCompraCostoUnitario] = useState('');
    const [compraImpuesto, setCompraImpuesto] = useState('21');

    const categoriasMargenes: Record<string, number> = {
        'INTERIOR': 1.60,
        'EXTERIOR': 1.50,
        'INSUMOS': 1.40
    };

    // Sincronizar costos al cambiar de producto seleccionado
    useEffect(() => {
        if (compraProductoId !== '' && productos.length > 0) {
            const encontrado = productos.find(p => Number(p.id) === Number(compraProductoId));
            if (encontrado) {
                setCompraCostoUnitario(encontrado.ultimo_costo_neto?.toString() || '');
                setCompraImpuesto((encontrado.impuesto || 21).toString());
            }
        }
    }, [compraProductoId, productos]);

    const handleRegistrarCompra = (e: React.FormEvent) => {
        e.preventDefault();
        if (compraProductoId === '' || compraCantidad === '' || compraCostoUnitario === '') return;

        const idSeleccionado = Number(compraProductoId);
        const cantidadIngresada = Number(compraCantidad);
        const costoNetoIngresado = Number(compraCostoUnitario);

        // Buscar el producto asegurando coincidencia numérica de IDs
        const prodExistente = productos.find(p => Number(p.id) === idSeleccionado);

        if (!prodExistente) {
            console.error("No se encontró el producto con ID:", idSeleccionado);
            return;
        }

        const factorMargen = categoriasMargenes[prodExistente.categoria] || 1.50;
        const nuevoPrecioVentaNeto = Math.round(costoNetoIngresado * factorMargen);
        const totalCompradoConIva = (costoNetoIngresado * (1 + Number(compraImpuesto) / 100)) * cantidadIngresada;

        // 1. Actualiza de manera estricta el stock global en ViveroPage
        if (setProductos) {
            const nuevosProductos = productos.map(p => {
                if (Number(p.id) === idSeleccionado) {
                    return {
                        ...p,
                        cantidad_actual: Number(p.cantidad_actual || 0) + cantidadIngresada,
                        valor_unitario: nuevoPrecioVentaNeto,
                        ultimo_costo_neto: costoNetoIngresado
                    };
                }
                return p;
            });
            setProductos(nuevosProductos);
        }

        // 2. Registra en el historial global de compras
        if (setHistorialCompras) {
            const nuevoRemito = {
                id: `CMP-${Date.now().toString().slice(-4)}`,
                fecha: new Date().toLocaleDateString('es-AR'),
                productoNombre: prodExistente.nombre,
                cantidadComprada: cantidadIngresada,
                costoUnitarioNeto: costoNetoIngresado,
                nuevoPrecioVentaNeto: nuevoPrecioVentaNeto,
                totalCompra: totalCompradoConIva
            };
            setHistorialCompras([nuevoRemito, ...historialCompras]);
        }

        // Resetear formulario
        setCompraProductoId('');
        setCompraCantidad(1);
        setCompraCostoUnitario('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Formulario de Remito / Compra */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-fit space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>📦</span> Registrar Remito de Planta / Insumo
                </h3>
                <form onSubmit={handleRegistrarCompra} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Artículo Existente</label>
                        <select
                            required
                            value={compraProductoId}
                            onChange={(e) => setCompraProductoId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                        >
                            <option value="">-- Seleccionar Especie / Insumo --</option>
                            {productos.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.codigo} - {p.nombre} (Stock actual: {p.cantidad_actual})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cantidad</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={compraCantidad}
                                onChange={(e) => setCompraCantidad(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Costo Neto Unitario</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={compraCostoUnitario}
                                onChange={(e) => setCompraCostoUnitario(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-800 outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!compraProductoId}
                        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm uppercase tracking-wide"
                    >
                        Registrar Ingreso y Actualizar Stock
                    </button>
                </form>
            </div>

            {/* Listado auditoría de Remitos */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[350px]">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex justify-between items-center">
                    <span>📋 Auditoría de Remitos Ingresados</span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                        {historialCompras.length} remitos
                    </span>
                </div>

                {historialCompras.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-semibold my-auto">
                        No hay remitos cargados en esta sesión. Al registrar una compra aquí, impactará directamente en el inventario del catálogo.
                    </div>
                ) : (
                    <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 font-bold text-slate-500 uppercase text-[10px]">
                                    <th className="p-3">ID / Fecha</th>
                                    <th className="p-3">Artículo</th>
                                    <th className="p-3 text-center">Cant.</th>
                                    <th className="p-3">Costo Neto</th>
                                    <th className="p-3">Nuevo Venta Neto</th>
                                    <th className="p-3">Total Remito</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                                {historialCompras.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-3 font-mono text-slate-500">
                                            {c.id}<br />
                                            <span className="text-[9px] text-slate-400">{c.fecha}</span>
                                        </td>
                                        <td className="p-3 font-bold text-slate-900 uppercase">{c.productoNombre}</td>
                                        <td className="p-3 text-center text-emerald-700 font-bold">+{c.cantidadComprada}</td>
                                        <td className="p-3 font-mono">${c.costoUnitarioNeto.toLocaleString('es-AR')}</td>
                                        <td className="p-3 font-mono text-emerald-700">${c.nuevoPrecioVentaNeto.toLocaleString('es-AR')}</td>
                                        <td className="p-3 font-mono font-bold">${c.totalCompra.toLocaleString('es-AR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}