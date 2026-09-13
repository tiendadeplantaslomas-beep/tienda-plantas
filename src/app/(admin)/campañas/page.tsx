'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Campaign {
    id: number;
    titulo: string;
    descripcion: string;
    imagenUrl: string;
    etiqueta: string;
    tipo: string;
}

export default function CampanasAdminPage() {
    const [campanas, setCampanas] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ titulo: '', descripcion: '', imagenUrl: '', etiqueta: '', tipo: 'verde' });

    const cargarCampanas = async () => {
        try {
            const res = await fetch('/api/campanas');
            const data = await res.json();
            if (Array.isArray(data)) setCampanas(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargarCampanas(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/campanas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        setForm({ titulo: '', descripcion: '', imagenUrl: '', etiqueta: '', tipo: 'verde' });
        cargarCampanas();
    };

    const eliminarCampana = async (id: number) => {
        if (!confirm('¿Eliminar campaña?')) return;
        await fetch(`/api/campanas?id=${id}`, { method: 'DELETE' });
        cargarCampanas();
    };

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4 text-slate-800 font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Marketing / Eventos</span>
                    <h1 className="text-lg font-black text-slate-900">Gestión de Campañas Especiales</h1>
                </div>
                <Link href="/" className="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300">
                    ← Volver al Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-md border border-slate-200 shadow-xs space-y-3 h-fit">
                    <h2 className="text-xs font-black uppercase text-slate-700">Nueva Campaña</h2>
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título</label>
                            <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required className="w-full text-xs p-2 border border-slate-300 rounded focus:border-purple-600 outline-hidden" placeholder="Ej: Temporada de Podas" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descripción</label>
                            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded focus:border-purple-600 outline-hidden" rows={2} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Imagen URL</label>
                            <input type="text" value={form.imagenUrl} onChange={e => setForm({ ...form, imagenUrl: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded focus:border-purple-600 outline-hidden" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Etiqueta</label>
                                <input type="text" value={form.etiqueta} onChange={e => setForm({ ...form, etiqueta: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded focus:border-purple-600 outline-hidden" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo de Estilo</label>
                                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded bg-white">
                                    <option value="verde">Verde</option>
                                    <option value="oscuro">Oscuro</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded transition-colors cursor-pointer mt-2">
                            Guardar Campaña
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 bg-white p-4 rounded-md border border-slate-200 shadow-xs space-y-3">
                    <h2 className="text-xs font-black uppercase text-slate-700">Campañas Registradas</h2>
                    {loading ? <p className="text-xs text-slate-400">Cargando...</p> : campanas.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded text-xs gap-3">
                            <div className="flex-1">
                                <span className="text-[9px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">{c.etiqueta || c.tipo}</span>
                                <h4 className="font-bold text-slate-900 mt-1">{c.titulo}</h4>
                                <p className="text-[10px] text-slate-500">{c.descripcion}</p>
                            </div>
                            <button onClick={() => eliminarCampana(c.id)} className="text-rose-600 hover:underline font-bold">Eliminar</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}