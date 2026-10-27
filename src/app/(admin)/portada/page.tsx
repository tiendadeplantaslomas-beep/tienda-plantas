// src/app/admin/portada/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Trash2, Plus, Image as ImageIcon, CheckCircle, AlertCircle, ArrowLeft, ChevronRight, ChevronLeft, Search, Edit2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

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
    productosIds?: string[];
}

interface Product {
    id: string | number;
    nombre: string;
    precio?: number;
    categoria?: string;
    category?: { name: string };
}

const SECCIONES_DISPONIBLES = [
    { id: 'hero', nombre: 'Hero / Banner Principal' },
    { id: 'promociones', nombre: 'Sección de Promociones' },
    { id: 'categorias', nombre: 'Carrusel de Categorías' },
    { id: 'beneficios', nombre: 'Barra de Beneficios / Confianza' },
    { id: 'institucional', nombre: 'Bloque Institucional' }
];

const TRAMOS_BENEFICIOS = [
    { id: 'Medios de Pago', label: '💳 1. Medios de Pago' },
    { id: 'Contactanos', label: '📞 2. Contactanos' },
    { id: 'Envíos Programados', label: '🚚 3. Envíos Programados' }
];

export default function PortadaAdminPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
    const [filtroSeccion, setFiltroSeccion] = useState<string>('todos');

    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 5;

    const [pilaMinimizada, setPilaMinimizada] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [busquedaStack, setBusquedaStack] = useState('');

    const [form, setForm] = useState({
        seccion: 'hero',
        titulo: '',
        subtitulo: '',
        imagenUrl: '',
        link: '',
        badge: '',
        orden: 0,
        activo: true,
        productosSeleccionados: [] as Product[]
    });

    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        if (mensaje.texto) {
            const timer = setTimeout(() => {
                setMensaje({ texto: '', tipo: '' });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [mensaje]);

    useEffect(() => {
        setPaginaActual(1);
    }, [filtroSeccion]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const fetchSeguro = async (url: string) => {
                try {
                    const res = await fetch(url);
                    const text = await res.text();
                    return text ? JSON.parse(text) : null;
                } catch (e) {
                    return null;
                }
            };

            const [dataBanners, catData, prodData] = await Promise.all([
                fetchSeguro('/api/banners'),
                fetchSeguro('/api/categories'),
                fetchSeguro('/api/products')
            ]);

            if (Array.isArray(dataBanners)) setBanners(dataBanners);

            let catsList: string[] = [];
            if (Array.isArray(catData)) {
                catsList = catData.map((c: any) => c.name || c.nombre || c).filter(Boolean);
            }

            let prodsList: any[] = [];
            if (prodData) {
                prodsList = Array.isArray(prodData) ? prodData : (prodData.productos || prodData.data || []);
                const normalizados = prodsList.map((p: any) => ({
                    id: p.id,
                    nombre: p.name || p.nombre || 'Sin nombre',
                    precio: p.price || p.precio || 0,
                    categoria: p.category?.name || p.categoria || ''
                }));
                setAllProducts(normalizados);
            }

            setCategories(catsList.length > 0 ? catsList : ['Plantas de Interior', 'Plantas de Exterior', 'Macetas y Jardinería']);
        } catch (error) {
            console.error('Error al cargar datos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

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
                    const MAX_WIDTH = 1000;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    setForm(prev => ({ ...prev, imagenUrl: compressedBase64 }));
                    setPreviewUrl(compressedBase64);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddProductToStack = (prod: Product) => {
        if (!form.productosSeleccionados.some(p => String(p.id) === String(prod.id))) {
            setForm(prev => ({ ...prev, productosSeleccionados: [...prev.productosSeleccionados, prod] }));
        }
    };

    const handleRemoveProductFromStack = (prodId: string | number) => {
        setForm(prev => ({
            ...prev,
            productosSeleccionados: prev.productosSeleccionados.filter(p => String(p.id) !== String(prodId))
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensaje({ texto: '', tipo: '' });
        setGuardando(true);

        const seleccionados = form.productosSeleccionados || [];

        let datosAEnviar = {
            ...form,
            id: editandoId || undefined,
            link: form.seccion === 'categorias' ? `/tienda/categoria/${encodeURIComponent(form.titulo)}` : form.link,
            productosIds: seleccionados.map(p => String(p.id))
        };

        try {
            const res = await fetch('/api/banners', {
                method: editandoId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosAEnviar)
            });

            if (res.ok) {
                setMensaje({ texto: editandoId ? '¡Elemento actualizado correctamente!' : '¡Elemento guardado con éxito en TiDB!', tipo: 'exito' });
                setForm({ seccion: 'hero', titulo: '', subtitulo: '', imagenUrl: '', link: '', badge: '', orden: 0, activo: true, productosSeleccionados: [] });
                setPreviewUrl('');
                setEditandoId(null);
                cargarDatos();
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

    const handleEditarBanner = (banner: Banner) => {
        setEditandoId(banner.id);
        setForm({
            seccion: banner.seccion,
            titulo: banner.titulo,
            subtitulo: banner.subtitulo || '',
            imagenUrl: banner.imagenUrl || '',
            link: banner.link || '',
            badge: banner.badge || '',
            orden: banner.orden || 0,
            activo: banner.activo,
            productosSeleccionados: allProducts.filter(p => banner.productosIds?.includes(String(p.id)))
        });
        setPreviewUrl(banner.imagenUrl || '');
        setPilaMinimizada(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleActivo = async (banner: Banner) => {
        try {
            const res = await fetch('/api/banners', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...banner, activo: !banner.activo })
            });
            if (res.ok) cargarDatos();
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const eliminarBanner = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este elemento?')) return;
        try {
            const res = await fetch(`/api/banners?id=${id}`, { method: 'DELETE' });
            if (res.ok) cargarDatos();
        } catch (error) {
            console.error('Error al eliminar:', error);
        }
    };

    const bannersFiltrados = filtroSeccion === 'todos'
        ? banners
        : banners.filter(b => b.seccion === filtroSeccion);

    const totalPaginas = Math.ceil(bannersFiltrados.length / elementosPorPagina) || 1;
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
    const bannersPaginados = bannersFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);

    const normalizar = (str: string) =>
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

    const productosDisponiblesStock = allProducts
        .filter(p => {
            const noSeleccionado = !form.productosSeleccionados.some(sel => String(sel.id) === String(p.id));
            if (!noSeleccionado) return false;

            if (form.seccion === 'categorias' && form.titulo) {
                const catProdNorm = normalizar(p.categoria || '');
                const catFormNorm = normalizar(form.titulo);
                if (catProdNorm !== catFormNorm && !catProdNorm.includes(catFormNorm)) return false;
            }

            if (busquedaStack.trim()) {
                const busquedaNorm = normalizar(busquedaStack);
                const nombreNorm = normalizar(p.nombre);
                if (!nombreNorm.includes(busquedaNorm)) return false;
            }

            return true;
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return (
        <div className="w-full min-h-screen bg-stone-100/60 p-3 md:p-4 space-y-3 font-sans text-stone-800 box-border">
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
                <div className={`p-2 rounded-md text-xs font-bold flex items-center gap-2 border transition-all duration-300 ${mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {mensaje.tipo === 'exito' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{mensaje.texto}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <div className="lg:col-span-6 bg-white p-3 rounded-md border border-stone-200/80 shadow-xs space-y-2.5">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <h2 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-stone-700" />
                            {editandoId ? `Editando Elemento #${editandoId}` : 'Nuevo Elemento Visual'}
                        </h2>
                        {editandoId && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Modo Edición</span>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-stone-500 uppercase block mb-0.5">Sección</label>
                                <select
                                    value={form.seccion}
                                    onChange={e => setForm({ ...form, seccion: e.target.value, titulo: '', productosSeleccionados: [] })}
                                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:border-stone-700 outline-none text-stone-800"
                                >
                                    {SECCIONES_DISPONIBLES.map(sec => (
                                        <option key={sec.id} value={sec.id}>{sec.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-stone-500 uppercase block mb-0.5">Orden</label>
                                <input
                                    type="number"
                                    value={form.orden}
                                    onChange={e => setForm({ ...form, orden: Number(e.target.value) })}
                                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:border-stone-700 outline-none text-stone-800"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-stone-500 uppercase block mb-0.5">
                                    {form.seccion === 'categorias' ? 'Categoría Asociada' : form.seccion === 'beneficios' ? 'Tramo de la Barra' : 'Título Principal'}
                                </label>
                                {form.seccion === 'categorias' ? (
                                    <select
                                        value={form.titulo}
                                        onChange={e => setForm({ ...form, titulo: e.target.value, link: `/tienda/categoria/${encodeURIComponent(e.target.value)}`, productosSeleccionados: [] })}
                                        required
                                        className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:border-stone-700 outline-none text-stone-800 font-bold uppercase"
                                    >
                                        <option value="">-- SELECCIONÁ --</option>
                                        {categories.map((cat, idx) => (
                                            <option key={idx} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                ) : form.seccion === 'beneficios' ? (
                                    <select
                                        value={form.titulo}
                                        onChange={e => setForm({ ...form, titulo: e.target.value })}
                                        required
                                        className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:border-stone-700 outline-none text-stone-800 font-bold uppercase"
                                    >
                                        <option value="">-- SELECCIONÁ TRAMO --</option>
                                        {TRAMOS_BENEFICIOS.map(tramo => (
                                            <option key={tramo.id} value={tramo.id}>{tramo.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={form.titulo}
                                        onChange={e => setForm({ ...form, titulo: e.target.value })}
                                        required
                                        className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:border-stone-700 outline-none text-stone-800"
                                        placeholder="Ej: Vivero 2026"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-stone-500 uppercase block mb-0.5">Subtítulo</label>
                                <input
                                    type="text"
                                    value={form.subtitulo}
                                    onChange={e => setForm({ ...form, subtitulo: e.target.value })}
                                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded focus:border-stone-700 outline-none text-stone-800"
                                    placeholder="Ej: Tarjetas, efectivo y transferencias."
                                />
                            </div>
                        </div>

                        {/* 📦 PILA QUIRÚRGICA */}
                        {(form.seccion === 'categorias' || form.seccion === 'promociones') && (
                            <div className="space-y-1.5 p-2 bg-stone-50 rounded-md border border-stone-200 shadow-inner">
                                <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-extrabold text-stone-800 uppercase flex items-center gap-1">
                                        📦 Pila Quirúrgica (A-Z)
                                        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                            ({form.productosSeleccionados.length} seleccionados)
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setPilaMinimizada(!pilaMinimizada)}
                                        className="text-[9px] font-bold text-stone-700 bg-white hover:bg-stone-100 px-2 py-0.5 rounded transition border border-stone-300 cursor-pointer flex items-center gap-1"
                                    >
                                        {pilaMinimizada ? <><ChevronDown className="w-3 h-3" /> Expandir Pila</> : <><ChevronUp className="w-3 h-3" /> Minimizar Pila</>}
                                    </button>
                                </div>

                                {!pilaMinimizada && (
                                    <div className="space-y-1.5 animate-in fade-in">
                                        <div className="relative">
                                            <Search className="w-3 h-3 text-stone-400 absolute left-2 top-2" />
                                            <input
                                                type="text"
                                                placeholder="Buscar producto..."
                                                value={busquedaStack}
                                                onChange={e => setBusquedaStack(e.target.value)}
                                                className="w-full text-[10px] bg-white border border-stone-200 rounded py-1 pl-6 pr-2 outline-none focus:border-stone-700 font-medium text-stone-800 uppercase"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5">
                                            <div className="border border-stone-200 bg-white rounded p-1 h-32 overflow-y-auto space-y-0.5">
                                                <span className="text-[8px] font-extrabold text-stone-400 block px-1 uppercase">Disponibles ({productosDisponiblesStock.length})</span>
                                                {productosDisponiblesStock.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between p-0.5 bg-stone-50 hover:bg-emerald-50 rounded text-[9px] border border-stone-100">
                                                        <span className="truncate pr-1 font-medium text-stone-700" title={p.nombre}>{p.nombre}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddProductToStack(p)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-0.5 rounded transition shrink-0 cursor-pointer"
                                                        >
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border border-emerald-300 bg-emerald-50/40 rounded p-1 h-32 overflow-y-auto space-y-0.5">
                                                <span className="text-[8px] font-extrabold text-emerald-800 block px-1 uppercase">Seleccionados ({(form.productosSeleccionados || []).length})</span>
                                                {form.productosSeleccionados.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between p-0.5 bg-white rounded text-[9px] border border-emerald-200 shadow-2xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveProductFromStack(p.id)}
                                                            className="bg-rose-600 hover:bg-rose-700 text-white p-0.5 rounded transition shrink-0 cursor-pointer"
                                                        >
                                                            <ChevronLeft className="w-3 h-3" />
                                                        </button>
                                                        <span className="truncate pl-1 font-bold text-stone-900" title={p.nombre}>{p.nombre}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-500 uppercase block">Imagen o Icono de Portada</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 flex items-center justify-center gap-1.5 p-1.5 border-2 border-dashed border-stone-200 hover:border-stone-400 rounded bg-stone-50 cursor-pointer transition">
                                    <Upload className="w-3.5 h-3.5 text-stone-400" />
                                    <span className="text-[10px] font-bold text-stone-600">Elegir archivo (Comprimido)</span>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                                {(previewUrl || form.imagenUrl) && (
                                    <div className="w-8 h-8 rounded overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                                        <img src={previewUrl || form.imagenUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-stone-500 uppercase block mb-0.5">Badge / Emoji</label>
                                <input
                                    type="text"
                                    value={form.badge}
                                    onChange={e => setForm({ ...form, badge: e.target.value })}
                                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded outline-none"
                                    placeholder="Ej: 💳 / 📞 / 🚚"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-stone-500 uppercase block mb-0.5">Link de Destino</label>
                                <input
                                    type="text"
                                    value={form.seccion === 'categorias' ? `/tienda/categoria/${encodeURIComponent(form.titulo)}` : form.link}
                                    onChange={e => setForm({ ...form, link: e.target.value })}
                                    disabled={form.seccion === 'categorias'}
                                    className="w-full text-xs p-1.5 bg-stone-50 border border-stone-200 rounded outline-none disabled:bg-stone-100 disabled:text-stone-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            {editandoId && (
                                <button
                                    type="button"
                                    onClick={() => { setEditandoId(null); setForm({ seccion: 'hero', titulo: '', subtitulo: '', imagenUrl: '', link: '', badge: '', orden: 0, activo: true, productosSeleccionados: [] }); setPreviewUrl(''); }}
                                    className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs py-1.5 rounded transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={guardando}
                                className="flex-1 bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold text-xs py-1.5 rounded transition cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                {guardando ? 'Guardando...' : (editandoId ? 'Actualizar Registro' : 'Guardar en Base de Datos')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* COLUMNA DERECHA: CRUD */}
                <div className="lg:col-span-6 bg-white p-3 rounded-md border border-stone-200/80 shadow-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-stone-100 pb-2">
                        <h2 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-stone-700" />
                            Elementos Registrados (CRUD)
                        </h2>

                        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                            <button
                                onClick={() => setFiltroSeccion('todos')}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded transition ${filtroSeccion === 'todos' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                            >
                                Todos
                            </button>
                            {SECCIONES_DISPONIBLES.map(sec => (
                                <button
                                    key={sec.id}
                                    onClick={() => setFiltroSeccion(sec.id)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition whitespace-nowrap ${filtroSeccion === sec.id ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
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
                        <div className="space-y-2">
                            <div className="space-y-1.5 min-h-[300px]">
                                {bannersPaginados.map(banner => (
                                    <div key={banner.id} className={`flex items-center justify-between p-2 border rounded-md text-xs gap-2 transition ${banner.activo ? 'bg-stone-50/70 border-stone-200' : 'bg-stone-200/40 border-stone-300 opacity-60'}`}>
                                        <div className="w-12 h-10 rounded bg-stone-200 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center font-bold">
                                            {banner.imagenUrl ? (
                                                <img src={banner.imagenUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{banner.badge || '🌱'}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[8px] font-extrabold uppercase bg-stone-200 text-stone-800 px-1 py-0.5 rounded">
                                                    {banner.seccion}
                                                </span>
                                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${banner.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                    {banner.activo ? 'Activo' : 'Oculto'}
                                                </span>
                                            </div>
                                            <h4 className="font-extrabold text-stone-900 truncate text-[11px]">{banner.titulo}</h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-stone-500">Ord: {banner.orden}</span>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleToggleActivo(banner)}
                                                className={`p-1 rounded border transition cursor-pointer ${banner.activo ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
                                            >
                                                {banner.activo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => handleEditarBanner(banner)}
                                                className="text-sky-700 bg-sky-50 hover:bg-sky-100 p-1 rounded border border-sky-200 transition cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => eliminarBanner(banner.id)}
                                                className="text-rose-600 hover:text-white hover:bg-rose-600 p-1 rounded border border-rose-200 transition cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {totalPaginas > 1 && (
                                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                                    <span className="text-stone-500 font-medium">
                                        Página <strong className="text-stone-800">{paginaActual}</strong> de <strong className="text-stone-800">{totalPaginas}</strong>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                                            disabled={paginaActual === 1}
                                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 rounded font-bold transition cursor-pointer"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                                            disabled={paginaActual === totalPaginas}
                                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 rounded font-bold transition cursor-pointer"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}