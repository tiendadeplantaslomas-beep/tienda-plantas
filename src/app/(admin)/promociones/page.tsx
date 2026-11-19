'use client';

import { useState, useEffect } from 'react';
import { Tag, Trash2, Edit2, ArrowLeft, Check, Package, X, RefreshCw, Upload, Plus, Eye, Search, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import Link from 'next/link';

interface Category {
    id: number | string;
    name: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    categoryId?: number | string;
    category?: Category;
}

interface Promotion {
    id: number;
    titulo: string;
    descripcion?: string;
    badge?: string;
    linkWhatsapp?: string;
    imagenUrl?: string;
    stock: number;
    activa: boolean;
    categoria?: string;
    desde?: string;
    hasta?: string;
    productos?: Product[];
    envioGratis?: boolean;
}

export default function AdminPromocionesPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal Controls
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPilaViewOpen, setIsPilaViewOpen] = useState(false);
    const [promoPilaDetail, setPromoPilaDetail] = useState<Promotion | null>(null);

    // Estado Formulario
    const [editingId, setEditingId] = useState<number | null>(null);
    const [titulo, setTitulo] = useState('');
    const [badge, setBadge] = useState('15% OFF');
    const [linkWhatsapp, setLinkWhatsapp] = useState('https://wa.me/541140782378');
    const [imagenUrl, setImagenUrl] = useState('');
    const [stock, setStock] = useState<number>(10);
    const [categoriaPrincipal, setCategoriaPrincipal] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [activa, setActiva] = useState(true);
    const [envioGratis, setEnvioGratis] = useState(false);

    // Lógica Combo / Multi-categoría
    const [esCombo, setEsCombo] = useState(false);
    const [categoriaFiltroPila, setCategoriaFiltroPila] = useState<string>('TODAS');

    // Pila de productos
    const [productosIds, setProductosIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [mensajeFeedback, setMensajeFeedback] = useState('');

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 6;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resPromos, resProds, resCats] = await Promise.all([
                fetch('/api/promotions').catch(() => null),
                fetch('/api/products').catch(() => null),
                fetch('/api/categories').catch(() => null)
            ]);

            let loadedPromos: Promotion[] = [];
            let loadedProds: Product[] = [];
            let loadedCats: Category[] = [];

            if (resPromos && resPromos.ok) loadedPromos = await resPromos.json();
            if (resProds && resProds.ok) loadedProds = await resProds.json();
            if (resCats && resCats.ok) loadedCats = await resCats.json();

            setPromotions(Array.isArray(loadedPromos) ? loadedPromos : []);
            setAllProducts(Array.isArray(loadedProds) ? loadedProds : []);

            if (Array.isArray(loadedCats) && loadedCats.length > 0) {
                setCategories(loadedCats);
            } else {
                const extractedMap = new Map<any, Category>();
                loadedProds.forEach((p) => {
                    if (p && p.category) {
                        const catId = p.category.id || p.category.name;
                        extractedMap.set(catId, { id: catId, name: p.category.name || String(catId) });
                    }
                });
                setCategories(Array.from(extractedMap.values()));
            }
        } catch (err) {
            console.error('Error al cargar:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagenUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setTitulo('');
        setBadge('15% OFF');
        setStock(10);
        setCategoriaPrincipal('');
        setImagenUrl('');
        setDesde('');
        setHasta('');
        setActiva(true);
        setEnvioGratis(false);
        setEsCombo(false);
        setCategoriaFiltroPila('TODAS');
        setProductosIds([]);
    };

    const handleOpenCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleEditClick = (promo: Promotion) => {
        setEditingId(promo.id);
        setTitulo(promo.titulo || '');
        setBadge(promo.badge || '');
        setStock(promo.stock ?? 10);
        setCategoriaPrincipal(promo.categoria || '');
        setImagenUrl(promo.imagenUrl || '');
        setLinkWhatsapp(promo.linkWhatsapp || 'https://wa.me/541140782378');
        setDesde(promo.desde ? promo.desde.slice(0, 10) : '');
        setHasta(promo.hasta ? promo.hasta.slice(0, 10) : '');
        setActiva(promo.activa ?? true);
        setEnvioGratis(promo.envioGratis ?? false);

        const pList = promo.productos || [];
        const idsPila = pList.map(p => p.id);
        const catsUnicas = new Set(pList.map(p => p.category?.name || p.categoryId));
        setEsCombo(catsUnicas.size > 1 || promo.categoria === 'COMBOS');
        setProductosIds(idsPila);
        setIsModalOpen(true);
    };

    const handleViewPilaClick = (promo: Promotion) => {
        setPromoPilaDetail(promo);
        setIsPilaViewOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo.trim()) return alert('El título es obligatorio');

        const catDefinitiva = esCombo ? (categoriaPrincipal || 'COMBOS') : categoriaPrincipal;

        const bodyData = {
            titulo,
            badge,
            linkWhatsapp,
            imagenUrl,
            stock: Number(stock),
            categoria: catDefinitiva,
            desde: desde || null,
            hasta: hasta || null,
            activa,
            envioGratis,
            productosIds
        };

        try {
            const url = editingId ? `/api/promotions/${editingId}` : '/api/promotions';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData),
            });

            if (res.ok) {
                setMensajeFeedback(editingId ? '¡Promoción actualizada!' : '¡Promoción creada!');
                setIsModalOpen(false);
                resetForm();
                fetchData();
                setTimeout(() => setMensajeFeedback(''), 3000);
            } else {
                const errData = await res.json();
                alert(errData.error || 'Ocurrió un error al guardar.');
            }
        } catch (err) {
            console.error('Error en submit:', err);
            alert('Error de conexión.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
        try {
            const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Error al eliminar:', err);
        }
    };

    const productosDisponiblesParaElegir = (allProducts || []).filter(p => {
        if (!p) return false;
        const tieneStock = (p.stock ?? 0) >= 2;
        if (!tieneStock) return false;

        if (esCombo) {
            return (
                categoriaFiltroPila === 'TODAS' ||
                p.category?.name === categoriaFiltroPila ||
                String(p.categoryId) === String(categoriaFiltroPila)
            );
        }

        if (!categoriaPrincipal) return false;
        return (
            p.category?.name === categoriaPrincipal ||
            String(p.categoryId) === String(categoriaPrincipal)
        );
    });

    const productosEnPilaObjetos = (productosIds || []).map(id => (allProducts || []).find(p => p.id === id)).filter(Boolean) as Product[];

    const promosFiltradas = promotions.filter(p => {
        const t = (p.titulo || '').toLowerCase();
        const b = (p.badge || '').toLowerCase();
        const c = (p.categoria || '').toLowerCase();
        const s = searchTerm.toLowerCase();
        return t.includes(s) || b.includes(s) || c.includes(s);
    });

    const totalPaginas = Math.ceil(promosFiltradas.length / itemsPorPagina) || 1;
    const indiceInicio = (paginaActual - 1) * itemsPorPagina;
    const promosPaginadas = promosFiltradas.slice(indiceInicio, indiceInicio + itemsPorPagina);

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
                            <Tag className="w-4 h-4 text-emerald-700" />
                            Gestión de Promociones y Combos
                        </h1>
                        <p className="text-[10px] text-stone-500">
                            Administración centralizada de ofertas y vinculación de stock en pila.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {mensajeFeedback && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded text-[11px] font-bold">
                            {mensajeFeedback}
                        </div>
                    )}
                    <button
                        onClick={handleOpenCreateModal}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> Nueva Promoción
                    </button>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="bg-white p-2.5 rounded-md border border-stone-200/80 shadow-xs flex justify-between items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Buscar por título, badge o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded pl-8 pr-3 py-1 text-[11px] text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
                    />
                </div>
                <button
                    onClick={fetchData}
                    className="p-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded border border-stone-200 transition cursor-pointer text-xs flex items-center gap-1"
                    title="Recargar datos"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* TABLA TIPO CRUD */}
            <div className="bg-white border border-stone-200/80 rounded-md shadow-xs flex flex-col justify-between overflow-hidden">
                <div>
                    <div className="bg-stone-50 px-3 py-2 border-b border-stone-200/80 grid grid-cols-12 text-[10px] font-black text-stone-700 uppercase tracking-wider">
                        <span className="col-span-4">Promoción / Badge</span>
                        <span className="col-span-3">Categoría</span>
                        <span className="col-span-2 text-center">Pila de Productos</span>
                        <span className="col-span-1 text-center">Estado</span>
                        <span className="col-span-2 text-right">Acciones</span>
                    </div>

                    {loading ? (
                        <div className="w-full p-16 text-center text-xs text-stone-400 font-semibold animate-pulse">
                            Cargando promociones...
                        </div>
                    ) : promosFiltradas.length === 0 ? (
                        <div className="w-full p-16 text-center text-xs text-stone-400">
                            No se encontraron promociones registradas.
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {promosPaginadas.map((promo) => (
                                <div key={promo.id} className="px-3 py-2.5 grid grid-cols-12 items-center text-[11px] hover:bg-stone-50/80 transition">
                                    <div className="col-span-4 flex items-center gap-2.5">
                                        {promo.imagenUrl ? (
                                            <img src={promo.imagenUrl} alt="" className="w-8 h-8 rounded border border-stone-200 object-cover shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">🌿</div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-extrabold text-stone-900 truncate uppercase">{promo.titulo}</div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="bg-amber-100 text-stone-900 font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase inline-block">
                                                    {promo.badge || 'PROMO'}
                                                </span>
                                                {promo.envioGratis && (
                                                    <span className="bg-emerald-100 text-emerald-800 font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase inline-block">
                                                        🚚 Envío Gratis
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-3 text-stone-600">
                                        <span className="font-semibold uppercase block">{promo.categoria || 'General'}</span>
                                        <span className="text-[9px] text-stone-400">Stock: {promo.stock} u.</span>
                                    </div>

                                    <div className="col-span-2 text-center">
                                        <button
                                            onClick={() => handleViewPilaClick(promo)}
                                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            <Eye className="w-3 h-3 text-emerald-600" />
                                            <span>{promo.productos?.length || 0} prod.</span>
                                        </button>
                                    </div>

                                    <div className="col-span-1 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${promo.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                                            {promo.activa ? 'ACTIVA' : 'INACTIVA'}
                                        </span>
                                    </div>

                                    <div className="col-span-2 flex justify-end items-center gap-1">
                                        <button
                                            onClick={() => handleEditClick(promo)}
                                            className="p-1.5 bg-white hover:bg-stone-100 text-stone-700 rounded border border-stone-200 transition cursor-pointer"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(promo.id)}
                                            className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded border border-stone-200 transition cursor-pointer"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!loading && promosFiltradas.length > 0 && (
                    <div className="bg-stone-50 px-3 py-2 border-t border-stone-200/80 flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                        <span>Página <strong className="text-stone-800">{paginaActual}</strong> de <strong className="text-stone-800">{totalPaginas}</strong></span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                                disabled={paginaActual === 1}
                                className="p-1 rounded bg-white border border-stone-200 text-stone-700 disabled:opacity-40"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
                                disabled={paginaActual === totalPaginas}
                                className="p-1 rounded bg-white border border-stone-200 text-stone-700 disabled:opacity-40"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: ALTA / EDICIÓN */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-lg shadow-xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-stone-900 text-white px-4 py-3 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
                                <Tag className="w-4 h-4 text-emerald-400" />
                                {editingId ? `Editando Promoción #${editingId}` : 'Crear Nueva Promoción'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded p-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-700" />
                                    <div>
                                        <span className="text-[11px] font-extrabold text-emerald-900 block">Es Combo Especial (Multi-categoría)</span>
                                        <span className="text-[9px] text-emerald-700">Permite combinar artículos de diferentes categorías (ej: Pie + Maceta + Planta).</span>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={esCombo}
                                    onChange={(e) => {
                                        setEsCombo(e.target.checked);
                                        if (e.target.checked) setCategoriaPrincipal('COMBOS');
                                    }}
                                    className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div className="md:col-span-3 space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Título *</label>
                                    <input
                                        type="text"
                                        value={titulo}
                                        onChange={(e) => setTitulo(e.target.value)}
                                        placeholder="Ej: Combo Nórdico Primavera"
                                        required
                                        className="w-full bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Badge</label>
                                    <input
                                        type="text"
                                        value={badge}
                                        onChange={(e) => setBadge(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Categoría Principal *</label>
                                    <select
                                        value={categoriaPrincipal}
                                        onChange={(e) => { setCategoriaPrincipal(e.target.value); if (!esCombo) setProductosIds([]); }}
                                        required
                                        className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-1 text-xs cursor-pointer font-medium"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {esCombo && <option value="COMBOS">COMBOS Y PAQUETES</option>}
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Stock *</label>
                                    <input
                                        type="number"
                                        value={stock}
                                        onChange={(e) => setStock(Number(e.target.value))}
                                        min={0}
                                        required
                                        className="w-full bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">WhatsApp Link</label>
                                    <input
                                        type="text"
                                        value={linkWhatsapp}
                                        onChange={(e) => setLinkWhatsapp(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                <div className="md:col-span-3 space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Desde</label>
                                    <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-1 text-xs" />
                                </div>
                                <div className="md:col-span-3 space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Hasta</label>
                                    <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-1 text-xs" />
                                </div>
                                <div className="md:col-span-6 space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Imagen</label>
                                    <div className="flex gap-1">
                                        <input type="text" value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs" />
                                        <label className="bg-emerald-700 text-white px-2 py-1 rounded text-xs font-bold cursor-pointer flex items-center gap-1">
                                            <Upload className="w-3 h-3" />
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* CHECKS: ACTIVA Y ENVÍO GRATIS */}
                            <div className="flex items-center gap-6 bg-stone-50 p-2 rounded border border-stone-200">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-800 cursor-pointer">
                                    <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} className="rounded text-emerald-600 cursor-pointer" />
                                    <span>Promo Activa</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                                    <input type="checkbox" checked={envioGratis} onChange={(e) => setEnvioGratis(e.target.checked)} className="rounded text-emerald-600 cursor-pointer" />
                                    <span>🚚 Envío Gratis ("Consulta Zonas")</span>
                                </label>
                            </div>

                            {/* PILA DE PRODUCTOS */}
                            <div className="border-t border-stone-200 pt-2 space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-stone-900 uppercase flex items-center gap-1">
                                        <Package className="w-3.5 h-3.5 text-emerald-700" /> Pila de Productos Asignados
                                    </h4>
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">En pila: {productosIds.length}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2 rounded border border-stone-200">
                                    {/* DISPONIBLES */}
                                    <div className="bg-white p-1.5 rounded border border-stone-200 h-40 flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold text-stone-500 uppercase">Disponibles (Stock ≥ 2)</span>
                                            {esCombo && (
                                                <select
                                                    value={categoriaFiltroPila}
                                                    onChange={(e) => setCategoriaFiltroPila(e.target.value)}
                                                    className="text-[9px] bg-stone-100 border border-stone-300 rounded px-1 py-0.2 font-bold cursor-pointer outline-none"
                                                >
                                                    <option value="TODAS">Ver Todas</option>
                                                    {categories.map((c) => (
                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-1">
                                            {!esCombo && !categoriaPrincipal ? (
                                                <div className="text-[9px] text-stone-400 text-center py-12">Seleccioná una categoría arriba.</div>
                                            ) : productosDisponiblesParaElegir.length === 0 ? (
                                                <div className="text-[9px] text-stone-400 text-center py-12">Sin productos con stock ≥ 2.</div>
                                            ) : (
                                                productosDisponiblesParaElegir.map(p => {
                                                    const isSelected = productosIds.includes(p.id);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => !isSelected && setProductosIds([...productosIds, p.id])}
                                                            className={`p-1 rounded text-[9px] flex justify-between items-center transition ${isSelected ? 'bg-stone-100 text-stone-400 opacity-40 cursor-not-allowed' : 'bg-stone-50 hover:bg-emerald-50 border border-stone-200 cursor-pointer'}`}
                                                        >
                                                            <span className="truncate pr-1">{p.name} <strong className="text-stone-400 font-normal">({p.category?.name || 'S/C'})</strong></span>
                                                            <span className="font-bold text-emerald-700 shrink-0">+ Agregar</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* EN LA PILA */}
                                    <div className="bg-white p-1.5 rounded border border-stone-200 h-40 flex flex-col">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-bold text-emerald-700 uppercase">En la Pila</span>
                                            {productosIds.length > 0 && (
                                                <button type="button" onClick={() => setProductosIds([])} className="text-[8px] text-rose-600 font-bold hover:underline cursor-pointer">Limpiar ✕</button>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1">
                                            {productosEnPilaObjetos.length === 0 ? (
                                                <div className="text-[9px] text-stone-400 text-center py-12">Pila vacía. Usá "+ Agregar".</div>
                                            ) : (
                                                productosEnPilaObjetos.map(p => p && (
                                                    <div key={p.id} className="p-1 rounded text-[9px] bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                                                        <button type="button" onClick={() => setProductosIds(productosIds.filter(id => id !== p.id))} className="text-rose-600 font-bold text-[9px] px-1 hover:bg-rose-100 rounded">✕ Quitar</button>
                                                        <span className="truncate font-semibold text-stone-900 text-right">{p.name}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER MODAL */}
                            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded text-xs font-bold text-stone-600 hover:bg-stone-100">Cancelar</button>
                                <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer">
                                    <Check className="w-4 h-4" /> Guardar Promoción
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: INSPECCIÓN FLOTANTE DE LA PILA */}
            {isPilaViewOpen && promoPilaDetail && (
                <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3">
                    <div className="bg-white rounded-lg shadow-xl border border-stone-200 w-full max-w-md overflow-hidden">
                        <div className="bg-stone-900 text-white px-4 py-3 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
                                <Package className="w-4 h-4 text-emerald-400" />
                                Productos en Pila: {promoPilaDetail.titulo}
                            </h3>
                            <button onClick={() => setIsPilaViewOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                            {!promoPilaDetail.productos || promoPilaDetail.productos.length === 0 ? (
                                <div className="text-center py-8 text-xs text-stone-400">Esta promoción no tiene productos vinculados en pila.</div>
                            ) : (
                                promoPilaDetail.productos.map(prod => (
                                    <div key={prod.id} className="p-2 rounded bg-stone-50 border border-stone-200 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-bold text-stone-800 block">{prod.name}</span>
                                            <span className="text-[9px] text-stone-400 uppercase">{prod.category?.name || 'S/C'}</span>
                                        </div>
                                        <span className="text-stone-600 font-mono font-bold">${prod.price}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="bg-stone-50 p-3 border-t border-stone-200 flex justify-end">
                            <button onClick={() => setIsPilaViewOpen(false)} className="bg-stone-900 text-white px-3 py-1 rounded text-xs font-bold uppercase cursor-pointer">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}