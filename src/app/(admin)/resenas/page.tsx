'use client';

import React, { useState, useEffect } from 'react';
import { Star, MessageCircle, Send, CheckCircle2, ArrowLeft, AlertCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';

interface ResenaAdmin {
    id: number;
    nombre: string;
    comentario: string;
    estrellas: number;
    respuesta: string | null;
    fecha: string;
    activo: boolean;
}

export default function AdminResenasPage() {
    const [resenas, setResenas] = useState<ResenaAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<'TODAS' | 'PENDIENTES' | 'RESPONDIDAS'>('PENDIENTES');
    const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null);
    const [resenaSeleccionada, setResenaSeleccionada] = useState<ResenaAdmin | null>(null);
    const [textoRespuesta, setTextoRespuesta] = useState('');
    const [mensajeFeedback, setMensajeFeedback] = useState('');

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 5;

    const cargarResenas = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/resenas');
            const data = await res.json();
            if (Array.isArray(data)) {
                setResenas(data);
                const pendientesList = data.filter((r: ResenaAdmin) => !r.respuesta || r.respuesta.trim() === '');
                const sugerida = pendientesList.length > 0 ? pendientesList[0] : data[0];

                if (sugerida && !resenaSeleccionada) {
                    setResenaSeleccionada(sugerida);
                    setTextoRespuesta(sugerida.respuesta || '');
                }
            }
        } catch (error) {
            console.error('Error al cargar reseñas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarResenas();
    }, []);

    useEffect(() => {
        setPaginaActual(1);
    }, [filtro, filtroEstrellas]);

    const handleSelectResena = (resena: ResenaAdmin) => {
        setResenaSeleccionada(resena);
        setTextoRespuesta(resena.respuesta || '');
    };

    const handleResponder = async () => {
        if (!resenaSeleccionada) return;
        if (!textoRespuesta.trim()) {
            alert('Escribe una respuesta antes de guardar.');
            return;
        }

        try {
            const res = await fetch('/api/resenas', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: resenaSeleccionada.id, respuesta: textoRespuesta })
            });

            if (res.ok) {
                setMensajeFeedback(`¡Respuesta guardada con éxito!`);
                await cargarResenas();
                const actualizada = { ...resenaSeleccionada, respuesta: textoRespuesta };
                setResenaSeleccionada(actualizada);
                setTimeout(() => setMensajeFeedback(''), 3000);
            } else {
                alert('No se pudo guardar la respuesta.');
            }
        } catch (error) {
            console.error('Error al enviar respuesta:', error);
            alert('Error de conexión.');
        }
    };

    // Filtrado y ordenamiento
    const resenasFiltradas = resenas
        .filter(r => {
            if (filtroEstrellas !== null && r.estrellas !== filtroEstrellas) return false;
            if (filtro === 'PENDIENTES') return !r.respuesta || r.respuesta.trim() === '';
            if (filtro === 'RESPONDIDAS') return r.respuesta && r.respuesta.trim() !== '';
            return true;
        })
        .sort((a, b) => {
            const aPendiente = !a.respuesta || a.respuesta.trim() === '';
            const bPendiente = !b.respuesta || b.respuesta.trim() === '';
            if (aPendiente && !bPendiente) return -1;
            if (!aPendiente && bPendiente) return 1;
            return 0;
        });

    // Paginación
    const totalPaginas = Math.ceil(resenasFiltradas.length / itemsPorPagina) || 1;
    const indiceInicio = (paginaActual - 1) * itemsPorPagina;
    const resenasPaginadas = resenasFiltradas.slice(indiceInicio, indiceInicio + itemsPorPagina);

    // Métricas
    const totalResenas = resenas.length;
    const promedioEstrellas = totalResenas > 0
        ? (resenas.reduce((acc, r) => acc + (r.estrellas || 5), 0) / totalResenas).toFixed(1)
        : '5.0';
    const pendientesCount = resenas.filter(r => !r.respuesta || r.respuesta.trim() === '').length;

    return (
        <div className="w-full min-h-screen bg-stone-100/60 p-3 md:p-4 space-y-3 font-sans text-stone-800 box-border">
            {/* ENCABEZADO SUPERIOR */}
            <div className="w-full bg-white p-3 rounded-md shadow-xs border border-stone-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <Link href="/" className="text-stone-400 hover:text-stone-600 transition bg-stone-50 p-1.5 rounded border border-stone-200">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-xs font-black text-stone-900 uppercase tracking-tight flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 text-emerald-700" />
                            Moderación de Reseñas y Comunidad
                        </h1>
                        <p className="text-[10px] text-stone-500">
                            Gestión centralizada de opiniones de clientes y respuestas oficiales.
                        </p>
                    </div>
                </div>

                {mensajeFeedback && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {mensajeFeedback}
                    </div>
                )}
            </div>

            {/* GRILLA PRINCIPAL DE 3 COLUMNAS */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

                {/* COLUMNA 1: FILTROS Y RESUMEN (3 columnas) */}
                <div className="w-full lg:col-span-3 space-y-2.5">
                    {/* Filtros de Estado */}
                    <div className="bg-white border border-stone-200/80 rounded-md shadow-xs p-2.5 space-y-1.5">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Filtros de Opiniones</span>
                        <div className="space-y-1">
                            <button
                                onClick={() => setFiltro('PENDIENTES')}
                                className={`w-full text-left px-2 py-1 rounded text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${filtro === 'PENDIENTES' ? 'bg-amber-600 text-white' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                                    }`}
                            >
                                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Sin Responder</span>
                                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-black">{pendientesCount}</span>
                            </button>
                            <button
                                onClick={() => setFiltro('RESPONDIDAS')}
                                className={`w-full text-left px-2 py-1 rounded text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${filtro === 'RESPONDIDAS' ? 'bg-emerald-700 text-white' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                                    }`}
                            >
                                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Respondidas</span>
                                <span className="text-[10px] opacity-80">{totalResenas - pendientesCount}</span>
                            </button>
                            <button
                                onClick={() => setFiltro('TODAS')}
                                className={`w-full text-left px-2 py-1 rounded text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${filtro === 'TODAS' ? 'bg-stone-900 text-white' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                                    }`}
                            >
                                <span>Todas las Opiniones</span>
                                <span className="text-[10px] opacity-80">{totalResenas}</span>
                            </button>
                        </div>
                    </div>

                    {/* Indicadores de Satisfacción */}
                    <div className="bg-white border border-stone-200/80 rounded-md shadow-xs p-2.5 space-y-1.5">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Indicadores de Satisfacción</span>
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between items-center py-0.5 border-b border-stone-100">
                                <span className="text-stone-500">Promedio Estrellas:</span>
                                <span className="font-extrabold text-stone-900 flex items-center gap-1">
                                    {promedioEstrellas} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-b border-stone-100">
                                <span className="text-stone-500">Total Opiniones:</span>
                                <span className="font-extrabold text-stone-900">{totalResenas} u.</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-stone-500">Tasa de Respuesta:</span>
                                <span className="font-extrabold text-emerald-700">
                                    {totalResenas > 0 ? Math.round(((totalResenas - pendientesCount) / totalResenas) * 100) : 100}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* DESGLOSE POR ESTRELLAS COMPACTO (1 a 5) */}
                    <div className="bg-white border border-stone-200/80 rounded-md shadow-xs p-2.5 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                                <Filter className="w-3 h-3 text-stone-500" /> Desglose por Estrellas
                            </span>
                            {filtroEstrellas !== null && (
                                <button
                                    onClick={() => setFiltroEstrellas(null)}
                                    className="text-[9px] text-amber-700 underline font-bold cursor-pointer hover:text-amber-900"
                                >
                                    Ver todas
                                </button>
                            )}
                        </div>
                        <div className="space-y-1">
                            {[1, 2, 3, 4, 5].map(estrellas => {
                                const count = resenas.filter(r => r.estrellas === estrellas).length;
                                const isSelected = filtroEstrellas === estrellas;
                                return (
                                    <button
                                        key={estrellas}
                                        onClick={() => setFiltroEstrellas(isSelected ? null : estrellas)}
                                        className={`w-full text-left px-2 py-1 rounded text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${isSelected ? 'bg-amber-700 text-white' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2">{estrellas}</span>
                                            <div className="flex items-center gap-0.5">
                                                {Array.from({ length: estrellas }).map((_, i) => (
                                                    <Star key={i} className={`w-3 h-3 ${isSelected ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${isSelected ? 'bg-amber-800 text-white' : 'bg-stone-200 text-stone-800'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* COLUMNA 2: TABLA DE LISTADO CON PAGINACIÓN (6 columnas) */}
                <div className="w-full lg:col-span-6 bg-white border border-stone-200/80 rounded-md shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="bg-stone-50 px-3 py-2 border-b border-stone-200/80 flex justify-between items-center">
                            <span className="text-[10px] font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                                Listado de Reseñas ({resenasFiltradas.length})
                                {filtroEstrellas !== null && <span className="text-amber-700 font-normal">({filtroEstrellas} Estrellas)</span>}
                            </span>
                            <span className="text-[9px] text-stone-400 font-semibold">Seleccione para gestionar</span>
                        </div>

                        {loading ? (
                            <div className="w-full p-16 text-center text-xs text-stone-400 font-semibold animate-pulse">
                                Cargando opiniones...
                            </div>
                        ) : resenasFiltradas.length === 0 ? (
                            <div className="w-full p-16 text-center text-xs text-stone-400">
                                No hay reseñas con este filtro. ¡Excelente trabajo! 🎉
                            </div>
                        ) : (
                            <div className="w-full divide-y divide-stone-100">
                                {resenasPaginadas.map((r) => {
                                    const isSelected = resenaSeleccionada?.id === r.id;
                                    const tieneRespuesta = r.respuesta && r.respuesta.trim() !== '';

                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => handleSelectResena(r)}
                                            className={`w-full p-3 cursor-pointer transition-all flex items-center justify-between gap-2 ${isSelected ? 'bg-stone-100/90 border-l-4 border-stone-900' : 'hover:bg-stone-50/80'
                                                }`}
                                        >
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-stone-900 uppercase truncate">{r.nombre}</span>
                                                    <span className="text-[9px] text-stone-400">{r.fecha}</span>
                                                </div>
                                                <p className="text-[11px] text-stone-600 truncate italic">&ldquo;{r.comentario}&rdquo;</p>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                                                    {r.estrellas} <Star className="w-3 h-3 fill-current inline" />
                                                </div>
                                                {tieneRespuesta ? (
                                                    <span className="text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Respondida</span>
                                                ) : (
                                                    <span className="text-[8px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded animate-pulse">Pendiente</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* BARRA DE PAGINACIÓN INFERIOR */}
                    {!loading && resenasFiltradas.length > 0 && (
                        <div className="bg-stone-50 px-3 py-2 border-t border-stone-200/80 flex items-center justify-between text-[10px] text-stone-500 font-semibold rounded-b-md">
                            <span>
                                Página <strong className="text-stone-800">{paginaActual}</strong> de <strong className="text-stone-800">{totalPaginas}</strong>
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                                    disabled={paginaActual === 1}
                                    className="p-1 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Página Anterior"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                                    disabled={paginaActual === totalPaginas}
                                    className="p-1 rounded bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Página Siguiente"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUMNA 3: DETALLE Y PANEL DE RESPUESTA (3 columnas) */}
                <div className="w-full lg:col-span-3 bg-white border border-stone-200/80 rounded-md shadow-xs p-3 flex flex-col justify-between">
                    <div className="space-y-3">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block border-b border-stone-100 pb-1.5">
                            Detalle y Respuesta Oficial
                        </span>

                        {resenaSeleccionada ? (
                            <div className="space-y-3">
                                <div className="bg-stone-50 p-2.5 rounded border border-stone-200/60 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-stone-900 uppercase">{resenaSeleccionada.nombre}</span>
                                        <div className="flex items-center gap-1 text-amber-500 text-[10px] font-bold">
                                            {Array.from({ length: resenaSeleccionada.estrellas || 5 }).map((_, i) => (
                                                <Star key={i} className="w-3 h-3 fill-current inline" />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-stone-400 block">{resenaSeleccionada.fecha}</span>
                                    <p className="text-[11px] text-stone-700 italic bg-white p-2 rounded border border-stone-100">
                                        &ldquo;{resenaSeleccionada.comentario}&rdquo;
                                    </p>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase tracking-tight block">
                                        Respuesta Oficial de la Tienda:
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Escribe la respuesta institucional (ej: ¡Hola! Nos gustaría ponernos en contacto para saber cómo mejorar...)..."
                                        value={textoRespuesta}
                                        onChange={(e) => setTextoRespuesta(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-300 rounded p-2 text-[11px] text-stone-800 focus:ring-1 focus:ring-stone-900 focus:outline-none resize-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-[11px] text-stone-400">
                                Seleccioná una reseña del listado central para ver el detalle y redactar la respuesta.
                            </div>
                        )}
                    </div>

                    {resenaSeleccionada && (
                        <div className="pt-3 border-t border-stone-100 mt-3">
                            <button
                                onClick={handleResponder}
                                className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 rounded text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Send className="w-3.5 h-3.5 text-emerald-400" /> Guardar y Publicar
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}