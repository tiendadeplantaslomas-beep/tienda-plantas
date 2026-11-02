'use client';

// src/app/(admin)/productos/page.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Category, Supplier } from '@/types/product';
import ModalListadoProductos from '@/components/ModalListadoProductos';
import { useRouter } from 'next/navigation';

import {
    getCategories,
    createCategory,
    updateCategory,
    getSuppliers,
    createSupplier,
    getProducts,
    generateNextProductCode,
    saveProduct,
    deleteProduct,
    importProductsBatch,
    adjustStock
} from '@/actions/product-actions';

function SupplierInlineForm({
    initialName = '',
    onClose,
    onSuccess
}: {
    initialName?: string;
    onClose: () => void;
    onSuccess: (supplier: Supplier) => void;
}) {
    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) {
            setError('El nombre del proveedor es obligatorio.');
            return;
        }

        try {
            const res = await createSupplier({ name: cleanName, phone });
            if (res.error) {
                setError(res.error);
            } else if (res.supplier) {
                onSuccess(res.supplier as Supplier);
            }
        } catch {
            setError('Error al guardar el proveedor.');
        }
    };

    return (
        <div className="absolute top-7 left-0 w-80 z-50 bg-emerald-50 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 space-y-2 shadow-xl animate-in fade-in">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 uppercase">
                <span>🚚 Nuevo Proveedor Inline</span>
                <button type="button" onClick={onClose} className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer">✕</button>
            </div>
            <div className="flex gap-1.5 items-center">
                <input
                    type="text"
                    autoFocus
                    placeholder="NOMBRE"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                    type="text"
                    placeholder="TEL"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-20 bg-white border border-emerald-300 rounded px-1.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold rounded text-white shadow-sm shrink-0 cursor-pointer">
                    ✓
                </button>
            </div>
            {error && <p className="text-[10px] text-rose-600 font-bold">⚠️ {error}</p>}
        </div>
    );
}

function CategoryInlineForm({
    initialName = '',
    onClose,
    onSuccess
}: {
    initialName?: string;
    onClose: () => void;
    onSuccess: (category: Category) => void;
}) {
    const [name, setName] = useState(initialName);
    const [defaultMargin, setDefaultMargin] = useState<number | ''>(100);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) {
            setError('El nombre de la categoría es obligatorio.');
            return;
        }
        const marginVal = defaultMargin === '' ? 100 : Number(defaultMargin);

        try {
            const res = await createCategory({ name: cleanName, defaultMargin: marginVal });
            if (res.error) {
                setError(res.error);
            } else if (res.category) {
                onSuccess(res.category as Category);
            }
        } catch {
            setError('Error al guardar la categoría.');
        }
    };

    return (
        <div className="absolute top-7 left-0 w-80 z-50 bg-emerald-50 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 space-y-2 shadow-xl animate-in fade-in">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 uppercase">
                <span>🏷️ Nueva Categoría Inline</span>
                <button type="button" onClick={onClose} className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer">✕</button>
            </div>
            <div className="flex gap-1.5 items-center">
                <input
                    type="text"
                    autoFocus
                    placeholder="NOMBRE"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                    type="number"
                    step="any"
                    placeholder="MARGEN %"
                    value={defaultMargin}
                    onChange={(e) => setDefaultMargin(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-24 bg-white border border-emerald-300 rounded px-1.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold rounded text-white shadow-sm shrink-0 cursor-pointer">
                    ✓
                </button>
            </div>
            {error && <p className="text-[10px] text-rose-600 font-bold">⚠️ {error}</p>}
        </div>
    );
}

export default function ProductosPage() {
    const router = useRouter();
    const [fechaActual, setFechaActual] = useState('');
    const MAX_FILE_SIZE = 2 * 1024 * 1024;

    const [customMargin, setCustomMargin] = useState(false);
    const [isFormUnlocked, setIsFormUnlocked] = useState(false); // 👈 Controla si el formulario está desbloqueado

    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCategoryPanel, setShowCategoryPanel] = useState(false);
    const [showSupplierPanel, setShowSupplierPanel] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showModalListado, setShowModalListado] = useState(false);

    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
    const [stockAdjustmentType, setStockAdjustmentType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
    const [stockQuantityInput, setStockQuantityInput] = useState<number | ''>('');
    const [stockLoading, setStockLoading] = useState(false);

    const [showInlineCat, setShowInlineCat] = useState(false);
    const [showInlineSup, setShowInlineSup] = useState(false);

    const [catFormData, setCatFormData] = useState({ name: '', defaultMargin: 100 });
    const [supFormData, setSupFormData] = useState({ name: '', phone: '', address: '' });
    const [catPanelError, setCatPanelError] = useState<string | null>(null);
    const [supPanelError, setSupPanelError] = useState<string | null>(null);

    // Estados de edición de categorías en el panel desplegable
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editCatName, setEditCatName] = useState('');
    const [editCatMargin, setEditCatMargin] = useState<number | ''>(100);

    const [id, setId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [showCatDropdown, setShowCatDropdown] = useState(false);

    const [supplierId, setSupplierId] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupDropdown, setShowSupDropdown] = useState(false);

    const [cost, setCost] = useState<number | ''>('');
    const [otherCosts, setOtherCosts] = useState<number | ''>('');
    const [margin, setMargin] = useState<number | ''>(100);
    const [priceFinal, setPriceFinal] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(21);
    const [stock, setStock] = useState<number | ''>(0);
    const [minStock, setMinStock] = useState<number | ''>(2);
    const [imageUrl, setImageUrl] = useState('');
    const [imageError, setImageError] = useState<string | null>(null);

    const [destacado, setDestacado] = useState(false);
    const [color, setColor] = useState('');
    const [tamano, setTamano] = useState('');
    const [stockWeb, setStockWeb] = useState<number | ''>(0);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const catRef = useRef<HTMLDivElement>(null);
    const supRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fechaStr = hoy.toLocaleDateString('es-AR', opciones);
        setFechaActual(fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1));

        loadData();

        const handleClickOutside = (e: MouseEvent) => {
            if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDropdown(false);
            if (supRef.current && !supRef.current.contains(e.target as Node)) setShowSupDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const resumenProductos = useMemo(() => {
        const totalNeto = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
        const totalImpuestos = products.reduce((acc, p) => acc + ((p.price - (p.price / (1 + (p.taxRate / 100)))) * p.stock), 0);
        const alertas = products.filter(p => p.stock <= p.minStock).length;

        return {
            itemsRegistrados: products.length,
            valorNetoStock: `$${Math.round(totalNeto).toLocaleString('es-AR')}`,
            impuestosImplicitos: `$${Math.round(totalImpuestos).toLocaleString('es-AR')}`,
            alertasReposicion: alertas
        };
    }, [products]);

    const resetPanels = () => {
        setCatPanelError(null);
        setCatFormData({ name: '', defaultMargin: 100 });
        setSupFormData({ name: '', phone: '', address: '' });
        setSupPanelError(null);
        setEditingCatId(null);
    };

    const resetProductForm = () => {
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
        setCustomMargin(false);
        setPriceFinal(0);
        setTaxRate(21);
        setStock(0);
        setMinStock(2);
        setImageUrl('');
        setImageError(null);
        setDestacado(false);
        setColor('');
        setTamano('');
        setStockWeb(0);
        setIsFormUnlocked(false); // 👈 Bloquea / grisá el formulario de nuevo
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, sups, prods] = await Promise.all([getCategories(), getSuppliers(), getProducts()]);
            setCategories(cats as Category[]);
            setSuppliers(sups as Supplier[]);

            if (Array.isArray(prods)) {
                setProducts(prods as Product[]);
            } else if (prods && typeof prods === 'object' && 'products' in prods) {
                setProducts((prods as any).products);
            } else if (prods && typeof prods === 'object' && 'data' in prods) {
                setProducts((prods as any).data);
            } else {
                setProducts([]);
            }
        } catch {
            setMessage({ type: 'error', text: 'Error al conectar con la base de datos.' });
        } finally {
            setLoading(false);
        }
    };

    const computePrices = (cCost: number, cOther: number, cMargin: number, cTax: number) => {
        const totalBaseCost = (cCost || 0) + (cOther || 0);
        if (totalBaseCost <= 0) {
            setPriceFinal(0);
            return;
        }
        const marginVal = cMargin ?? 100;
        let subtotalNoTax = marginVal >= 100 ? totalBaseCost * (1 + marginVal / 100) : totalBaseCost / (1 - (marginVal / 100));
        const finalWithTax = subtotalNoTax * (1 + (cTax || 0) / 100);
        setPriceFinal(Math.round(finalWithTax));
    };

    const handleSaveCategoryStandalone = async () => {
        setCatPanelError(null);
        const cleanName = catFormData.name.trim().toUpperCase();
        if (!cleanName) {
            setCatPanelError('El nombre de la categoría es obligatorio.');
            return;
        }

        try {
            const res = await createCategory({ name: cleanName, defaultMargin: Number(catFormData.defaultMargin) || 0 });
            if (res.error) {
                setCatPanelError(res.error);
            } else if (res.category) {
                setMessage({ type: 'success', text: `Categoría "${res.category.name}" creada exitosamente.` });
                setCategories(prev => [...prev, res.category as Category]);
                resetPanels();
                setShowCategoryPanel(false);
            }
        } catch {
            setCatPanelError('Error al guardar la categoría.');
        }
    };

    const handleSaveSupplierStandalone = async () => {
        setSupPanelError(null);
        const cleanName = supFormData.name.trim().toUpperCase();
        if (!cleanName) {
            setSupPanelError('El nombre del proveedor es obligatorio.');
            return;
        }

        try {
            const res = await createSupplier({ name: cleanName, phone: supFormData.phone, address: supFormData.address });
            if (res.error) {
                setSupPanelError(res.error);
            } else if (res.supplier) {
                setMessage({ type: 'success', text: `Proveedor "${res.supplier.name}" creado exitosamente.` });
                setSuppliers(prev => [...prev, res.supplier as Supplier]);
                resetPanels();
                setShowSupplierPanel(false);
            }
        } catch {
            setSupPanelError('Error al guardar el proveedor.');
        }
    };

    const handleSelectCategory = async (cat: Category) => {
        if (categoryId !== cat.id) {
            setCategoryId(cat.id);
            setCategorySearch(cat.name);
            setShowCatDropdown(false);

            if (!customMargin) {
                setMargin(cat.defaultMargin ?? 100);
                computePrices(Number(cost), Number(otherCosts), cat.defaultMargin ?? 100, taxRate);
            }

            const nextCode = await generateNextProductCode(cat.id);
            setCode(nextCode);
        } else {
            setShowCatDropdown(false);
        }
    };

    const handleEditProduct = (prod: any) => {
        setId(prod.id);
        setCode(prod.code);
        setName(prod.name);
        setCategoryId(prod.categoryId);
        setCategorySearch(prod.category?.name || '');
        setSupplierId(prod.supplierId || '');
        setSupplierSearch(prod.supplier?.name || '');
        setCost(prod.cost);
        setOtherCosts(prod.otherCosts);
        setMargin(prod.margin);
        setCustomMargin(prod.customMargin || false);
        setTaxRate(prod.taxRate);
        setPriceFinal(prod.price);
        setStock(prod.stock);
        setMinStock(prod.minStock);
        setImageUrl(prod.imageUrl || '');
        setImageError(null);
        setDestacado(prod.destacado || false);
        setColor(prod.color || '');
        setTamano(prod.tamano || '');
        setStockWeb(prod.stockWeb !== undefined ? prod.stockWeb : prod.stock);
        setIsFormUnlocked(true); // 👈 Desbloquea el formulario al editar un producto

        setTimeout(() => {
            window.scrollTo({ top: 120, behavior: 'smooth' });
        }, 100);
    };

    const handleOpenStockModal = (prod: Product) => {
        setSelectedProductForStock(prod);
        setStockAdjustmentType('IN');
        setStockQuantityInput('');
        setShowStockModal(true);
    };

    const handleSaveStockAdjustment = async () => {
        if (!selectedProductForStock) return;
        const qty = Number(stockQuantityInput);

        if (isNaN(qty) || stockQuantityInput === '' || qty < 0) {
            setMessage({ type: 'error', text: 'Por favor, ingrese una cantidad válida y mayor o igual a cero.' });
            return;
        }

        setStockLoading(true);
        const res = await adjustStock(selectedProductForStock.id, qty, stockAdjustmentType);
        setStockLoading(false);

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: `Stock de "${selectedProductForStock.name}" actualizado correctamente.` });
            setShowStockModal(false);
            setSelectedProductForStock(null);
            loadData();
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            const currentSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const errorMsg = `La imagen pesa ${currentSizeMB} MB. El tamaño máximo permitido es de 2 MB.`;
            setImageError(errorMsg);
            setMessage({ type: 'error', text: errorMsg });
            e.target.value = '';
            return;
        }

        setImageError(null);
        const reader = new FileReader();
        reader.onloadend = () => { setImageUrl(reader.result as string); };
        reader.readAsDataURL(file);
    };

    const calculatedNewStock = useMemo(() => {
        if (!selectedProductForStock) return 0;
        const current = selectedProductForStock.stock;
        const qty = Number(stockQuantityInput) || 0;
        if (stockAdjustmentType === 'IN') return current + qty;
        if (stockAdjustmentType === 'OUT') return Math.max(0, current - qty);
        if (stockAdjustmentType === 'ADJUSTMENT') return qty;
        return current;
    }, [selectedProductForStock, stockQuantityInput, stockAdjustmentType]);

    const handleExportCSV = () => {
        if (products.length === 0) {
            setMessage({ type: 'error', text: 'No hay productos para exportar.' });
            return;
        }
        const headers = ['Codigo', 'Nombre', 'Categoria', 'Proveedor', 'CostoBase', 'FleteOtros', 'Margen', 'IVA', 'PrecioFinal', 'Stock', 'StockMinimo', 'Destacado', 'ImagenUrl'];
        const rows = products.map(p => [
            `"${p.code || ''}"`, `"${p.name || ''}"`, `"${p.category?.name || ''}"`, `"${p.supplier?.name || ''}"`,
            p.cost || 0, p.otherCosts || 0, p.margin || 0, p.taxRate || 0, p.price || 0, p.stock || 0, p.minStock || 0,
            p.destacado ? 'SI' : 'NO', `"${p.imageUrl || ''}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `catalogo_productos_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage({ type: 'success', text: 'Catálogo exportado exitosamente.' });
    };

    const handleProcessImport = async () => {
        if (!importFile) {
            setMessage({ type: 'error', text: 'Por favor, selecciona un archivo CSV o JSON.' });
            return;
        }
        setImporting(true);
        try {
            const text = await importFile.text();
            let rawData: any[] = [];
            if (importFile.name.endsWith('.json')) {
                rawData = JSON.parse(text);
            } else if (importFile.name.endsWith('.csv')) {
                const lines = text.split('\n').filter(l => l.trim() !== '');
                const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                rawData = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
                    const obj: any = {};
                    headers.forEach((header, index) => { obj[header] = values[index]; });
                    return obj;
                });
            }
            const res = await importProductsBatch(rawData);
            if (res.error) {
                setMessage({ type: 'error', text: res.error });
            } else {
                setMessage({ type: 'success', text: `Se importaron/actualizaron ${res.count || rawData.length} productos correctamente.` });
                setShowImportModal(false);
                setImportFile(null);
                loadData();
            }
        } catch {
            setMessage({ type: 'error', text: 'Error al procesar el archivo.' });
        } finally {
            setImporting(false);
        }
    };

    const filteredCats = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
    const filteredSups = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

    return (
        <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col font-sans text-slate-800 pb-2 max-w-7xl mx-auto">
            <div className="bg-stone-100 rounded-2xl border border-slate-200/80 shadow-sm p-3 md:p-4 space-y-2.5">

                {/* ENCABEZADO Y ACCIONES PRINCIPALES */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-0.5 gap-1 shrink-0">
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                            <span>📦</span> Catálogo de Productos & Gestión Comercial
                        </h1>
                        <p className="text-[9px] text-slate-500 font-medium">
                            Control de inventario, costos y márgenes. &bull; {fechaActual}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setShowModalListado(true)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            📋 Ver Listado ({products.length})
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-semibold rounded shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                            📥 Exportar
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowImportModal(true)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-semibold rounded shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                            📤 Importar
                        </button>

                        <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block"></div>

                        <button
                            type="button"
                            onClick={() => { resetPanels(); setShowCategoryPanel(!showCategoryPanel); setShowSupplierPanel(false); }}
                            className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${showCategoryPanel ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {showCategoryPanel ? '✕ Categoría' : '🏷️ Categoría'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { resetPanels(); setShowSupplierPanel(!showSupplierPanel); setShowCategoryPanel(false); }}
                            className={`px-2 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${showSupplierPanel ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {showSupplierPanel ? '✕ Proveedor' : '🚚 Proveedor'}
                        </button>

                        {/* BOTÓN NUEVO REGISTRO: Desbloquea el formulario */}
                        <button
                            type="button"
                            onClick={() => {
                                resetProductForm();
                                setIsFormUnlocked(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs transition-colors cursor-pointer"
                        >
                            + Nuevo Registro
                        </button>
                    </div>
                </div>

                {/* TARJETAS DE RESUMEN MÉTRICAS COMPACTAS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                    <div className="bg-white/90 p-1.5 px-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2">
                        <div className="p-1 bg-slate-100 rounded text-xs">📦</div>
                        <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Items Registrados</p>
                            <p className="text-xs font-black text-slate-900">{resumenProductos.itemsRegistrados}</p>
                        </div>
                    </div>

                    <div className="bg-white/90 p-1.5 px-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2">
                        <div className="p-1 bg-emerald-50 text-emerald-700 rounded text-xs">💵</div>
                        <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Valor Neto Stock</p>
                            <p className="text-xs font-black text-slate-900">{resumenProductos.valorNetoStock}</p>
                        </div>
                    </div>

                    <div className="bg-white/90 p-1.5 px-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2">
                        <div className="p-1 bg-slate-100 rounded text-xs">📄</div>
                        <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Impuestos Implícitos</p>
                            <p className="text-xs font-black text-slate-900">{resumenProductos.impuestosImplicitos}</p>
                        </div>
                    </div>

                    <div className="bg-white/90 p-1.5 px-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2">
                        <div className="p-1 bg-amber-50 text-amber-700 rounded text-xs">⚠️</div>
                        <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Alertas Reposición</p>
                            <p className="text-xs font-black text-amber-600">{resumenProductos.alertasReposicion} items</p>
                        </div>
                    </div>
                </div>

                {/* NOTIFICACIONES */}
                {message && (
                    <div className={`p-2 rounded-md text-[10px] font-medium flex justify-between items-center transition-all shrink-0 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'}`}>
                        <div className="flex items-center gap-1.5">
                            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                            <span className="font-semibold">{message.text}</span>
                        </div>
                        <button type="button" onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1 cursor-pointer">✕</button>
                    </div>
                )}

                {/* PANEL DE CATEGORÍAS CON LISTADO Y EDICIÓN INTEGRADA */}
                {showCategoryPanel && (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 animate-in fade-in space-y-3 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <span>🏷️</span> Gestión y Alta de Categorías
                            </h3>
                            <button type="button" onClick={() => setShowCategoryPanel(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
                        </div>

                        {catPanelError && <p className="text-[10px] text-rose-400 font-bold bg-rose-950/50 p-1.5 rounded">⚠️ {catPanelError}</p>}

                        {/* FORMULARIO DE ALTA */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-slate-800/60 p-2 rounded-lg border border-slate-700">
                            <input
                                type="text"
                                placeholder="NOMBRE DE CATEGORÍA"
                                value={catFormData.name}
                                onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value.toUpperCase() })}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white uppercase focus:outline-none"
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="MARGEN % PREDETERMINADO"
                                value={catFormData.defaultMargin}
                                onChange={(e) => setCatFormData({ ...catFormData, defaultMargin: e.target.value === '' ? '' : Number(e.target.value) })}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleSaveCategoryStandalone}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded shadow-xs transition-colors cursor-pointer"
                            >
                                + Registrar Categoría
                            </button>
                        </div>

                        {/* LISTADO DE CATEGORÍAS EXISTENTES CON EDICIÓN */}
                        <div className="space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Categorías Registradas ({categories.length}):</p>
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                {categories.length > 0 ? (
                                    categories.map((cat) => (
                                        <div key={cat.id} className="bg-slate-800/80 p-2 rounded border border-slate-700/60 text-[10px] space-y-1.5">
                                            {editingCatId === cat.id ? (
                                                /* MODO EDICIÓN ACTIVO */
                                                <div className="flex gap-1.5 items-center">
                                                    <input
                                                        type="text"
                                                        value={editCatName}
                                                        onChange={(e) => setEditCatName(e.target.value.toUpperCase())}
                                                        className="flex-1 bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-[10px] text-white font-bold uppercase focus:outline-none"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={editCatMargin}
                                                        onChange={(e) => setEditCatMargin(e.target.value === '' ? '' : Number(e.target.value))}
                                                        className="w-20 bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-[10px] text-white font-bold focus:outline-none"
                                                        placeholder="Margen %"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const cleanName = editCatName.trim().toUpperCase();
                                                            if (!cleanName) {
                                                                setCatPanelError('El nombre no puede estar vacío.');
                                                                return;
                                                            }
                                                            try {
                                                                const res = await updateCategory({ id: cat.id, name: cleanName, defaultMargin: Number(editCatMargin) || 0 });
                                                                if (res.error) {
                                                                    setCatPanelError(res.error);
                                                                } else {
                                                                    setMessage({ type: 'success', text: 'Categoría y precios actualizados con éxito.' });
                                                                    loadData();
                                                                    router.refresh();
                                                                    setEditingCatId(null);
                                                                }
                                                            } catch {
                                                                setCatPanelError('Error al actualizar la categoría.');
                                                            }
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded cursor-pointer"
                                                        title="Guardar cambios"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingCatId(null)}
                                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-2 py-1 rounded cursor-pointer"
                                                        title="Cancelar"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                /* MODO VISTA NORMAL */
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-white">{cat.name}</span>
                                                        <span className="text-[9px] bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                                                            Margen: {cat.defaultMargin}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingCatId(cat.id);
                                                                setEditCatName(cat.name);
                                                                setEditCatMargin(cat.defaultMargin);
                                                                setCatPanelError(null);
                                                            }}
                                                            className="text-sky-400 hover:text-sky-200 font-bold px-1.5 py-0.5 rounded bg-sky-950/40 hover:bg-sky-900/60 transition-colors cursor-pointer"
                                                            title="Editar categoría"
                                                        >
                                                            ✏️ Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"?`)) {
                                                                    const res = await deleteCategory(cat.id);
                                                                    if (res.error) {
                                                                        setCatPanelError(res.error);
                                                                    } else {
                                                                        setMessage({ type: 'success', text: `Categoría "${cat.name}" eliminada correctamente.` });
                                                                        setCategories(prev => prev.filter(c => c.id !== cat.id));
                                                                    }
                                                                }
                                                            }}
                                                            className="text-rose-400 hover:text-rose-200 font-bold px-1.5 py-0.5 rounded bg-rose-950/40 hover:bg-rose-900/60 transition-colors cursor-pointer"
                                                            title="Eliminar categoría"
                                                        >
                                                            🗑️ Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-500 text-center py-2">No hay categorías registradas.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showSupplierPanel && (
                    <div className="bg-slate-900 text-white p-2.5 rounded-md shadow-md border border-slate-700 animate-in fade-in space-y-1.5 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">🚚 Alta Standalone de Proveedor</h3>
                            <button type="button" onClick={() => setShowSupplierPanel(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
                        </div>
                        {supPanelError && <p className="text-[10px] text-rose-400 font-bold bg-rose-950/50 p-1 rounded">⚠️ {supPanelError}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input type="text" placeholder="NOMBRE / RAZÓN SOCIAL" value={supFormData.name} onChange={(e) => setSupFormData({ ...supFormData, name: e.target.value.toUpperCase() })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white uppercase" />
                            <input type="text" placeholder="TELÉFONO" value={supFormData.phone} onChange={(e) => setSupFormData({ ...supFormData, phone: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white" />
                            <input type="text" placeholder="DIRECCIÓN" value={supFormData.address} onChange={(e) => setSupFormData({ ...supFormData, address: e.target.value.toUpperCase() })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white uppercase" />
                        </div>
                        <div className="flex justify-end gap-1 pt-1">
                            <button type="button" onClick={() => setShowSupplierPanel(false)} className="px-2 py-0.5 text-[10px] text-slate-300 cursor-pointer">Cancelar</button>
                            <button type="button" onClick={handleSaveSupplierStandalone} className="px-2.5 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded cursor-pointer">Guardar</button>
                        </div>
                    </div>
                )}

                {/* FORMULARIO FIJO DE ALTA Y EDICIÓN DE PRODUCTO (Visible pero bloqueado/grisado si isFormUnlocked es false) */}
                <div
                    ref={formRef}
                    className={`bg-white p-4 rounded-xl shadow-sm border border-stone-200 space-y-2.5 transition-all ${!isFormUnlocked ? 'opacity-50 bg-slate-50 pointer-events-none select-none' : ''}`}
                >
                    <div className="flex justify-between items-center border-b pb-1">
                        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{id ? '✏️' : '🌱'}</span>
                            {id ? `Editar Producto: ${name}` : 'Nuevo Producto en Catálogo'}
                            {!isFormUnlocked && <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold ml-2">🔒 Bloqueado (Presione "+ Nuevo Registro")</span>}
                        </h3>
                        {isFormUnlocked && (
                            <button type="button" onClick={resetProductForm} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer pointer-events-auto">
                                ✕ Cancelar / Bloquear
                            </button>
                        )}
                    </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!categoryId) { setMessage({ type: 'error', text: 'Debe seleccionar una categoría obligatoriamente.' }); return; }
                        if (!name.trim()) { setMessage({ type: 'error', text: 'El nombre del producto no puede estar vacío.' }); return; }

                        const res = await saveProduct({
                            id: id || undefined,
                            code,
                            name: name.trim().toUpperCase(),
                            categoryId,
                            supplierId: supplierId || null,
                            cost: Number(cost) || 0,
                            otherCosts: Number(otherCosts) || 0,
                            price: Number(priceFinal) || 0,
                            margin: Number(margin) || 0,
                            customMargin: Boolean(customMargin),
                            taxRate: Number(taxRate) || 0,
                            stock: Number(stock) || 0,
                            minStock: Number(minStock) || 0,
                            destacado: Boolean(destacado),
                            color: color.trim().toUpperCase() || undefined,
                            tamano: tamano.trim().toUpperCase() || undefined,
                            stockWeb: stockWeb !== '' ? Number(stockWeb) : Number(stock) || 0,
                            imageUrl: imageUrl.trim() || '/sinfoto.png'
                        } as any);

                        if (res.error) {
                            setMessage({ type: 'error', text: res.error });
                        } else {
                            setMessage({ type: 'success', text: `Producto "${name.toUpperCase()}" guardado correctamente.` });
                            resetProductForm();
                            loadData();
                        }
                    }} className="space-y-2">

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-200 rounded">
                                <div className="w-10 h-10 relative rounded overflow-hidden border border-slate-300 bg-white shrink-0 flex items-center justify-center">
                                    <img src={imageUrl.trim() || '/sinfoto.png'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/sinfoto.png'; }} />
                                </div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase">Vista Previa</span>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Subir Imagen desde la PC (Opcional)</label>
                                <input type="file" disabled={!isFormUnlocked} accept="image/*" onChange={handleImageChange} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] text-slate-700 cursor-pointer" />
                                {imageError && <p className="text-[9px] text-rose-600 font-bold mt-0.5">⚠️ {imageError}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* CATEGORÍA AUTOCOMPLETE */}
                            <div className="relative" ref={catRef}>
                                <div className="flex justify-between items-center mb-0.5">
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase">Categoría *</label>
                                    <button type="button" disabled={!isFormUnlocked} onClick={() => { setShowInlineCat(!showInlineCat); setShowInlineSup(false); }} className="text-[8px] font-bold text-emerald-700 hover:underline cursor-pointer">+ Inline</button>
                                </div>
                                {showInlineCat && (
                                    <CategoryInlineForm initialName={categorySearch} onClose={() => setShowInlineCat(false)} onSuccess={(newCat) => { setCategories(prev => [...prev, newCat]); handleSelectCategory(newCat); setShowInlineCat(false); }} />
                                )}
                                <input type="text" disabled={!isFormUnlocked} placeholder="Buscar o seleccionar..." value={categorySearch} onChange={(e) => { setCategorySearch(e.target.value); setShowCatDropdown(true); if (categoryId) setCategoryId(''); }} onFocus={() => setShowCatDropdown(true)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold uppercase text-slate-800 focus:bg-white focus:outline-none" />
                                {showCatDropdown && (
                                    <div className="absolute z-40 top-full left-0 right-0 bg-white border border-slate-200 shadow-md rounded-b max-h-36 overflow-y-auto mt-0.5">
                                        {filteredCats.length > 0 ? filteredCats.map(c => (
                                            <div key={c.id} onClick={() => handleSelectCategory(c)} className="px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 flex justify-between">
                                                <span className="font-bold">{c.name}</span>
                                                <span className="text-[8px] text-slate-400">Margen: {c.defaultMargin}%</span>
                                            </div>
                                        )) : <div className="p-1.5 text-center text-[10px] text-slate-400">No hay resultados.</div>}
                                    </div>
                                )}
                            </div>

                            {/* CÓDIGO PRODUCTO */}
                            <div>
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Código Identificador</label>
                                <input type="text" readOnly disabled={!isFormUnlocked} placeholder="Autogenerado..." value={code} className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[10px] font-mono font-bold text-slate-600 cursor-not-allowed" />
                            </div>

                            {/* NOMBRE PRODUCTO */}
                            <div>
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Nombre del Producto *</label>
                                <input type="text" disabled={!isFormUnlocked} required placeholder="EJ. FICUS LYRATA 10L" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-bold uppercase text-slate-800 focus:bg-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* PROVEEDOR AUTOCOMPLETE */}
                            <div className="relative" ref={supRef}>
                                <div className="flex justify-between items-center mb-0.5">
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase">Proveedor Sugerido</label>
                                    <button type="button" disabled={!isFormUnlocked} onClick={() => { setShowInlineSup(!showInlineSup); setShowInlineCat(false); }} className="text-[8px] font-bold text-emerald-700 hover:underline cursor-pointer">+ Inline</button>
                                </div>
                                {showInlineSup && (
                                    <SupplierInlineForm initialName={supplierSearch} onClose={() => setShowInlineSup(false)} onSuccess={(newSup) => { setSuppliers(prev => [...prev, newSup]); setSupplierId(newSup.id); setSupplierSearch(newSup.name); setShowInlineSup(false); }} />
                                )}
                                <input type="text" disabled={!isFormUnlocked} placeholder="Buscar proveedor..." value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); setShowSupDropdown(true); if (supplierId) setSupplierId(''); }} onFocus={() => setShowSupDropdown(true)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold uppercase text-slate-800 focus:bg-white" />
                                {showSupDropdown && (
                                    <div className="absolute z-40 top-full left-0 right-0 bg-white border border-slate-200 shadow-md rounded-b max-h-36 overflow-y-auto mt-0.5">
                                        {filteredSups.length > 0 ? filteredSups.map(s => (
                                            <div key={s.id} onClick={() => { setSupplierId(s.id); setSupplierSearch(s.name); setShowSupDropdown(false); }} className="px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-emerald-50 cursor-pointer border-b border-slate-100">
                                                <span className="font-bold">{s.name}</span>
                                            </div>
                                        )) : <div className="p-1.5 text-center text-[10px] text-slate-400">No hay resultados.</div>}
                                    </div>
                                )}
                            </div>

                            {/* COSTOS */}
                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Costo Base ($)</label>
                                    <input type="number" disabled={!isFormUnlocked} step="any" placeholder="0" value={cost} onChange={(e) => { const v = e.target.value === '' ? '' : parseFloat(e.target.value); setCost(v); computePrices(Number(v), Number(otherCosts), Number(margin), taxRate); }} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-800" />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Flete/Otros ($)</label>
                                    <input type="number" disabled={!isFormUnlocked} step="any" placeholder="0" value={otherCosts} onChange={(e) => { const v = e.target.value === '' ? '' : parseFloat(e.target.value); setOtherCosts(v); computePrices(Number(cost), Number(v), Number(margin), taxRate); }} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-800" />
                                </div>
                            </div>

                            {/* MARGEN E IVA (CON CHECKBOX DE MANUAL) */}
                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase">Margen (%)</label>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                disabled={!isFormUnlocked}
                                                id="customMarginCheck"
                                                checked={customMargin}
                                                onChange={(e) => setCustomMargin(e.target.checked)}
                                                className="w-3 h-3 text-emerald-600 rounded cursor-pointer"
                                            />
                                            <label htmlFor="customMarginCheck" className="text-[7px] font-bold text-emerald-800 uppercase cursor-pointer" title="Fija un margen manual que no cambiará si modificas el de la categoría">
                                                Manual
                                            </label>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        disabled={!isFormUnlocked}
                                        step="any"
                                        placeholder="100"
                                        value={margin}
                                        onChange={(e) => {
                                            const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                                            setMargin(v);
                                            setCustomMargin(true);
                                            computePrices(Number(cost), Number(otherCosts), Number(v), taxRate);
                                        }}
                                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Tasa IVA (%)</label>
                                    <select disabled={!isFormUnlocked} value={taxRate} onChange={(e) => { const v = parseFloat(e.target.value); setTaxRate(v); computePrices(Number(cost), Number(otherCosts), Number(margin), v); }} className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-semibold text-slate-800">
                                        <option value={21}>21%</option>
                                        <option value={10.5}>10.5%</option>
                                        <option value={0}>0%</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* STOCKS Y PRECIO FINAL */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 items-center">
                            <div className="flex flex-col justify-center">
                                <label className="block text-[8px] font-bold text-emerald-900 uppercase">Precio Final (Con IVA)</label>
                                <div className="text-sm font-black text-emerald-700">${priceFinal.toLocaleString('es-AR')}</div>
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Stock Físico</label>
                                <input type="number" disabled={!isFormUnlocked} placeholder="0" value={stock} onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-bold text-slate-800" />
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Stock Mínimo</label>
                                <input type="number" disabled={!isFormUnlocked} placeholder="2" value={minStock} onChange={(e) => setMinStock(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-800" />
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-emerald-800 uppercase mb-0.5">Stock Exclusivo Web</label>
                                <input type="number" disabled={!isFormUnlocked} placeholder="0" value={stockWeb} onChange={(e) => setStockWeb(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-bold text-emerald-900" />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <input type="checkbox" disabled={!isFormUnlocked} id="destacadoCheck" checked={destacado} onChange={(e) => setDestacado(e.target.checked)} className="w-3.5 h-3.5 text-emerald-600 rounded border-emerald-300 cursor-pointer" />
                                <label htmlFor="destacadoCheck" className="text-[9px] font-bold text-slate-700 uppercase cursor-pointer select-none">⭐ Destacado Web</label>
                            </div>
                        </div>

                        {/* VARIANTES WEB EN UNA SOLA LÍNEA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-stone-100 p-2 rounded-lg border border-stone-200">
                            <div>
                                <label className="block text-[8px] font-bold text-stone-700 uppercase mb-0.5">🎨 Color (Variante Web)</label>
                                <input type="text" disabled={!isFormUnlocked} placeholder="EJ. BARRO, TERRACOTA..." value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-[10px] font-semibold text-stone-800" />
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-stone-700 uppercase mb-0.5">📏 Tamaño / Medida (Variante Web)</label>
                                <input type="text" disabled={!isFormUnlocked} placeholder="EJ. Nº 13, 10 LITROS..." value={tamano} onChange={(e) => setTamano(e.target.value.toUpperCase())} className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-[10px] font-semibold text-stone-800" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1 border-t">
                            <button type="button" disabled={!isFormUnlocked} onClick={resetProductForm} className="px-3 py-1 border border-slate-300 text-slate-700 text-[10px] font-semibold rounded hover:bg-slate-50 cursor-pointer">
                                Cancelar / Bloquear
                            </button>
                            <button type="submit" disabled={!isFormUnlocked} className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs cursor-pointer">
                                {id ? 'Guardar Cambios' : 'Registrar Producto'}
                            </button>
                        </div>

                    </form>
                </div>

                {/* MODAL DE LISTADO COMPLETO */}
                <ModalListadoProductos
                    isOpen={showModalListado}
                    onClose={() => setShowModalListado(false)}
                    products={products}
                    loading={loading}
                    onEdit={(prod) => handleEditProduct(prod)}
                    onQuickStock={(prod) => handleOpenStockModal(prod)}
                    onDelete={async (id, name) => {
                        if (confirm(`¿Eliminar producto "${name}"?`)) {
                            const res = await deleteProduct(id);
                            if (res.error) setMessage({ type: 'error', text: res.error });
                            else { setMessage({ type: 'success', text: 'Producto eliminado.' }); loadData(); }
                        }
                    }}
                />

                {/* MODALES DE STOCK E IMPORTACIÓN */}
                {showStockModal && selectedProductForStock && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
                        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="text-xs font-extrabold text-slate-900">⚡ Ajuste Rápido de Stock</h3>
                                <button type="button" onClick={() => setShowStockModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
                            </div>
                            <div className="flex justify-between text-xs bg-slate-50 p-2 rounded">
                                <span>Actual: <b>{selectedProductForStock.stock}</b></span>
                                <span>Nuevo: <b className="text-emerald-700">{calculatedNewStock}</b></span>
                            </div>
                            <input type="number" autoFocus value={stockQuantityInput} onChange={(e) => setStockQuantityInput(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full border rounded p-1.5 text-xs font-bold" placeholder="Cantidad..." />
                            <div className="flex justify-end gap-1 pt-2">
                                <button type="button" onClick={() => setShowStockModal(false)} className="px-3 py-1 border text-xs rounded">Cancelar</button>
                                <button type="button" onClick={handleSaveStockAdjustment} className="px-3.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                {showImportModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
                        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
                            <div className="flex justify-between items-center border-b pb-1.5">
                                <h3 className="text-xs font-extrabold text-slate-900">📤 Importación Masiva</h3>
                                <button type="button" onClick={() => setShowImportModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
                            </div>
                            <input type="file" accept=".csv, .json" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="w-full text-xs" />
                            <div className="flex justify-end gap-1 pt-1 border-t">
                                <button type="button" onClick={() => setShowImportModal(false)} className="px-3 py-1 border text-xs rounded">Cancelar</button>
                                <button type="button" disabled={importing || !importFile} onClick={handleProcessImport} className="px-3 py-1 bg-sky-600 text-white text-xs font-bold rounded">Importar</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}