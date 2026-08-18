'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Category, Supplier, SortField, SortOrder } from '@/types/product';
import { CategoryInlineForm } from '@/components/products/CategoryInlineForm';

import {
    getCategories,
    createCategory,
    getSuppliers,
    createSupplier,
    getProducts,
    generateNextProductCode,
    saveProduct,
    deleteProduct,
    importProductsBatch,
    adjustStock
} from '@/actions/product-actions';

// ----------------------------------------------------------------------
// COMPONENTES AUXILIARES INLINE (Proveedor)
// ----------------------------------------------------------------------

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
                <button type="button" onClick={onClose} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
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
                <button type="button" onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold rounded text-white shadow-sm shrink-0">
                    ✓
                </button>
            </div>
            {error && <p className="text-[10px] text-rose-600 font-bold">⚠️ {error}</p>}
        </div>
    );
}

// ----------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------

export default function ProductosPage() {
    const [fechaActual, setFechaActual] = useState('');
    const [tabActiva, setTabActiva] = useState('catalogo');

    // Estados de datos principales
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Visibilidad de Paneles y Modales
    const [showProductForm, setShowProductForm] = useState(false);
    const [showCategoryPanel, setShowCategoryPanel] = useState(false);
    const [showSupplierPanel, setShowSupplierPanel] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Estado para Ajuste Rápido de Stock
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
    const [stockAdjustmentType, setStockAdjustmentType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
    const [stockQuantityInput, setStockQuantityInput] = useState<number | ''>('');
    const [stockLoading, setStockLoading] = useState(false);

    const [showInlineCat, setShowInlineCat] = useState(false);
    const [showInlineSup, setShowInlineSup] = useState(false);

    // Formulario Standalone Proveedor
    const [supFormData, setSupFormData] = useState({ name: '', phone: '', address: '' });
    const [catPanelError, setCatPanelError] = useState<string | null>(null);
    const [supPanelError, setSupPanelError] = useState<string | null>(null);

    // Formulario de Producto
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

    // Mensajería Global
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Ordenamiento, Filtro y Paginación
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Importación / Exportación
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    // Referencias DOM
    const catRef = useRef<HTMLDivElement>(null);
    const supRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // ----------------------------------------------------------------------
    // EFECTOS Y LÓGICA DE NEGOCIO
    // ----------------------------------------------------------------------

    useEffect(() => {
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

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
        setSupFormData({ name: '', phone: '', address: '' });
        setSupPanelError(null);
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
        setPriceFinal(0);
        setTaxRate(21);
        setStock(0);
        setMinStock(2);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, sups, prods] = await Promise.all([getCategories(), getSuppliers(), getProducts()]);
            setCategories(cats as Category[]);
            setSuppliers(sups as Supplier[]);
            setProducts(prods as Product[]);
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

    const handleSaveSupplierStandalone = async () => {
        setSupPanelError(null);
        const cleanName = supFormData.name.trim().toUpperCase();
        if (!cleanName) {
            setSupPanelError('El nombre del proveedor es obligatorio.');
            return;
        }

        try {
            const res = await createSupplier({
                name: cleanName,
                phone: supFormData.phone,
                address: supFormData.address
            });
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
        setCategoryId(cat.id);
        setCategorySearch(cat.name);
        setShowCatDropdown(false);
        setMargin(cat.defaultMargin ?? 100);
        computePrices(Number(cost), Number(otherCosts), cat.defaultMargin ?? 100, taxRate);
        if (!id) {
            const nextCode = await generateNextProductCode(cat.id);
            setCode(nextCode);
        }
    };

    const handleEditProduct = (prod: Product) => {
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
        setTaxRate(prod.taxRate);
        setPriceFinal(prod.price);
        setStock(prod.stock);
        setMinStock(prod.minStock);

        setShowProductForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth' });
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

        const headers = ['Codigo', 'Nombre', 'Categoria', 'Proveedor', 'CostoBase', 'FleteOtros', 'Margen', 'IVA', 'PrecioFinal', 'Stock', 'StockMinimo'];
        const rows = products.map(p => [
            `"${p.code || ''}"`,
            `"${p.name || ''}"`,
            `"${p.category?.name || ''}"`,
            `"${p.supplier?.name || ''}"`,
            p.cost || 0,
            p.otherCosts || 0,
            p.margin || 0,
            p.taxRate || 0,
            p.price || 0,
            p.stock || 0,
            p.minStock || 0
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
                    headers.forEach((header, index) => {
                        obj[header] = values[index];
                    });
                    return obj;
                });
            }

            if (rawData.length === 0) {
                setMessage({ type: 'error', text: 'El archivo está vacío o no tiene un formato válido.' });
                setImporting(false);
                return;
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
            setMessage({ type: 'error', text: 'Error al procesar el archivo. Verifique la estructura de los datos.' });
        } finally {
            setImporting(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedProducts = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();

        return products
            .filter(p => {
                const cumpleTab = tabActiva === 'catalogo' || (tabActiva === 'alertas' && p.stock <= p.minStock);
                if (!cumpleTab) return false;
                if (!query) return true;
                const matchName = p.name.toLowerCase().includes(query);
                const matchCode = p.code.toLowerCase().includes(query);
                const matchCat = p.category?.name.toLowerCase().includes(query) ?? false;
                return matchName || matchCode || matchCat;
            })
            .sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                if (sortField === 'name') {
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                } else if (sortField === 'category') {
                    valA = (a.category?.name || '').toLowerCase();
                    valB = (b.category?.name || '').toLowerCase();
                } else if (sortField === 'code') {
                    valA = a.code.toLowerCase();
                    valB = b.code.toLowerCase();
                } else if (sortField === 'price') {
                    valA = a.price;
                    valB = b.price;
                } else if (sortField === 'stock') {
                    valA = a.stock;
                    valB = b.stock;
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
    }, [products, searchTerm, sortField, sortOrder, tabActiva]);

    const totalItems = filteredAndSortedProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);

    const filteredCats = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
    const filteredSups = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

    // ----------------------------------------------------------------------
    // RENDERIZADO VISUAL
    // ----------------------------------------------------------------------

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col font-sans text-slate-800 pb-4 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2 flex-1">

                {/* ENCABEZADO Y ACCIONES */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-0.5 gap-1 shrink-0">
                    <div>
                        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                            <span>📦</span> Catálogo de Productos & Gestión Comercial
                        </h1>
                        <p className="text-[9px] text-slate-500 font-medium">
                            Control de inventario, costos y márgenes. &bull; {fechaActual}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-semibold rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Exportar a CSV"
                        >
                            📥 Exportar
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowImportModal(true)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-semibold rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            📤 Importar
                        </button>

                        <div className="h-5 w-px bg-slate-300 mx-0.5 hidden sm:block"></div>

                        <button
                            type="button"
                            onClick={() => { resetPanels(); setShowCategoryPanel(!showCategoryPanel); setShowSupplierPanel(false); }}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${showCategoryPanel ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {showCategoryPanel ? '✕ Cerrar' : '🏷️ Categoría'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { resetPanels(); setShowSupplierPanel(!showSupplierPanel); setShowCategoryPanel(false); }}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded border transition-all cursor-pointer ${showSupplierPanel ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {showSupplierPanel ? '✕ Cerrar' : '🚚 Proveedor'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (showProductForm) {
                                    setShowProductForm(false);
                                    resetProductForm();
                                } else {
                                    resetProductForm();
                                    setShowProductForm(true);
                                }
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs transition-colors cursor-pointer"
                        >
                            {showProductForm ? '✕ Cerrar' : '+ Nuevo Producto'}
                        </button>
                    </div>
                </div>

                {/* TARJETAS DE RESUMEN MÉTRICAS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                    <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-100 rounded text-sm">📦</div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Items Registrados</p>
                            <p className="text-xs font-black text-slate-900">{resumenProductos.itemsRegistrados}</p>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded text-sm">💵</div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Valor Neto Stock</p>
                            <p className="text-xs font-black text-slate-900">{resumenProductos.valorNetoStock}</p>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-100 rounded text-sm">📄</div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Impuestos Implícitos</p>
                            <p className="text-xs font-black text-slate-900">{resumenProductos.impuestosImplicitos}</p>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
                        <div className="p-1.5 bg-amber-50 text-amber-700 rounded text-sm">⚠️</div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Alertas Reposición</p>
                            <p className="text-xs font-black text-amber-600">{resumenProductos.alertasReposicion} items</p>
                        </div>
                    </div>
                </div>

                {/* NOTIFICACIONES */}
                {message && (
                    <div className={`p-2.5 rounded-md text-[11px] font-medium flex justify-between items-center transition-all shrink-0 ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs'
                        : 'bg-rose-50 text-rose-900 border border-rose-300 shadow-2xs'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                            <span className="font-semibold">{message.text}</span>
                        </div>
                        <button type="button" onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1 cursor-pointer">✕</button>
                    </div>
                )}

                {/* PANELES INDEPENDIENTES */}
                {showCategoryPanel && (
                    <div className="bg-slate-900 text-white p-3 rounded-md shadow-md border border-slate-700 animate-in fade-in space-y-2 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <span>🏷️</span> Alta Standalone de Categoría
                            </h3>
                            <button type="button" onClick={() => setShowCategoryPanel(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
                        </div>
                        {catPanelError && <p className="text-[10px] text-rose-400 font-bold bg-rose-950/50 p-1.5 rounded border border-rose-800">⚠️ {catPanelError}</p>}
                        <div className="text-[10px] text-slate-300">
                            <p>Para crear categorías de forma rápida podés utilizar directamente el botón de <strong>+ Inline</strong> dentro del formulario del producto.</p>
                        </div>
                    </div>
                )}

                {showSupplierPanel && (
                    <div className="bg-slate-900 text-white p-3 rounded-md shadow-md border border-slate-700 animate-in fade-in space-y-2 shrink-0">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <span>🚚</span> Alta Standalone de Proveedor
                            </h3>
                            <button type="button" onClick={() => setShowSupplierPanel(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
                        </div>
                        {supPanelError && <p className="text-[10px] text-rose-400 font-bold bg-rose-950/50 p-1.5 rounded border border-rose-800">⚠️ {supPanelError}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[8px] font-bold text-slate-300 uppercase mb-0.5">Nombre / Razón Social *</label>
                                <input
                                    type="text"
                                    placeholder="EJ. VIVERO CENTRAL"
                                    value={supFormData.name}
                                    onChange={(e) => setSupFormData({ ...supFormData, name: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white uppercase focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-slate-300 uppercase mb-0.5">Teléfono Contacto</label>
                                <input
                                    type="text"
                                    placeholder="11-XXXX-XXXX"
                                    value={supFormData.phone}
                                    onChange={(e) => setSupFormData({ ...supFormData, phone: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-slate-300 uppercase mb-0.5">Dirección / Localidad</label>
                                <input
                                    type="text"
                                    placeholder="DIRECCIÓN"
                                    value={supFormData.address}
                                    onChange={(e) => setSupFormData({ ...supFormData, address: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white uppercase focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1">
                            <button type="button" onClick={() => setShowSupplierPanel(false)} className="px-2.5 py-1 text-[10px] text-slate-300 hover:text-white cursor-pointer">Cancelar</button>
                            <button type="button" onClick={handleSaveSupplierStandalone} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded shadow-2xs cursor-pointer">Guardar</button>
                        </div>
                    </div>
                )}

                {/* FORMULARIO DE EDICIÓN Y ALTA DE PRODUCTO */}
                {showProductForm && (
                    <div ref={formRef} className="bg-white p-3 rounded-md border border-emerald-500 shadow-sm animate-in fade-in space-y-3 shrink-0">
                        <div className="flex justify-between items-center border-b pb-1.5">
                            <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                <span>{id ? '✏️' : '🌱'}</span>
                                {id ? `Editar Producto: ${name}` : 'Nuevo Producto en Catálogo'}
                            </h3>
                            <button type="button" onClick={() => { setShowProductForm(false); resetProductForm(); }} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();

                            if (!categoryId) {
                                setMessage({ type: 'error', text: 'Debe seleccionar una categoría obligatoriamente.' });
                                return;
                            }
                            if (!name.trim()) {
                                setMessage({ type: 'error', text: 'El nombre del producto no puede estar vacío.' });
                                return;
                            }

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
                                taxRate: Number(taxRate) || 0,
                                stock: Number(stock) || 0,
                                minStock: Number(minStock) || 0
                            });

                            if (res.error) {
                                setMessage({ type: 'error', text: res.error });
                            } else {
                                setMessage({ type: 'success', text: `Producto "${name.toUpperCase()}" guardado correctamente.` });
                                setShowProductForm(false);
                                resetProductForm();
                                loadData();
                            }
                        }} className="space-y-2.5">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {/* CATEGORÍA AUTOCOMPLETE CON INLINE */}
                                <div className="relative" ref={catRef}>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase">Categoría *</label>
                                        <button
                                            type="button"
                                            onClick={() => { setShowInlineCat(!showInlineCat); setShowInlineSup(false); }}
                                            className="text-[8px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                        >
                                            + Inline
                                        </button>
                                    </div>

                                    {showInlineCat && (
                                        <CategoryInlineForm
                                            initialName={categorySearch}
                                            onClose={() => setShowInlineCat(false)}
                                            onSuccess={(newCat: Category) => {
                                                if (newCat && newCat.id) {
                                                    setCategories(prev => [...prev, newCat]);
                                                    handleSelectCategory(newCat);
                                                }
                                                setShowInlineCat(false);
                                            }}
                                        />
                                    )}

                                    <input
                                        type="text"
                                        placeholder="Buscar o seleccionar..."
                                        value={categorySearch}
                                        onChange={(e) => {
                                            setCategorySearch(e.target.value);
                                            setShowCatDropdown(true);
                                            if (categoryId) setCategoryId('');
                                        }}
                                        onFocus={() => setShowCatDropdown(true)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold uppercase text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />

                                    {showCatDropdown && (
                                        <div className="absolute z-40 top-full left-0 right-0 bg-white border border-slate-200 shadow-md rounded-b max-h-40 overflow-y-auto mt-0.5">
                                            {filteredCats.length > 0 ? (
                                                filteredCats.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => handleSelectCategory(c)}
                                                        className="px-2.5 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer border-b border-slate-100 last:border-none flex justify-between"
                                                    >
                                                        <span className="font-bold">{c.name}</span>
                                                        <span className="text-[8px] text-slate-400">Margen: {c.defaultMargin}%</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-center text-[10px] text-slate-400">
                                                    No hay resultados. Usá "+ Inline".
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* CÓDIGO PRODUCTO */}
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Código Identificador</label>
                                    <input
                                        type="text"
                                        readOnly
                                        placeholder="Autogenerado..."
                                        value={code}
                                        className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[10px] font-mono font-bold text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* NOMBRE PRODUCTO */}
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Nombre del Producto *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="EJ. FICUS LYRATA 10L"
                                        value={name}
                                        onChange={(e) => setName(e.target.value.toUpperCase())}
                                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-bold uppercase text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                {/* PROVEEDOR AUTOCOMPLETE CON INLINE */}
                                <div className="relative" ref={supRef}>
                                    <div className="flex justify-between items-center mb-0.5">
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase">Proveedor Sugerido</label>
                                        <button
                                            type="button"
                                            onClick={() => { setShowInlineSup(!showInlineSup); setShowInlineCat(false); }}
                                            className="text-[8px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                        >
                                            + Inline
                                        </button>
                                    </div>

                                    {showInlineSup && (
                                        <SupplierInlineForm
                                            initialName={supplierSearch}
                                            onClose={() => setShowInlineSup(false)}
                                            onSuccess={(newSup) => {
                                                setSuppliers(prev => [...prev, newSup]);
                                                setSupplierId(newSup.id);
                                                setSupplierSearch(newSup.name);
                                                setShowInlineSup(false);
                                            }}
                                        />
                                    )}

                                    <input
                                        type="text"
                                        placeholder="Buscar o seleccionar proveedor..."
                                        value={supplierSearch}
                                        onChange={(e) => {
                                            setSupplierSearch(e.target.value);
                                            setShowSupDropdown(true);
                                            if (supplierId) setSupplierId('');
                                        }}
                                        onFocus={() => setShowSupDropdown(true)}
                                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold uppercase text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />

                                    {showSupDropdown && (
                                        <div className="absolute z-40 top-full left-0 right-0 bg-white border border-slate-200 shadow-md rounded-b max-h-40 overflow-y-auto mt-0.5">
                                            {filteredSups.length > 0 ? (
                                                filteredSups.map(s => (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => {
                                                            setSupplierId(s.id);
                                                            setSupplierSearch(s.name);
                                                            setShowSupDropdown(false);
                                                        }}
                                                        className="px-2.5 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer border-b border-slate-100 last:border-none"
                                                    >
                                                        <span className="font-bold">{s.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-center text-[10px] text-slate-400">
                                                    No hay resultados. Usá "+ Inline".
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* COSTO BASE Y OTROS COSTOS */}
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Costo Base ($)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="0"
                                            value={cost}
                                            onChange={(e) => {
                                                const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                setCost(v);
                                                computePrices(Number(v), Number(otherCosts), Number(margin), taxRate);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Flete/Otros ($)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="0"
                                            value={otherCosts}
                                            onChange={(e) => {
                                                const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                setOtherCosts(v);
                                                computePrices(Number(cost), Number(v), Number(margin), taxRate);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* MARGEN E IVA */}
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Margen (%)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="100"
                                            value={margin}
                                            onChange={(e) => {
                                                const v = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                setMargin(v);
                                                computePrices(Number(cost), Number(otherCosts), Number(v), taxRate);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Tasa IVA (%)</label>
                                        <select
                                            value={taxRate}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                setTaxRate(v);
                                                computePrices(Number(cost), Number(otherCosts), Number(margin), v);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value={21}>21%</option>
                                            <option value={10.5}>10.5%</option>
                                            <option value={0}>0%</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
                                {/* PRECIO FINAL CALCULADO */}
                                <div className="flex flex-col justify-center">
                                    <label className="block text-[8px] font-bold text-emerald-900 uppercase">Precio Final (Con IVA)</label>
                                    <div className="text-sm font-black text-emerald-700">
                                        ${priceFinal.toLocaleString('es-AR')}
                                    </div>
                                </div>

                                {/* STOCKS */}
                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Stock Actual</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">Stock Mínimo (Alerta)</label>
                                    <input
                                        type="number"
                                        placeholder="2"
                                        value={minStock}
                                        onChange={(e) => setMinStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1.5 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setShowProductForm(false); resetProductForm(); }}
                                    className="px-3 py-1 border border-slate-300 text-slate-700 text-[10px] font-semibold rounded hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs cursor-pointer"
                                >
                                    {id ? 'Guardar Cambios' : 'Crear Producto'}
                                </button>
                            </div>

                        </form>
                    </div>
                )}

                {/* MODAL AJUSTE RÁPIDO DE STOCK */}
                {showStockModal && selectedProductForStock && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
                        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95">
                            <div className="flex justify-between items-center border-b pb-2">
                                <div>
                                    <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                        ⚡ Ajuste Rápido de Stock
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                        {selectedProductForStock.name} ({selectedProductForStock.code})
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px]">
                                <div>
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Stock Actual</span>
                                    <span className="font-mono font-black text-slate-800 text-sm">{selectedProductForStock.stock} un.</span>
                                </div>
                                <div>
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Stock Resultante</span>
                                    <span className={`font-mono font-black text-sm ${calculatedNewStock <= selectedProductForStock.minStock ? 'text-amber-600' : 'text-emerald-700'}`}>
                                        {calculatedNewStock} un.
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-600 uppercase">Tipo de Movimiento</label>
                                <div className="grid grid-cols-3 gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setStockAdjustmentType('IN')}
                                        className={`py-1.5 px-1 text-[9px] font-extrabold rounded border text-center transition-all cursor-pointer ${stockAdjustmentType === 'IN' ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        🟢 Entrada (+)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStockAdjustmentType('OUT')}
                                        className={`py-1.5 px-1 text-[9px] font-extrabold rounded border text-center transition-all cursor-pointer ${stockAdjustmentType === 'OUT' ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        🔴 Salida (-)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStockAdjustmentType('ADJUSTMENT')}
                                        className={`py-1.5 px-1 text-[9px] font-extrabold rounded border text-center transition-all cursor-pointer ${stockAdjustmentType === 'ADJUSTMENT' ? 'bg-sky-600 text-white border-sky-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        🔵 Ajuste (=)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[8px] font-bold text-slate-600 uppercase mb-0.5">
                                    {stockAdjustmentType === 'IN' && 'Cantidad a ingresar'}
                                    {stockAdjustmentType === 'OUT' && 'Cantidad a descontar'}
                                    {stockAdjustmentType === 'ADJUSTMENT' && 'Nuevo Total en Inventario'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    autoFocus
                                    placeholder="0"
                                    value={stockQuantityInput}
                                    onChange={(e) => setStockQuantityInput(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveStockAdjustment()}
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-1.5 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowStockModal(false)}
                                    className="px-3 py-1 border border-slate-300 text-slate-700 text-[10px] font-semibold rounded hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={stockLoading}
                                    onClick={handleSaveStockAdjustment}
                                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    {stockLoading ? 'Guardando...' : 'Confirmar Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE IMPORTACIÓN */}
                {showImportModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
                        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3 animate-in zoom-in-95">
                            <div className="flex justify-between items-center border-b pb-1.5">
                                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <span>📤</span> Importación Masiva
                                </h3>
                                <button type="button" onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
                            </div>

                            <div className="text-[10px] text-slate-600 space-y-1.5">
                                <p>Seleccioná un archivo en formato <strong>CSV</strong> o <strong>JSON</strong> con el catálogo.</p>
                                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[9px] font-mono leading-tight">
                                    Encabezados CSV:<br />
                                    <code>Codigo, Nombre, Categoria, Proveedor, CostoBase, FleteOtros, Margen, IVA, PrecioFinal, Stock, StockMinimo</code>
                                </div>
                            </div>

                            <div>
                                <input
                                    type="file"
                                    accept=".csv, .json"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="px-3 py-1 border border-slate-300 text-slate-700 text-[10px] font-semibold rounded hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={importing || !importFile}
                                    onClick={handleProcessImport}
                                    className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded shadow-2xs disabled:opacity-50 cursor-pointer"
                                >
                                    {importing ? 'Procesando...' : 'Importar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLA PRINCIPAL Y PESTAÑAS */}
                <div className="bg-white border border-slate-200/80 rounded-md shadow-2xs overflow-hidden flex flex-col flex-1 min-h-[380px]">

                    {/* BARRA DE PESTAÑAS Y BÚSQUEDA */}
                    <div className="p-2 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0">

                        {/* PESTAÑAS */}
                        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded">
                            <button
                                type="button"
                                onClick={() => setTabActiva('catalogo')}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${tabActiva === 'catalogo' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📋 Catálogo ({products.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setTabActiva('alertas')}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${tabActiva === 'alertas' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                ⚠️ Bajo Stock ({products.filter(p => p.stock <= p.minStock).length})
                            </button>
                        </div>

                        {/* BÚSQUEDA Y PAGINACIÓN */}
                        <div className="flex items-center gap-1.5">
                            <div className="relative flex-1 sm:w-56">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 text-[10px]">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Buscar código, nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 pl-7 text-[10px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-2 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-white border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-700 font-semibold focus:outline-none cursor-pointer"
                            >
                                <option value={5}>5 p/p</option>
                                <option value={10}>10 p/p</option>
                                <option value={15}>15 p/p</option>
                                <option value={25}>25 p/p</option>
                                <option value={50}>50 p/p</option>
                            </select>
                        </div>

                    </div>

                    {/* ESTRUCTURA DE LA TABLA */}
                    <div className="flex-1 overflow-x-auto flex flex-col justify-between">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 border-b border-slate-200 text-[9px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                                    <th onClick={() => handleSort('code')} className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Código {sortField === 'code' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th onClick={() => handleSort('name')} className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Producto {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th onClick={() => handleSort('category')} className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Categoría {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th className="py-2 px-2.5">Proveedor</th>
                                    <th className="py-2 px-2.5 text-right">Costo Total</th>
                                    <th className="py-2 px-2.5 text-center">Margen</th>
                                    <th onClick={() => handleSort('price')} className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Precio Final {sortField === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th onClick={() => handleSort('stock')} className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Stock {sortField === 'stock' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th className="py-2 px-2.5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[10px]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                                            Cargando catálogo...
                                        </td>
                                    </tr>
                                ) : paginatedProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                                            {searchTerm ? 'Sin coincidencias con la búsqueda.' : 'No hay productos registrados.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProducts.map((prod) => {
                                        const totalCost = (prod.cost || 0) + (prod.otherCosts || 0);
                                        const isLowStock = prod.stock <= prod.minStock;

                                        return (
                                            <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2 px-2.5 font-mono font-bold text-slate-600">
                                                    {prod.code}
                                                </td>
                                                <td className="py-2 px-2.5 font-bold text-slate-800 uppercase">
                                                    {prod.name}
                                                </td>
                                                <td className="py-2 px-2.5">
                                                    <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                        {prod.category?.name || 'Sin categoría'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2.5 text-slate-500 font-medium">
                                                    {prod.supplier?.name || '-'}
                                                </td>
                                                <td className="py-2 px-2.5 text-right font-semibold text-slate-600 font-mono">
                                                    ${totalCost.toLocaleString('es-AR')}
                                                </td>
                                                <td className="py-2 px-2.5 text-center font-semibold text-slate-500">
                                                    {prod.margin}%
                                                </td>
                                                <td className="py-2 px-2.5 text-right font-black text-emerald-700 font-mono">
                                                    ${prod.price.toLocaleString('es-AR')}
                                                </td>
                                                <td className="py-2 px-2.5 text-center font-mono">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${isLowStock ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {prod.stock} un.
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenStockModal(prod)}
                                                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                                            title="Ajuste Rápido de Stock"
                                                        >
                                                            ⚡
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditProduct(prod)}
                                                            className="p-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                                            title="Editar Producto"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (confirm(`¿Eliminar producto "${prod.name}"?`)) {
                                                                    const res = await deleteProduct(prod.id);
                                                                    if (res.error) {
                                                                        setMessage({ type: 'error', text: res.error });
                                                                    } else {
                                                                        setMessage({ type: 'success', text: 'Producto eliminado.' });
                                                                        loadData();
                                                                    }
                                                                }
                                                            }}
                                                            className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                            title="Eliminar"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN FIJA AL PIE */}
                    <div className="p-2.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-600 shrink-0">
                        <div>
                            Mostrando del <span className="font-bold text-slate-700">{totalItems > 0 ? startIndex + 1 : 0}</span> al <span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-bold text-slate-700">{totalItems}</span> registros
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                            >
                                ◀ Anterior
                            </button>
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-md font-mono font-bold text-emerald-800 text-xs shadow-2xs">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                            >
                                Siguiente ▶
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}