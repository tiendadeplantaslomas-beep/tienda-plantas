'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';

export function ModuloCatalogo({
    productos = [],
    categories = [],
    suppliers = []
}: {
    productos?: any[];
    categories?: any[];
    suppliers?: any[];
    setProductos?: any
}) {
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
    const [ordenColumna, setOrdenColumna] = useState<'codigo' | 'producto' | 'categoria' | 'stock' | 'precio_final'>('producto');
    const [ordenAsc, setOrdenAsc] = useState(true);

    // Estados de Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const productosPorPagina = 15;

    // Referencia para el Autofocus
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Función auxiliar segura para extraer texto
    const extraerTexto = (valor: any): string => {
        if (!valor) return '';
        if (typeof valor === 'string') return valor;
        if (typeof valor === 'object') {
            return valor.name || valor.nombre || valor.title || JSON.stringify(valor);
        }
        return String(valor);
    };

    // Extraer categorías únicas
    const categoriasDisponibles = useMemo(() => {
        if (categories && categories.length > 0) return categories;
        const set = new Set<string>();
        productos.forEach(p => {
            const cat = extraerTexto(p.categoria || p.category);
            if (cat) set.add(cat);
        });
        return Array.from(set).map(c => ({ id: c, name: c }));
    }, [categories, productos]);

    // Filtrado ágil
    const productosFiltrados = useMemo(() => {
        if (!productos) return [];
        return productos.filter((p) => {
            const codigo = extraerTexto(p.codigo || p.code).toLowerCase();
            const producto = extraerTexto(p.producto || p.name).toLowerCase();
            const categoriaObj = p.categoria || p.category;
            const categoriaNombre = extraerTexto(categoriaObj).toLowerCase();
            const categoriaId = p.categoryId || (typeof categoriaObj === 'object' ? categoriaObj?.id : '');

            const proveedorTexto = extraerTexto(p.proveedor || p.provider || p.supplier).toLowerCase();
            const query = busqueda.toLowerCase().trim();

            const coincideBusqueda =
                !query ||
                codigo.includes(query) ||
                producto.includes(query) ||
                categoriaNombre.includes(query) ||
                proveedorTexto.includes(query);

            const coincideCategoria =
                categoriaFiltro === 'todas' ||
                categoriaId === categoriaFiltro ||
                categoriaNombre === categoriaFiltro.toLowerCase();

            return coincideBusqueda && coincideCategoria;
        });
    }, [productos, busqueda, categoriaFiltro]);

    // Ordenamiento
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

    // Paginación
    const totalPaginas = Math.ceil(productosOrdenados.length / productosPorPagina) || 1;
    const productosPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * productosPorPagina;
        return productosOrdenados.slice(inicio, inicio + productosPorPagina);
    }, [productosOrdenados, paginaActual]);

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

            {/* CABECERA CON BUSCADOR Y CHIPS DE CATEGORÍAS */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 text-xs shadow-2xs shrink-0">
                            📖
                        </div>
                        <div>
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block leading-tight">Catálogo Botánico e Insumos</span>
                            <span className="text-[10px] text-slate-400 font-medium">Sincronizado con Productos</span>
                        </div>
                    </div>

                    {/* Buscador con Autofocus */}
                    <div className="relative w-full sm:w-72">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar código, producto, proveedor..."
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPaginaActual(1);
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 pl-9 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
                        />
                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => setBusqueda('')}
                                className="absolute inset-y-0 right-0 pr-3 text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Chips de Categorías (Filtros Rápidos) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => { setCategoriaFiltro('todas'); setPaginaActual(1); }}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 ${categoriaFiltro === 'todas'
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        🌿 Todas ({productos.length})
                    </button>

                    {categoriasDisponibles.map((cat: any) => {
                        const catId = cat.id || cat.name;
                        const catName = cat.name || cat;
                        const count = productos.filter(p => {
                            const cObj = p.categoria || p.category;
                            return cObj === catId || cObj?.id === catId || extraerTexto(cObj).toLowerCase() === catName.toLowerCase();
                        }).length;

                        return (
                            <button
                                key={catId}
                                type="button"
                                onClick={() => { setCategoriaFiltro(catId); setPaginaActual(1); }}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${categoriaFiltro === catId
                                        ? 'bg-emerald-700 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <span>{catName}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${categoriaFiltro === catId ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TABLA DE PRODUCTOS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[350px]">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase text-slate-500 tracking-wider select-none">
                                <th onClick={() => manejarOrden('codigo')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                    Código {ordenColumna === 'codigo' && (ordenAsc ? '▲' : '▼')}
                                </th>
                                <th onClick={() => manejarOrden('producto')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                    Producto {ordenColumna === 'producto' && (ordenAsc ? '▲' : '▼')}
                                </th>
                                <th onClick={() => manejarOrden('categoria')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                    Categoría {ordenColumna === 'categoria' && (ordenAsc ? '▲' : '▼')}
                                </th>
                                <th className="px-4 py-3">Proveedor</th>
                                <th className="px-4 py-3">Costo Total</th>
                                <th className="px-4 py-3">Margen</th>
                                <th onClick={() => manejarOrden('precio_final')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                                    Precio Final {ordenColumna === 'precio_final' && (ordenAsc ? '▲' : '▼')}
                                </th>
                                <th onClick={() => manejarOrden('stock')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
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
                                    const proveedor = extraerTexto(p.proveedor || p.provider || p.supplier) || '-';

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
                                            <td className="px-4 py-2.5 text-slate-600 font-semibold uppercase">
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

                {/* PAGINACIÓN */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
                    <span className="text-slate-500 font-medium text-[11px]">
                        Mostrando del <span className="font-bold text-slate-700">{productosOrdenados.length > 0 ? (paginaActual - 1) * productosPorPagina + 1 : 0}</span> al <span className="font-bold text-slate-700">{Math.min(paginaActual * productosPorPagina, productosOrdenados.length)}</span> de <span className="font-bold text-slate-700">{productosOrdenados.length}</span> registros
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
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
                            type="button"
                            onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                            disabled={paginaActual === totalPaginas || totalPaginas === 0}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                        >
                            Siguiente ▶
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}