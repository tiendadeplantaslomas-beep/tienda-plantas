'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Banner {
    id: number;
    titulo: string;
    subtitulo: string;
    imagenUrl: string;
    link: string;
    badge: string;
    activo: boolean;
    orden: number;
}

export default function PortadaAdminPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({
        titulo: '',
        subtitulo: '',
        imagenUrl: '',
        link: '',
        badge: '',
        orden: 0
    });

    const cargarBanners = async () => {
        try {
            const res = await fetch('/api/banners');
            const data = await res.json();
            if (Array.isArray(data)) setBanners(data);
        } catch (error) {
            console.error('Error al cargar banners:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarBanners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setForm({ titulo: '', subtitulo: '', imagenUrl: '', link: '', badge: '', orden: 0 });
                cargarBanners();
            }
        } catch (error) {
            console.error('Error al guardar banner:', error);
        }
    };

    const eliminarBanner = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este banner?')) return;
        try {
            await fetch(`/api/banners?id=${id}`, { method: 'DELETE' });
            cargarBanners();
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    };

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4 text-slate-800 font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                    <span className="text-[10px] font-bold text-sky-700 uppercase">Tienda Web / CMS</span>
                    <h1 className="text-lg font-black text-slate-900">Gestión de Imágenes de Portada (Banners)</h1>
                </div>
                <Link href="/" className="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300 transition-colors">
                    ← Volver al Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Formulario de Alta */}
                <div className="bg-white p-4 rounded-md border border-slate-200 shadow-xs space-y-3 h-fit">
                    <h2 className="text-xs font-black uppercase text-slate-700">Nuevo Banner</h2>
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Título Principal</label>
                            <input
                                type="text"
                                value={form.titulo}
                                onChange={e => setForm({ ...form, titulo: e.target.value })}
                                required
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-sky-600 outline-hidden"
                                placeholder="Ej: Vivero Online 2026"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Subtítulo</label>
                            <input
                                type="text"
                                value={form.subtitulo}
                                onChange={e => setForm({ ...form, subtitulo: e.target.value })}
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-sky-600 outline-hidden"
                                placeholder="Ej: Plantas directas de productor"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">URL de la Imagen</label>
                            <input
                                type="text"
                                value={form.imagenUrl}
                                onChange={e => setForm({ ...form, imagenUrl: e.target.value })}
                                required
                                className="w-full text-xs p-2 border border-slate-300 rounded focus:border-sky-600 outline-hidden"
                                placeholder="/images/banner-1.jpg o URL externa"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Badge / Etiqueta</label>
                                <input
                                    type="text"
                                    value={form.badge}
                                    onChange={e => setForm({ ...form, badge: e.target.value })}
                                    className="w-full text-xs p-2 border border-slate-300 rounded focus:border-sky-600 outline-hidden"
                                    placeholder="Ej: Nuevo Ingreso"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Orden</label>
                                <input
                                    type="number"
                                    value={form.orden}
                                    onChange={e => setForm({ ...form, orden: Number(e.target.value) })}
                                    className="w-full text-xs p-2 border border-slate-300 rounded focus:border-sky-600 outline-hidden"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2 rounded transition-colors cursor-pointer mt-2">
                            Guardar Banner
                        </button>
                    </form>
                </div>

                {/* Listado / Tabla ABM */}
                <div className="lg:col-span-2 bg-white p-4 rounded-md border border-slate-200 shadow-xs space-y-3">
                    <h2 className="text-xs font-black uppercase text-slate-700">Banners Activos en la Web</h2>
                    {loading ? (
                        <p className="text-xs text-slate-400 animate-pulse">Cargando portadas...</p>
                    ) : banners.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay banners cargados todavía.</p>
                    ) : (
                        <div className="space-y-2">
                            {banners.map(banner => (
                                <div key={banner.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded text-xs gap-3">
                                    <div className="w-16 h-10 rounded bg-slate-200 overflow-hidden shrink-0">
                                        <img src={banner.imagenUrl || '/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 truncate">{banner.titulo}</h4>
                                        <p className="text-[10px] text-slate-500 truncate">{banner.subtitulo}</p>
                                    </div>
                                    <span className="text-[9px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">Orden: {banner.orden}</span>
                                    <button
                                        onClick={() => eliminarBanner(banner.id)}
                                        className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}