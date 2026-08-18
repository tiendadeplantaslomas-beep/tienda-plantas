'use client';

import React, { useState, useMemo } from 'react';

export function ModuloCatalogo({ productos = [] }: { productos?: any[]; setProductos?: any }) {
    const [busqueda, setBusqueda] = useState('');
    const [ordenColumna, setOrdenColumna] = useState<'codigo' | 'producto' | 'categoria' | 'stock' | 'precio_final'>('producto');
    const [ordenAsc, setOrdenAsc] = useState(true);

    // Estados de Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const productosPorPagina = 15;

    // Función auxiliar segura para extraer texto de strings u objetos
    const extraerTexto = (valor: any): string => {
        if (!valor) return '';
        if (typeof valor === 'string') return valor;
        if (typeof valor === 'object') {
            return valor.name || valor.nombre || valor.title || JSON.stringify(valor);
        }
        return String(valor);
    };

    // Filtrado ágil adaptado a la estructura de la base de productos[cite: 5]
    const productosFiltrados = useMemo(() => {
        if (!productos) return [];
        return productos.filter((p) => {
            const codigo = extraerTexto(p.codigo || p.code).toLowerCase();
            const producto = extraerTexto(p.producto || p.name).toLowerCase();
            const categoria = extraerTexto(p.categoria || p.category).toLowerCase();
            const query = busqueda.toLowerCase();

            return codigo.includes(query) || producto.includes(query) || categoria.includes(query);
        });
    }, [productos, busqueda]);

    // Ordenamiento de columnas seguro[cite: 5]
    const productosOrdenados = useMemo(() => {
        return [...productosFiltrados].sort((a, b) => {
            const rawA = ordenColumna === 'producto' ? (a.producto || a.name) : a[ordenColumna];
            const rawB = ordenColumna === 'producto' ? (b.producto || b.name) : b[ordenColumna];

            const valorA = extraerTexto(rawA).toLowerCase();
            const valorB = extraerTexto(rawB).toLowerCase();

            if (valorA < valorB) return ordenAsc ? -1 : 1;
            if (valorA > valorB) return ordenAsc ? 1 : -1;
            return 0;
        });
    }, [productosFiltrados, ordenColumna, ordenAsc]);

    // Cálculo de Paginación
    const totalPaginas = Math.ceil(productosOrdenados.length / productosPorPagina) || 1;
    const productosPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * productosPorPagina;
        return productosOrdenados.slice(inicio, inicio + productosPorPagina);
    }, [productosOrdenados, paginaActual]);

    // Reiniciar a la página 1 cuando cambia la búsqueda
    const manejarBusqueda = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBusqueda(e.target.value);
        setPaginaActual(1);
    };

    const manejarOrden = (columna: 'codigo' | 'producto' | 'categoria' | 'stock' | 'precio_final') => {
        if (ordenColumna === columna) {
            setOrdenAsc(!ordenAsc);
        } else {
            setOrdenColumna(columna);
            setOrdenAsc(true);
        }
        setPaginaActual(1);
    };

    return (
        <div className="w-full flex flex-col font-sans text-slate-800 max-w-7xl mx-auto p-2 gap-3 pb-12">


            {/* CABECERA CON ICONO Y BUSCADOR */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 text-xs shadow-2xs shrink-0">
                        📖
                    </div>
                    <div>
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block leading-tight">Catálogo Botánico e Insumos</span>
                        <span className="text-[10px] text-slate-400 font-medium">Sincronizado con Productos[cite: 5]</span>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full ml-1">
                        {productosOrdenados.length} items
                    </span>
                </div>

                <div className="w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Buscar por código, producto o categoría..."
                        value={busqueda}
                        onChange={manejarBusqueda}
                        className="w-full px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium text-slate-800 shadow-2xs"
                    />
                </div>
            </div>

            {/* TABLA DE PRODUCTOS (Expandida para ocupar todo el espacio vertical disponible) */}
            <div className="flex-1 overflow-x-auto flex flex-col justify-between">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase text-slate-500 tracking-wider select-none">
                            <th
                                onClick={() => manejarOrden('codigo')}
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                Código {ordenColumna === 'codigo' && (ordenAsc ? '▲' : '▼')}
                            </th>
                            <th
                                onClick={() => manejarOrden('producto')}
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                Producto {ordenColumna === 'producto' && (ordenAsc ? '▲' : '▼')}
                            </th>
                            <th
                                onClick={() => manejarOrden('categoria')}
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                Categoría {ordenColumna === 'categoria' && (ordenAsc ? '▲' : '▼')}
                            </th>
                            <th className="px-4 py-3">Proveedor</th>
                            <th className="px-4 py-3">Costo Total</th>
                            <th className="px-4 py-3">Margen</th>
                            <th
                                onClick={() => manejarOrden('precio_final')}
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                Precio Final {ordenColumna === 'precio_final' && (ordenAsc ? '▲' : '▼')}
                            </th>
                            <th
                                onClick={() => manejarOrden('stock')}
                                className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                Stock {ordenColumna === 'stock' && (ordenAsc ? '▲' : '▼')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {productosPaginados.length > 0 ? (
                            productosPaginados.map((p, idx) => {
                                const codigoLimpio = extraerTexto(p.codigo || p.code).replace('#', '');
                                const nombreProducto = extraerTexto(p.producto || p.name);
                                const categoriaNombre = extraerTexto(p.categoria || p.category) || 'GENERAL';
                                const proveedor = extraerTexto(p.proveedor || p.provider) || '-';
                                const costoTotal = p.costo_total ?? p.cost ?? 0;
                                const margen = extraerTexto(p.margen) || '100%';
                                const precioFinal = p.precio_final ?? p.price ?? 0;
                                const stockVal = p.stock ?? p.cantidad_actual ?? 0;

                                return (
                                    <tr key={p.id || codigoLimpio || idx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 font-bold">
                                            {codigoLimpio}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-900 font-bold uppercase">
                                            {nombreProducto}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                                                {categoriaNombre}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600 font-medium">
                                            {proveedor}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-slate-400">
                                            {typeof costoTotal === 'number' ? `$${costoTotal.toLocaleString('es-AR')}` : costoTotal}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600 font-bold">
                                            {margen}
                                        </td>
                                        <td className="px-4 py-2.5 font-bold text-emerald-700 font-mono">
                                            {typeof precioFinal === 'number' ? `$${precioFinal.toLocaleString('es-AR')}` : precioFinal}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                                            {stockVal} un.
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center py-16 text-slate-400 text-xs font-semibold">
                                    🍃 No se encontraron productos en el catálogo con los filtros aplicados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* BARRA DE PAGINACIÓN FIJA AL PIE */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
                <span className="text-slate-500 font-medium text-[11px]">
                    Mostrando del <span className="font-bold text-slate-700">{productosOrdenados.length > 0 ? (paginaActual - 1) * productosPorPagina + 1 : 0}</span> al <span className="font-bold text-slate-700">{Math.min(paginaActual * productosPorPagina, productosOrdenados.length)}</span> de <span className="font-bold text-slate-700">{productosOrdenados.length}</span> registros
                </span>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                        disabled={paginaActual === 1}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                    >
                        ◀ Anterior
                    </button>

                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-md font-mono font-bold text-emerald-800 text-xs shadow-2xs">
                        {paginaActual} / {totalPaginas}
                    </span>

                    <button
                        onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                        disabled={paginaActual === totalPaginas || totalPaginas === 0}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                    >
                        Siguiente ▶
                    </button>
                </div>
            </div>

        </div>
    );
}