'use client';

import { useState, useEffect } from 'react';
import { Tag, Trash2, Edit2, ArrowRight, ArrowLeft, Check, Package, X, RefreshCw } from 'lucide-react';

interface Category {
    id: number | string;
    name: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
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
}

export default function AdminPromocionesPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('Iniciando...');

    // Estado del Formulario
    const [editingId, setEditingId] = useState<number | null>(null);
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [badge, setBadge] = useState('15% OFF');
    const [linkWhatsapp, setLinkWhatsapp] = useState('https://wa.me/541140782378');
    const [imagenUrl, setImagenUrl] = useState('');
    const [stock, setStock] = useState<number>(10);
    const [categoriaPrincipal, setCategoriaPrincipal] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [activa, setActiva] = useState(true);

    // Pila de productos
    const [productosIds, setProductosIds] = useState<number[]>([]);
    const [searchTermPromo, setSearchTermPromo] = useState('');
    const [mensajeFeedback, setMensajeFeedback] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setDebugInfo('Consultando APIs...');

            const [resPromos, resProds] = await Promise.all([
                fetch('/api/promotions').catch(() => null),
                fetch('/api/products').catch(() => null)
            ]);

            let loadedPromos: Promotion[] = [];
            let loadedProds: Product[] = [];

            if (resPromos && resPromos.ok) {
                const dataPromos = await resPromos.json();
                if (Array.isArray(dataPromos)) loadedPromos = dataPromos;
            }

            if (resProds && resProds.ok) {
                const dataProds = await resProds.json();
                if (Array.isArray(dataProds)) loadedProds = dataProds;
            }

            setPromotions(loadedPromos);
            setAllProducts(loadedProds);

            // Extraer categorías únicas de forma segura
            const extractedMap = new Map<any, Category>();
            loadedProds.forEach((p) => {
                if (p && p.category && (p.category.id !== undefined || p.category.name)) {
                    const catId = p.category.id || p.category.name;
                    extractedMap.set(catId, {
                        id: catId,
                        name: p.category.name || String(catId)
                    });
                }
            });

            const cats = Array.from(extractedMap.values());
            setCategories(cats);
            setDebugInfo(`OK: ${loadedProds.length} productos, ${cats.length} categorías, ${loadedPromos.length} promos.`);
        } catch (err) {
            console.error('Error al cargar:', err);
            setDebugInfo('Error al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProductToStack = (id: number) => {
        if (!productosIds.includes(id)) {
            setProductosIds([...productosIds, id]);
        }
    };

    const handleRemoveProductFromStack = (id: number) => {
        setProductosIds(productosIds.filter((prodId) => prodId !== id));
    };

    const handleAddAllFiltered = () => {
        const idsFiltrados = productosDisponiblesParaElegir.map(p => p.id);
        setProductosIds(Array.from(new Set([...productosIds, ...idsFiltrados])));
    };

    const handleClearStack = () => setProductosIds([]);

    const resetForm = () => {
        setEditingId(null);
        setTitulo('');
        setDescripcion('');
        setBadge('15% OFF');
        setStock(10);
        setCategoriaPrincipal('');
        setImagenUrl('');
        setDesde('');
        setHasta('');
        setActiva(true);
        setProductosIds([]);
        setMensajeFeedback('');
    };

    const handleEditClick = (promo: Promotion) => {
        setEditingId(promo.id);
        setTitulo(promo.titulo || '');
        setDescripcion(promo.descripcion || '');
        setBadge(promo.badge || '');
        setStock(promo.stock ?? 10);
        setCategoriaPrincipal(promo.categoria || '');
        setImagenUrl(promo.imagenUrl || '');
        setLinkWhatsapp(promo.linkWhatsapp || 'https://wa.me/541140782378');
        setDesde(promo.desde ? promo.desde.slice(0, 10) : '');
        setHasta(promo.hasta ? promo.hasta.slice(0, 10) : '');
        setActiva(promo.activa ?? true);
        setProductosIds(promo.productos ? promo.productos.map(p => p.id) : []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo.trim()) {
            alert('El título es obligatorio');
            return;
        }

        const bodyData = {
            titulo,
            descripcion,
            badge,
            linkWhatsapp,
            imagenUrl,
            stock: Number(stock),
            categoria: categoriaPrincipal,
            desde: desde || null,
            hasta: hasta || null,
            activa,
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
                resetForm();
                fetchData();
                setTimeout(() => setMensajeFeedback(''), 3000);
            } else {
                const errData = await res.json();
                alert(errData.error || 'Ocurrió un error al guardar.');
            }
        } catch (err) {
            console.error('Error en submit:', err);
            alert('Error de conexión con el servidor.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
        try {
            const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
            else alert('No se pudo eliminar la promoción.');
        } catch (err) {
            console.error('Error al eliminar:', err);
        }
    };

    const productosDisponiblesParaElegir = (allProducts || []).filter(p => {
        if (!categoriaPrincipal || !p) return false;
        return (
            p.category?.name === categoriaPrincipal ||
            String(p.categoryId) === String(categoriaPrincipal) ||
            String(p.category?.id) === String(categoriaPrincipal)
        );
    });

    const productosEnPilaObjetos = (productosIds || []).map(id => (allProducts || []).find(p => p.id === id)).filter(Boolean) as Product[];

    const promosFiltradas = (promotions || []).filter(p => {
        if (!p) return false;
        const t = (p.titulo || '').toLowerCase();
        const b = (p.badge || '').toLowerCase();
        const search = (searchTermPromo || '').toLowerCase();
        return t.includes(search) || b.includes(search);
    });

    return (
        <div className="min-h-screen bg-stone-100 p-2 md:p-3 font-sans text-stone-800">
            <div className="max-w-[1500px] mx-auto space-y-2.5">

                {/* BARRA DE ESTADO / DEBUG VISIBLE */}
                <div className="bg-stone-900 text-stone-200 px-3 py-1.5 rounded-lg text-xs flex justify-between items-center shadow-sm">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <strong>Estado:</strong> {debugInfo}
                    </span>
                    <button
                        onClick={fetchData}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-0.5 rounded text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                        <RefreshCw className="w-3 h-3" /> Recargar
                    </button>
                </div>

                {/* ENCABEZADO */}
                <div className="bg-white rounded-lg p-2.5 shadow-xs border border-stone-200 flex justify-between items-center">
                    <h1 className="text-xs font-black text-stone-900 uppercase tracking-tight flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        Gestión de Promociones y Pila de Productos
                    </h1>
                    {mensajeFeedback && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            {mensajeFeedback}
                        </div>
                    )}
                </div>

                {/* ESTRUCTURA DE DOS COLUMNAS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

                    {/* COLUMNA IZQUIERDA: FORMULARIO Y PILA (7 cols) */}
                    <div className="lg:col-span-7 bg-white rounded-lg p-3 shadow-xs border border-stone-200 space-y-2">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                            <h2 className="text-[11px] font-black text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${editingId ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                {editingId ? `Editando Promo #${editingId}` : 'Crear Nueva Promoción'}
                            </h2>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Cancelar
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-2">
                            {/* Título y Badge */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div className="md:col-span-3 space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Título *</label>
                                    <input
                                        type="text"
                                        value={titulo}
                                        onChange={(e) => setTitulo(e.target.value)}
                                        placeholder="Ej: Combo Primavera"
                                        required
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-2 py-1 text-xs text-stone-800"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Badge</label>
                                    <input
                                        type="text"
                                        value={badge}
                                        onChange={(e) => setBadge(e.target.value)}
                                        placeholder="15% OFF"
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-2 py-1 text-xs text-stone-800"
                                    />
                                </div>
                            </div>

                            {/* Categoría, Stock, Link */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">
                                        Categoría * ({categories.length} disp.)
                                    </label>
                                    <select
                                        value={categoriaPrincipal}
                                        onChange={(e) => {
                                            setCategoriaPrincipal(e.target.value);
                                            setProductosIds([]);
                                        }}
                                        required
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-1.5 py-1 text-xs text-stone-800 cursor-pointer font-medium"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {(categories || []).map((cat) => (
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
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-2 py-1 text-xs text-stone-800"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">WhatsApp Link</label>
                                    <input
                                        type="text"
                                        value={linkWhatsapp}
                                        onChange={(e) => setLinkWhatsapp(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-2 py-1 text-xs text-stone-800"
                                    />
                                </div>
                            </div>

                            {/* Fechas, Imagen y Activa */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Desde</label>
                                    <input
                                        type="date"
                                        value={desde}
                                        onChange={(e) => setDesde(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-1.5 py-1 text-xs text-stone-800"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Hasta</label>
                                    <input
                                        type="date"
                                        value={hasta}
                                        onChange={(e) => setHasta(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-1.5 py-1 text-xs text-stone-800"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[9px] font-bold text-stone-700 uppercase">Imagen URL</label>
                                    <input
                                        type="text"
                                        value={imagenUrl}
                                        onChange={(e) => setImagenUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-stone-50 border border-stone-300 rounded-md px-2 py-1 text-xs text-stone-800"
                                    />
                                </div>
                                <div className="space-y-0.5 flex flex-col justify-end">
                                    <label className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-md px-2 py-1 text-[11px] font-bold text-stone-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={activa}
                                            onChange={(e) => setActiva(e.target.checked)}
                                            className="rounded text-emerald-600"
                                        />
                                        Activa
                                    </label>
                                </div>
                            </div>

                            {/* SELECTOR DUAL DE PILA (Comprimido a h-32) */}
                            <div className="border-t border-stone-200 pt-2 space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-black text-stone-900 uppercase flex items-center gap-1">
                                        <Package className="w-3 h-3 text-emerald-600" />
                                        Pila de Productos Vinculados
                                    </h3>
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                                        En pila: {productosIds.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-stone-50 p-2 rounded-lg border border-stone-200">

                                    {/* Disponibles */}
                                    <div className="bg-white rounded-md border border-stone-200 p-1.5 flex flex-col h-32">
                                        <div className="font-bold text-[9px] text-stone-700 uppercase mb-1 flex justify-between items-center">
                                            <span className="truncate">Disponibles ({categoriaPrincipal || 'Elija Cat.'})</span>
                                            {categoriaPrincipal && productosDisponiblesParaElegir.length > 0 && (
                                                <button type="button" onClick={handleAddAllFiltered} className="text-[9px] text-emerald-700 hover:underline cursor-pointer font-bold shrink-0">Todos ➔</button>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 border-t border-stone-100 pt-1">
                                            {!categoriaPrincipal ? (
                                                <div className="text-center text-stone-400 text-[9px] py-8 font-medium">Seleccioná una categoría arriba.</div>
                                            ) : productosDisponiblesParaElegir.length === 0 ? (
                                                <div className="text-center text-stone-400 text-[9px] py-8 font-medium">Sin productos en categoría.</div>
                                            ) : (
                                                productosDisponiblesParaElegir.map(prod => {
                                                    const isSelected = productosIds.includes(prod.id);
                                                    return (
                                                        <div
                                                            key={prod.id}
                                                            onClick={() => !isSelected && handleAddProductToStack(prod.id)}
                                                            className={`p-1 rounded text-[9px] flex items-center justify-between transition ${isSelected ? 'bg-stone-100 text-stone-400 opacity-40 cursor-not-allowed' : 'bg-white hover:bg-emerald-50 border border-stone-200 cursor-pointer'}`}
                                                        >
                                                            <span className="truncate pr-1 font-medium text-stone-800">{prod.name}</span>
                                                            <button type="button" disabled={isSelected} className="bg-emerald-600 hover:bg-emerald-700 text-white px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5 font-bold text-[8px]">
                                                                Agregar <ArrowRight className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Pila Asignada */}
                                    <div className="bg-white rounded-md border border-stone-200 p-1.5 flex flex-col h-32">
                                        <div className="font-bold text-[9px] text-emerald-700 uppercase mb-1 flex justify-between items-center">
                                            <span>Pila Asignada</span>
                                            {productosIds.length > 0 && (
                                                <button type="button" onClick={handleClearStack} className="text-[9px] text-rose-600 hover:underline cursor-pointer font-bold">Limpiar ✕</button>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 border-t border-stone-100 pt-1">
                                            {productosEnPilaObjetos.length === 0 ? (
                                                <div className="text-center text-stone-400 text-[9px] py-8 font-medium">Pila vacía. Usá "Agregar ➔".</div>
                                            ) : (
                                                productosEnPilaObjetos.map(prod => prod && (
                                                    <div key={prod.id} className="p-1 rounded text-[9px] flex items-center justify-between bg-emerald-50 border border-emerald-200">
                                                        <button type="button" onClick={() => handleRemoveProductFromStack(prod.id)} className="bg-rose-500 hover:bg-rose-600 text-white px-1.5 py-0.5 rounded shrink-0 mr-1 font-bold text-[8px]">
                                                            <ArrowLeft className="w-2.5 h-2.5" /> Quitar
                                                        </button>
                                                        <span className="truncate flex-1 font-semibold text-stone-900 text-right">{prod.name}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* BOTÓN SUBMIT */}
                            <div className="pt-0.5">
                                <button
                                    type="submit"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-md text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    {editingId ? 'Actualizar Promoción' : 'Crear Promoción con Pila'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* COLUMNA DERECHA: LISTADO DE PROMOCIONES (5 cols) */}
                    <div className="lg:col-span-5 bg-white rounded-lg p-3 shadow-xs border border-stone-200 space-y-2">
                        <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                            <h2 className="text-[11px] font-black text-stone-900 uppercase tracking-wide">
                                Listado ({promotions.length})
                            </h2>
                            <div className="w-36">
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTermPromo}
                                    onChange={(e) => setSearchTermPromo(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded-md px-2 py-0.5 text-[10px]"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-xs text-stone-400">Cargando datos...</div>
                        ) : promosFiltradas.length === 0 ? (
                            <div className="text-center py-8 bg-stone-50 rounded-md border border-dashed border-stone-300 text-stone-400 text-xs">
                                No hay promociones registradas.
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                                {promosFiltradas.map((promo) => (
                                    <div key={promo.id} className="bg-stone-50 hover:bg-white border border-stone-200 rounded-md p-2 transition space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                {promo.imagenUrl ? (
                                                    <img src={promo.imagenUrl} alt="" className="w-7 h-7 rounded object-cover border border-stone-200" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-[10px]">🌿</div>
                                                )}
                                                <div>
                                                    <h4 className="font-extrabold text-stone-900 text-[11px]">{promo.titulo}</h4>
                                                    <span className="bg-amber-100 text-stone-900 font-black text-[8px] px-1 py-0.2 rounded-full uppercase">
                                                        {promo.badge || 'PROMO'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${promo.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                                                {promo.activa ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] text-stone-500 pt-1 border-t border-stone-200/60">
                                            <span>Stock: <strong>{promo.stock}</strong></span>
                                            <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                                📦 {promo.productos?.length || 0} prod.
                                            </span>
                                            <div className="space-x-1">
                                                <button
                                                    onClick={() => handleEditClick(promo)}
                                                    className="p-1 bg-white hover:bg-emerald-100 text-stone-700 hover:text-emerald-700 rounded border border-stone-200 transition cursor-pointer inline-block"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(promo.id)}
                                                    className="p-1 bg-white hover:bg-rose-100 text-rose-600 rounded border border-stone-200 transition cursor-pointer inline-block"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}