'use client';

import { useState, useEffect, useRef } from 'react';
import {
    getCategories,
    createCategory,
    getSuppliers,
    createSupplier,
    getProducts,
    generateNextProductCode,
    saveProduct,
    deleteProduct
} from '../actions/product-actions';

interface Category {
    id: string;
    name: string;
    defaultMargin: number;
}

interface Supplier {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    notes?: string | null;
}

interface Product {
    id: string;
    code: string;
    name: string;
    categoryId: string;
    category?: Category;
    supplierId?: string | null;
    supplier?: Supplier | null;
    cost: number;
    otherCosts: number;
    price: number;
    margin: number;
    taxRate: number;
    trackStock: boolean;
    stock: number;
    minStock: number;
}

export default function ProductosPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // --- CATEGORÍA ---
    const [categorySearch, setCategorySearch] = useState('');
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [showInlineCatForm, setShowInlineCatForm] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatMargin, setNewCatMargin] = useState<number | ''>(100);

    // --- PROVEEDOR ---
    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupDropdown, setShowSupDropdown] = useState(false);
    const [showInlineSupForm, setShowInlineSupForm] = useState(false);
    const [newSupName, setNewSupName] = useState('');
    const [newSupAddress, setNewSupAddress] = useState('');
    const [newSupPhone, setNewSupPhone] = useState('');
    const [newSupNotes, setNewSupNotes] = useState('');

    // --- PRODUCTO ---
    const [id, setId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [cost, setCost] = useState<number | ''>('');
    const [otherCosts, setOtherCosts] = useState<number | ''>('');
    const [margin, setMargin] = useState<number | ''>(100);
    const [priceNoTax, setPriceNoTax] = useState<number>(0);
    const [priceFinal, setPriceFinal] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(21);

    // --- INVENTARIO ---
    const [trackStock, setTrackStock] = useState<boolean>(true);
    const [stock, setStock] = useState<number | ''>(0);
    const [minStock, setMinStock] = useState<number | ''>(2);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const catRef = useRef<HTMLDivElement>(null);
    const supRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();

        const handleClickOutside = (e: MouseEvent) => {
            if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDropdown(false);
            if (supRef.current && !supRef.current.contains(e.target as Node)) setShowSupDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, sups, prods] = await Promise.all([getCategories(), getSuppliers(), getProducts()]);
            setCategories(cats as Category[]);
            setSuppliers(sups as Supplier[]);
            setProducts(prods as Product[]);
        } catch {
            setMessage({ type: 'error', text: 'Error al cargar los datos.' });
        } finally {
            setLoading(false);
        }
    };

    const computePrices = (cCost: number, cOther: number, cMargin: number, cTax: number) => {
        const totalBaseCost = (cCost || 0) + (cOther || 0);
        if (totalBaseCost <= 0) {
            setPriceNoTax(0);
            setPriceFinal(0);
            return;
        }

        const marginVal = cMargin ?? 100;
        let subtotalNoTax = 0;

        if (marginVal >= 100) {
            subtotalNoTax = totalBaseCost * (1 + marginVal / 100);
        } else {
            const marginDecimal = marginVal / 100;
            subtotalNoTax = totalBaseCost / (1 - marginDecimal);
        }

        const finalWithTax = subtotalNoTax * (1 + (cTax || 0) / 100);

        setPriceNoTax(Math.round(subtotalNoTax));
        setPriceFinal(Math.round(finalWithTax));
    };

    const normalizeText = (text: string) =>
        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

    // Handlers Selección
    const handleSelectCategory = async (cat: Category) => {
        setCategoryId(cat.id);
        setCategorySearch(cat.name);
        setShowCatDropdown(false);
        setShowInlineCatForm(false);

        const selMargin = cat.defaultMargin ?? 100;
        setMargin(selMargin);
        computePrices(Number(cost), Number(otherCosts), selMargin, taxRate);

        if (!id) {
            const nextCode = await generateNextProductCode(cat.id);
            setCode(nextCode);
        }
    };

    const handleSelectSupplier = (sup: Supplier) => {
        setSupplierId(sup.id);
        setSupplierSearch(sup.name);
        setShowSupDropdown(false);
        setShowInlineSupForm(false);
    };

    // Crear Categoría Inline
    const handleCreateCategoryInline = async () => {
        if (!newCatName.trim()) return;
        const upper = newCatName.trim().toUpperCase();

        const existing = categories.find(c => normalizeText(c.name) === normalizeText(upper));
        if (existing) {
            handleSelectCategory(existing);
            return;
        }

        const res = await createCategory(upper, Number(newCatMargin) || 100);
        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else if (res.category) {
            setMessage({ type: 'success', text: `Categoría "${res.category.name}" creada.` });
            const updated = await getCategories();
            setCategories(updated as Category[]);
            handleSelectCategory(res.category as Category);
            setNewCatName('');
            setShowInlineCatForm(false);
        }
    };

    // Crear Proveedor Inline
    const handleCreateSupplierInline = async () => {
        if (!newSupName.trim()) return;
        const upper = newSupName.trim().toUpperCase();

        const existing = suppliers.find(s => normalizeText(s.name) === normalizeText(upper));
        if (existing) {
            handleSelectSupplier(existing);
            return;
        }

        const res = await createSupplier({
            name: upper,
            address: newSupAddress,
            phone: newSupPhone,
            notes: newSupNotes,
        });

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else if (res.supplier) {
            setMessage({ type: 'success', text: `Proveedor "${res.supplier.name}" creado.` });
            const updated = await getSuppliers();
            setSuppliers(updated as Supplier[]);
            handleSelectSupplier(res.supplier as Supplier);
            setNewSupName('');
            setNewSupAddress('');
            setNewSupPhone('');
            setNewSupNotes('');
            setShowInlineSupForm(false);
        }
    };

    const handleEdit = (p: Product) => {
        setId(p.id);
        setCode(p.code);
        setName(p.name);
        setCategoryId(p.categoryId);
        setCategorySearch(p.category?.name || '');
        setSupplierId(p.supplierId || '');
        setSupplierSearch(p.supplier?.name || '');
        setCost(p.cost);
        setOtherCosts(p.otherCosts || '');
        setMargin(p.margin ?? 100);
        setTaxRate(p.taxRate ?? 21);
        setTrackStock(p.trackStock ?? true);
        setStock(p.stock);
        setMinStock(p.minStock ?? 2);

        computePrices(p.cost, p.otherCosts || 0, p.margin ?? 100, p.taxRate ?? 21);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (productId: string) => {
        if (confirm('¿Confirmás eliminar este producto?')) {
            const res = await deleteProduct(productId);
            if (res.error) {
                setMessage({ type: 'error', text: res.error });
            } else {
                setMessage({ type: 'success', text: 'Producto eliminado.' });
                loadData();
            }
        }
    };

    const resetForm = () => {
        setId(null);
        setCode('');
        setName('');
        setCategoryId('');
        setCategorySearch('');
        setSupplierId('');
        setSupplierSearch('');
        setCost('');
        setOtherCosts('');
        setMargin(100);
        setPriceNoTax(0);
        setPriceFinal(0);
        setTaxRate(21);
        setTrackStock(true);
        setStock(0);
        setMinStock(2);
        setShowInlineCatForm(false);
        setShowInlineSupForm(false);
    };

    const filteredCats = categories.filter(c => normalizeText(c.name).includes(normalizeText(categorySearch)));
    const filteredSups = suppliers.filter(s => normalizeText(s.name).includes(normalizeText(supplierSearch)));

    return (
        <div className="min-h-screen bg-slate-50 p-6 space-y-8 max-w-7xl mx-auto">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Catálogo de Productos</h1>
                    <p className="text-sm text-slate-500">Gestión de costos, proveedores e inventario inteligente.</p>
                </div>
                <div className="mt-4 md:mt-0">
                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                        {products.length} Productos Registrados
                    </span>
                </div>
            </div>

            {/* MENSAJES */}
            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* FORMULARIO DE PRODUCTO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    {id ? '✏️ Editar Producto' : '🌱 Nuevo Producto'}
                </h2>

                <form action={async (formData) => {
                    const res = await saveProduct(formData);
                    if (res.error) {
                        setMessage({ type: 'error', text: res.error });
                    } else {
                        setMessage({ type: 'success', text: 'Producto guardado exitosamente.' });
                        resetForm();
                        loadData();
                    }
                }} className="space-y-6">
                    <input type="hidden" name="id" value={id || ''} />
                    <input type="hidden" name="categoryId" value={categoryId} />
                    <input type="hidden" name="supplierId" value={supplierId} />
                    <input type="hidden" name="price" value={priceFinal} />
                    <input type="hidden" name="trackStock" value={trackStock ? 'true' : 'false'} />

                    {/* SECCIÓN 1: DATOS GENERALES */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                        {/* CATEGORÍA PREDICTIVA */}
                        <div className="md:col-span-1 relative" ref={catRef}>
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                Categoría <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Buscar categoría..."
                                value={categorySearch}
                                onFocus={() => setShowCatDropdown(true)}
                                onChange={(e) => {
                                    setCategorySearch(e.target.value.toUpperCase());
                                    setShowCatDropdown(true);
                                    if (categoryId) setCategoryId('');
                                }}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 uppercase font-medium"
                            />
                            {showCatDropdown && (
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                                    {filteredCats.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => handleSelectCategory(cat)}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 flex justify-between items-center"
                                        >
                                            <span className="font-semibold text-slate-700">{cat.name}</span>
                                            <span className="text-xs text-slate-400">{cat.defaultMargin}%</span>
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => { setNewCatName(categorySearch); setShowInlineCatForm(true); setShowCatDropdown(false); }}
                                        className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                    >
                                        ➕ Crear categoría: "{categorySearch || '...'}"
                                    </button>
                                </div>
                            )}

                            {showInlineCatForm && (
                                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                                    <span className="text-xs font-bold text-emerald-900 block">NUEVA CATEGORÍA</span>
                                    <input
                                        type="text"
                                        placeholder="NOMBRE"
                                        value={newCatName}
                                        onChange={(e) => setNewCatName(e.target.value.toUpperCase())}
                                        className="w-full border border-emerald-300 rounded-lg px-2 py-1 text-xs uppercase"
                                    />
                                    <input
                                        type="number"
                                        placeholder="MARGEN DEF. (%)"
                                        value={newCatMargin}
                                        onChange={(e) => setNewCatMargin(parseFloat(e.target.value) || '')}
                                        className="w-full border border-emerald-300 rounded-lg px-2 py-1 text-xs"
                                    />
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button type="button" onClick={() => setShowInlineCatForm(false)} className="px-2 py-1 bg-white text-xs border rounded-md">Cancelar</button>
                                        <button type="button" onClick={handleCreateCategoryInline} className="px-2 py-1 bg-emerald-700 text-white text-xs rounded-md font-medium">Guardar</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PROVEEDOR PREDICTIVO */}
                        <div className="md:col-span-1 relative" ref={supRef}>
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                Proveedor
                            </label>
                            <input
                                type="text"
                                placeholder="Buscar proveedor..."
                                value={supplierSearch}
                                onFocus={() => setShowSupDropdown(true)}
                                onChange={(e) => {
                                    setSupplierSearch(e.target.value.toUpperCase());
                                    setShowSupDropdown(true);
                                    if (supplierId) setSupplierId('');
                                }}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 uppercase font-medium"
                            />
                            {showSupDropdown && (
                                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                                    {filteredSups.map((sup) => (
                                        <button
                                            key={sup.id}
                                            type="button"
                                            onClick={() => handleSelectSupplier(sup)}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 flex justify-between items-center"
                                        >
                                            <span className="font-semibold text-slate-700">{sup.name}</span>
                                            {sup.phone && <span className="text-xs text-slate-400">📱 {sup.phone}</span>}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => { setNewSupName(supplierSearch); setShowInlineSupForm(true); setShowSupDropdown(false); }}
                                        className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                    >
                                        ➕ Crear proveedor: "{supplierSearch || '...'}"
                                    </button>
                                </div>
                            )}

                            {showInlineSupForm && (
                                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                                    <span className="text-xs font-bold text-emerald-900 block">NUEVO PROVEEDOR</span>
                                    <input
                                        type="text"
                                        placeholder="NOMBRE OBLIGATORIO"
                                        value={newSupName}
                                        onChange={(e) => setNewSupName(e.target.value.toUpperCase())}
                                        className="w-full border border-emerald-300 rounded-lg px-2 py-1 text-xs uppercase"
                                    />
                                    <input
                                        type="text"
                                        placeholder="DIRECCIÓN / LINK GOOGLE MAPS"
                                        value={newSupAddress}
                                        onChange={(e) => setNewSupAddress(e.target.value)}
                                        className="w-full border border-emerald-300 rounded-lg px-2 py-1 text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="CELULAR / TELÉFONO"
                                        value={newSupPhone}
                                        onChange={(e) => setNewSupPhone(e.target.value)}
                                        className="w-full border border-emerald-300 rounded-lg px-2 py-1 text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="NOTAS / OBSERVACIONES"
                                        value={newSupNotes}
                                        onChange={(e) => setNewSupNotes(e.target.value)}
                                        className="w-full border border-emerald-300 rounded-lg px-2 py-1 text-xs"
                                    />
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button type="button" onClick={() => setShowInlineSupForm(false)} className="px-2 py-1 bg-white text-xs border rounded-md">Cancelar</button>
                                        <button type="button" onClick={handleCreateSupplierInline} className="px-2 py-1 bg-emerald-700 text-white text-xs rounded-md font-medium">Guardar</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CÓDIGO */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                Código (Auto)
                            </label>
                            <input
                                type="text"
                                name="code"
                                readOnly
                                value={code}
                                placeholder="Auto-generado..."
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-100 font-mono font-bold"
                            />
                        </div>

                        {/* NOMBRE PRODUCTO */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                Nombre del Producto <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value.toUpperCase())}
                                placeholder="EJ: FICUS LYRATA 10L"
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm uppercase font-semibold text-slate-800"
                            />
                        </div>

                        {/* COSTOS Y PRECIOS */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Costo Compra ($)</label>
                            <input type="number" name="cost" required value={cost} onChange={(e) => { setCost(Math.round(parseFloat(e.target.value) || 0)); computePrices(Math.round(parseFloat(e.target.value) || 0), Number(otherCosts), Number(margin), taxRate); }} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Otros Costos / Flete ($)</label>
                            <input type="number" name="otherCosts" value={otherCosts} onChange={(e) => { setOtherCosts(Math.round(parseFloat(e.target.value) || 0)); computePrices(Number(cost), Math.round(parseFloat(e.target.value) || 0), Number(margin), taxRate); }} placeholder="0" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Margen (%)</label>
                            <input type="number" name="margin" step="0.1" value={margin} onChange={(e) => { setMargin(parseFloat(e.target.value) || 0); computePrices(Number(cost), Number(otherCosts), parseFloat(e.target.value) || 0, taxRate); }} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">IVA (%)</label>
                            <select name="taxRate" value={taxRate} onChange={(e) => { setTaxRate(parseFloat(e.target.value)); computePrices(Number(cost), Number(otherCosts), Number(margin), parseFloat(e.target.value)); }} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                                <option value={0}>0%</option>
                                <option value={10.5}>10.5%</option>
                                <option value={21}>21%</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Precio Sin IVA ($)</label>
                            <input type="text" readOnly value={priceNoTax ? `$${priceNoTax.toLocaleString('es-AR')}` : '$0'} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-100 text-slate-600 font-semibold cursor-not-allowed" />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-emerald-800 mb-1 uppercase tracking-wider">Precio Venta Final ($)</label>
                            <input type="text" readOnly value={priceFinal ? `$${priceFinal.toLocaleString('es-AR')}` : '$0'} className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-sm font-extrabold text-emerald-900 bg-emerald-50 cursor-not-allowed" />
                        </div>
                    </div>

                    {/* SECCIÓN 2: INVENTARIO Y ALERTAS */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Gestión de Existencias
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 items-end">

                            {/* CANTIDAD INICIAL / STOCK ACTUAL (SIEMPRE VISIBLE) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
                                    {id ? 'Stock Actual' : 'Cant. Inicial'} <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="stock"
                                    required
                                    value={stock}
                                    onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white font-bold text-slate-800"
                                />
                            </div>

                            {/* CHECKBOX ACTIVAR ALERTAS DE STOCK MÍNIMO */}
                            <div className="flex items-center gap-2 pb-2">
                                <input
                                    type="checkbox"
                                    id="trackStock"
                                    checked={trackStock}
                                    onChange={(e) => setTrackStock(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="trackStock" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                    Activar alertas de stock bajo
                                </label>
                            </div>

                            {/* CANT. ADVERTENCIA / STOCK MÍNIMO (CONDICIONAL) */}
                            <div>
                                {trackStock ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wider">
                                            Cant. Advertencia (Stock Mínimo)
                                        </label>
                                        <input
                                            type="number"
                                            name="minStock"
                                            value={minStock}
                                            onChange={(e) => setMinStock(parseInt(e.target.value, 10) || 0)}
                                            className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm bg-white font-semibold text-amber-900"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic pb-2">
                                        Alertas desactivadas para este producto.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BOTONES ACCIÓN */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-sm transition-colors"
                        >
                            {id ? 'Actualizar Producto' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>

            {/* TABLA DE PRODUCTOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Listado de Productos</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Cargando catálogo...</div>
                ) : products.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No hay productos registrados aún.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3">Proveedor</th>
                                    <th className="px-4 py-3 text-right">Costo Base</th>
                                    <th className="px-4 py-3 text-right">Margen</th>
                                    <th className="px-4 py-3 text-right">Precio Final</th>
                                    <th className="px-4 py-3 text-center">Stock / Alerta</th>
                                    <th className="px-4 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {products.map((p) => {
                                    const isLowStock = p.trackStock && p.stock <= p.minStock;
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{p.code}</td>
                                            <td className="px-4 py-3 font-bold text-slate-800 uppercase">{p.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase">
                                                    {p.category?.name || 'SIN CAT.'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                                                {p.supplier ? (
                                                    <div className="flex items-center gap-1">
                                                        <span>{p.supplier.name}</span>
                                                        {p.supplier.address && (
                                                            <a href={p.supplier.address.startsWith('http') ? p.supplier.address : `https://maps.google.com/?q=${encodeURIComponent(p.supplier.address)}`} target="_blank" rel="noreferrer" title="Ver en Google Maps" className="text-emerald-600 hover:underline">
                                                                📍
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">${p.cost.toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-600">{p.margin ?? 100}%</td>
                                            <td className="px-4 py-3 text-right font-extrabold text-emerald-800">${p.price.toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-3 text-center">
                                                {p.trackStock ? (
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${isLowStock ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                        {isLowStock && <span>⚠️</span>}
                                                        {p.stock} u. (Mín: {p.minStock})
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        {p.stock} u.
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEdit(p)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs">
                                                        Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(p.id)} className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs">
                                                        Borrar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}