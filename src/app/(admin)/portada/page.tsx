// src/app/admin/portada/page.tsx[cite: 4]
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Trash2, Plus, Image as ImageIcon, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface Banner {
    id: number;
    seccion: string;
    titulo: string;
    subtitulo: string;
    imagenUrl: string;
    link: string;
    badge: string;
    activo: boolean;
    orden: number;
}

const SECCIONES_DISPONIBLES = [
    { id: 'hero', nombre: 'Hero / Banner Principal' },
    { id: 'promociones', nombre: 'Sección de Promociones' },
    { id: 'categorias', nombre: 'Carrusel de Categorías' },
    { id: 'institucional', nombre: 'Bloque Institucional' }
];

export default function PortadaAdminPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

    const [filtroSeccion, setFiltroSeccion] = useState<string>('todos');

    const [form, setForm] = useState({
        seccion: 'hero',
        titulo: '',
        subtitulo: '',
        imagenUrl: '',
        link: '',
        badge: '',
        orden: 0,
        activo: true
    });

    const [previewUrl, setPreviewUrl] = useState<string>('');

    const cargarBanners = async () => {
        try {
            setLoading(true);
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

    // Comprime y convierte la imagen local a Base64 optimizado para evitar errores 500
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Máximo ancho de 1200px para mantener buena calidad web optimizada
                    const MAX_WIDTH = 1200;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Comprime a JPEG con calidad 0.7 (70%) reduciendo drásticamente el peso
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    setForm(prev => ({ ...prev, imagenUrl: compressedBase64 }));
                    setPreviewUrl(compressedBase64);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensaje({ texto: '', tipo: '' });
        setGuardando(true);

        try {
            const res = await fetch('/api/banners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setMensaje({ texto: '¡Elemento guardado con éxito en TiDB!', tipo: 'exito' });
                setForm({ seccion: 'hero', titulo: '', subtitulo: '', imagenUrl: '', link: '', badge: '', orden: 0, activo: true });
                setPreviewUrl('');
                cargarBanners();
            } else {
                const errData = await res.json();
                setMensaje({ texto: errData.error || 'No se pudo guardar.', tipo: 'error' });
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            setMensaje({ texto: 'Ocurrió un error al procesar.', tipo: 'error' });
        } finally {
            setGuardando(false);
        }
    };

    const eliminarBanner = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
        try {
            const res = await fetch(`/api/banners?id=${id}`, { method: 'DELETE' });
            if (res.ok) cargarBanners();
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    };

    const bannersFiltrados = filtroSeccion === 'todos'
        ? banners
        : banners.filter(b => b.seccion === filtroSeccion);

    return (
        <div className="w-full min-h-screen bg-stone-100/60 p-3 md:p-4 space-y-3 font-sans text-stone-800 box-border">

            {/* ENCABEZADO SUPERIOR */}
            <div className="w-full bg-white p-3 rounded-md shadow-xs border border-stone-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                    <Link href="/" className="text-stone-400 hover:text-stone-600 transition bg-stone-50 p-1.5 rounded border border-stone-200">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest">Tienda Web / CMS Dinámico</span>
                        <h1 className="text-xs font-black text-stone-900 uppercase tracking-tight flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-stone-700" />
                            Gestión de Secciones e Imágenes de Portada
                        </h1>
                    </div>
                </div>
                <Link href="/" className="text-xs font-bold bg-white hover:bg-stone-50 text-stone-700 px-3 py-1.5 rounded-md border border-stone-200 shadow-xs transition">
                    Volver al Dashboard
                </Link>
            </div>

            {mensaje.texto && (
                <div className={`p-2.5 rounded-md text-xs font-bold flex items-center gap-2 border ${mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {mensaje.tipo === 'exito' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{mensaje.texto}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* Formulario */}
                <div className="lg:col-span-5 bg-white p-3.5 rounded-md border border-stone-200/80 shadow-xs space-y-3">
                    <h2 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                        <Plus className="w-4 h-4 text-stone-700" />
                        Nuevo Elemento Visual
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Sección</label>
                                <select
                                    value={form.seccion}
                                    onChange={e => setForm({ ...form, seccion: e.target.value })}
                                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-800"
                                >
                                    {SECCIONES_DISPONIBLES.map(sec => (
                                        <option key={sec.id} value={sec.id}>{sec.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Orden</label>
                                <input
                                    type="number"
                                    value={form.orden}
                                    onChange={e => setForm({ ...form, orden: Number(e.target.value) })}
                                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-800"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Título Principal</label>
                                <input
                                    type="text"
                                    value={form.titulo}
                                    onChange={e => setForm({ ...form, titulo: e.target.value })}
                                    required
                                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-800"
                                    placeholder="Ej: Vivero 2026"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Subtítulo</label>
                                <input
                                    type="text"
                                    value={form.subtitulo}
                                    onChange={e => setForm({ ...form, subtitulo: e.target.value })}
                                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-800"
                                    placeholder="Ej: Plantas directas"
                                />
                            </div>
                        </div>

                        {/* Selector de imagen optimizada y comprimida */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-stone-500 uppercase block">Imagen de Portada</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-md bg-stone-50 cursor-pointer transition">
                                    <Upload className="w-4 h-4 text-stone-400" />
                                    <span className="text-[11px] font-bold text-stone-600">Elegir archivo (Comprimido)</span>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                                {(previewUrl || form.imagenUrl) && (
                                    <div className="w-12 h-12 rounded-md overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                                        <img src={previewUrl || form.imagenUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                value={form.imagenUrl.startsWith('data:') ? '[Imagen optimizada y comprimida]' : form.imagenUrl}
                                onChange={e => setForm({ ...form, imagenUrl: e.target.value })}
                                placeholder="O pegá URL externa"
                                className="w-full text-[11px] p-1.5 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Badge</label>
                                <input
                                    type="text"
                                    value={form.badge}
                                    onChange={e => setForm({ ...form, badge: e.target.value })}
                                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-800"
                                    placeholder="Ej: Nuevo"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Link de Destino</label>
                                <input
                                    type="text"
                                    value={form.link}
                                    onChange={e => setForm({ ...form, link: e.target.value })}
                                    className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-md focus:border-stone-700 outline-none text-stone-800"
                                    placeholder="Ej: /tienda"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={guardando}
                            className="w-full bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold text-xs py-2 rounded-md transition cursor-pointer shadow-xs disabled:opacity-50 mt-1"
                        >
                            {guardando ? 'Guardando en TiDB...' : 'Guardar en Base de Datos'}
                        </button>
                    </form>
                </div>

                {/* Listado */}
                <div className="lg:col-span-7 bg-white p-3.5 rounded-md border border-stone-200/80 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-2">
                        <h2 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-stone-700" />
                            Elementos Registrados
                        </h2>

                        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                            <button
                                onClick={() => setFiltroSeccion('todos')}
                                className={`text-[10px] font-bold px-2 py-1 rounded transition ${filtroSeccion === 'todos' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                                Todos
                            </button>
                            {SECCIONES_DISPONIBLES.map(sec => (
                                <button
                                    key={sec.id}
                                    onClick={() => setFiltroSeccion(sec.id)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded transition whitespace-nowrap ${filtroSeccion === sec.id ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                                >
                                    {sec.nombre.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <p className="text-xs text-stone-400 animate-pulse py-6 text-center">Cargando elementos...</p>
                    ) : bannersFiltrados.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-md">
                            <p className="text-xs text-stone-400 italic">No hay elementos cargados.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                            {bannersFiltrados.map(banner => (
                                <div key={banner.id} className="flex items-center justify-between p-2 bg-stone-50/70 border border-stone-200/80 rounded-md text-xs gap-3">
                                    <div className="w-14 h-10 rounded bg-stone-200 overflow-hidden shrink-0 border border-stone-200">
                                        <img src={banner.imagenUrl || '/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-extrabold uppercase bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded">
                                                {banner.seccion}
                                            </span>
                                            {banner.badge && (
                                                <span className="text-[9px] font-bold bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                                                    {banner.badge}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-extrabold text-stone-900 truncate text-[11px]">{banner.titulo}</h4>
                                    </div>
                                    <span className="text-[10px] font-bold text-stone-500">Ord: {banner.orden}</span>
                                    <button
                                        onClick={() => eliminarBanner(banner.id)}
                                        className="text-rose-600 hover:text-white hover:bg-rose-600 p-1.5 rounded border border-rose-200 transition cursor-pointer shrink-0"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
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