'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
    getCategories,
    createCategory,
    deleteCategory,
    getSuppliers,
    createSupplier,
    getProducts,
    generateNextProductCode,
    saveProduct,
    deleteProduct,
    importProductsBatch,
    ImportRowData
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

    // --- FILTRO MULTI-SELECCIÓN DE CATEGORÍAS ---
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // --- VISIBILIDAD DE FORMULARIOS ---
    const [showProductForm, setShowProductForm] = useState(false);
    const [showStandaloneCatForm, setShowStandaloneCatForm] = useState(false);

    // --- CATEGORÍA (FORMULARIO DEDICADO Y FORMULARIO INLINE) ---
    const [categorySearch, setCategorySearch] = useState('');
    const [showCatDropdown, setShowCatDropdown] = useState(false);
    const [showInlineCatForm, setShowInlineCatForm] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatMargin, setNewCatMargin] = useState<number | ''>(100);

    // --- PROVEEDOR (FORMULARIO) ---
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

    // --- IMPORT / EXPORT & LOGS ---
    const [isImporting, setIsImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // --- BUSCADOR Y PAGINACIÓN ---
    const [globalSearch, setGlobalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const catRef = useRef<HTMLDivElement>(null);
    const supRef = useRef<HTMLDivElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AUTO-OCULTAR MENSAJES LUEGO DE 4 SEGUNDOS
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        loadData();

        const handleClickOutside = (e: MouseEvent) => {
            if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDropdown(false);
            if (supRef.current && !supRef.current.contains(e.target as Node)) setShowSupDropdown(false);
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, sups, prods] = await Promise.all([getCategories(), getSuppliers(), getProducts()]);
            const loadedCats = cats as Category[];
            setCategories(loadedCats);
            setSuppliers(sups as Supplier[]);
            setProducts(prods as Product[]);

            setSelectedCategoryIds(loadedCats.map(c => c.id));
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

    // CREACIÓN DE CATEGORÍA
    const handleCreateCategory = async (nameToCreate: string, marginToCreate: number) => {
        if (!nameToCreate.trim()) return;
        const upper = nameToCreate.trim().toUpperCase();

        const existing = categories.find(c => normalizeText(c.name) === normalizeText(upper));
        if (existing) {
            setMessage({ type: 'error', text: `La categoría "${upper}" ya existe.` });
            return;
        }

        const res = await createCategory(upper, marginToCreate || 100);
        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else if (res.category) {
            setMessage({ type: 'success', text: `Categoría "${res.category.name}" creada exitosamente.` });
            const updated = await getCategories();
            const updatedCats = updated as Category[];
            setCategories(updatedCats);
            setSelectedCategoryIds(prev => [...prev, res.category.id]);

            if (showProductForm) {
                handleSelectCategory(res.category as Category);
            }

            setNewCatName('');
            setNewCatMargin(100);
            setShowStandaloneCatForm(false);
            setShowInlineCatForm(false);
        }
    };

    // ELIMINACIÓN DE CATEGORÍA
    const handleDeleteCategory = async (e: React.MouseEvent, cat: Category) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
            const res = await deleteCategory(cat.id);
            if (res.error) {
                setMessage({ type: 'error', text: res.error });
            } else {
                setMessage({ type: 'success', text: `Categoría "${cat.name}" eliminada.` });
                loadData();
            }
        }
    };

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
        setShowProductForm(true);
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

    const parseCSV = (text: string): ImportRowData[] => {
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const cleanCell = (cell: string) => cell.replace(/^"|"$/g, '').trim();

        const parseLine = (line: string): string[] => {
            const separator = line.includes(';') ? ';' : ',';
            return line.split(separator).map(cleanCell);
        };

        const headers = parseLine(lines[0]);
        const dataRows: ImportRowData[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i]);
            const rowObject: Record<string, string> = {};
            headers.forEach((h, index) => {
                rowObject[h] = values[index] || '';
            });
            dataRows.push(rowObject as unknown as ImportRowData);
        }

        return dataRows;
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const rows = parseCSV(text);

                if (rows.length === 0) {
                    setMessage({ type: 'error', text: 'El archivo CSV está vacío o no tiene el formato correcto.' });
                    setIsImporting(false);
                    return;
                }

                const res = await importProductsBatch(rows);
                if (res.success) {
                    setMessage({ type: 'success', text: `Se importaron ${res.importedCount} productos correctamente.` });
                    loadData();
                } else {
                    setMessage({ type: 'error', text: 'Error procesando la importación.' });
                }
            } catch (err) {
                console.error('Error al leer CSV:', err);
                setMessage({ type: 'error', text: 'No se pudo leer el archivo seleccionado.' });
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file, 'UTF-8');
    };

    const handleDownloadTemplate = () => {
        const csvContent = [
            'Nombre,Categoria,Proveedor,CostoBase,OtrosCostos,StockInicial,AlertaStockBajo,StockMinimo',
            'Sansevieria Trifasciata,PLANTAS,Vivero Central,1200,100,10,SI,3'
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla_importacion.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportCSV = () => {
        if (products.length === 0) return alert('No hay productos para exportar.');
        const headers = ['Codigo', 'Nombre', 'Categoria', 'Proveedor', 'CostoBase', 'OtrosCostos', 'CostoTotal', 'MargenPct', 'PrecioFinal', 'Stock', 'MinStock'];
        const rows = products.map(p => [
            p.code, p.name, p.category?.name || '', p.supplier?.name || '',
            p.cost, p.otherCosts || 0, p.cost + (p.otherCosts || 0), p.margin, p.price, p.stock, p.minStock
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `catalogo_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredCats = categories.filter(c => normalizeText(c.name).includes(normalizeText(categorySearch)));
    const filteredSups = suppliers.filter(s => normalizeText(s.name).includes(normalizeText(supplierSearch)));

    const isAllCategoriesSelected = categories.length > 0 && selectedCategoryIds.length === categories.length;

    const toggleSelectAllCategories = () => {
        if (isAllCategoriesSelected) {
            setSelectedCategoryIds([]);
        } else {
            setSelectedCategoryIds(categories.map(c => c.id));
        }
    };

    const toggleCategorySelection = (catId: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const getFilterButtonLabel = () => {
        if (categories.length === 0) return 'Cargando...';
        if (isAllCategoriesSelected || selectedCategoryIds.length === categories.length) return '🪴 Todas las Categorías';
        if (selectedCategoryIds.length === 0) return '⚠️ Ninguna seleccionada';
        if (selectedCategoryIds.length === 1) {
            const cat = categories.find(c => c.id === selectedCategoryIds[0]);
            return `🌿 ${cat?.name || '1 seleccionada'}`;
        }
        return `📊 ${selectedCategoryIds.length} Categorías`;
    };

    const getProductCountByCat = (catId: string) => {
        return products.filter(p => p.categoryId === catId).length;
    };

    const filteredProducts = products.filter((p) => {
        if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(p.categoryId)) {
            return false;
        }
        if (selectedCategoryIds.length === 0) {
            return false;
        }

        if (!globalSearch) return true;
        const term = normalizeText(globalSearch);
        return (
            normalizeText(p.name).includes(term) ||
            normalizeText(p.code).includes(term) ||
            normalizeText(p.category?.name || '').includes(term) ||
            normalizeText(p.supplier?.name || '').includes(term)
        );
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [globalSearch, selectedCategoryIds]);

    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        /* CONTENEDOR FIJO SIN SCROLL DE PANTALLA COMPLETA */
        <div className="h-screen max-h-screen overflow-hidden bg-slate-50 p-3 md:p-5 flex flex-col space-y-3 max-w-7xl mx-auto text-slate-800">

            {/* ENCABEZADO Y BOTONES SUPERIORES */}
            <div className="flex-none flex flex-col md:flex-row md:items-center md:justify-between border-b pb-3 border-slate-200 gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Catálogo de Productos</h1>
                    <p className="text-xs text-slate-500">Gestión integral de precios, costos e inventario.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowStandaloneCatForm(!showStandaloneCatForm)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-all flex items-center gap-1 shadow-sm"
                    >
                        <span>{showStandaloneCatForm ? '✕ Cancelar Cat.' : '🏷️ + Nueva Categoría'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (showProductForm && id) resetForm();
                            setShowProductForm(!showProductForm);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${showProductForm
                                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                    >
                        <span>{showProductForm ? '✕ Cerrar Formulario' : '🌱 + Nuevo Producto'}</span>
                    </button>

                    <button type="button" onClick={handleDownloadTemplate} className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-300 transition-colors">
                        📄 Plantilla
                    </button>
                    <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="hidden" />
                    <button type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
                        {isImporting ? '⏳...' : '📥 Importar'}
                    </button>
                    <button type="button" onClick={handleExportCSV} className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors">
                        📤 Exportar
                    </button>
                </div>
            </div>

            {/* NOTIFICACIÓN CON TEMPORIZADOR AUTOMÁTICO */}
            {message && (
                <div className={`flex-none p-2.5 rounded-lg text-xs font-medium flex justify-between items-center animate-in fade-in transition-all ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-400 hover:text-slate-600 ml-2">✕</button>
                </div>
            )}

            {/* FORMULARIO STANDALONE DE CATEGORÍAS */}
            {showStandaloneCatForm && (
                <div className="flex-none bg-slate-900 text-white rounded-xl shadow-lg p-3 space-y-3 border border-slate-700">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-1.5">
                            🏷️ Alta Directa de Categoría
                        </h2>
                        <button type="button" onClick={() => setShowStandaloneCatForm(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Nombre de la Categoría *</label>
                            <input
                                type="text"
                                placeholder="ej. MACETAS PLÁSTICAS, FERTILIZANTES..."
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value.toUpperCase())}
                                className="w-full px-3 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs uppercase font-bold focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Margen por Defecto (%)</label>
                            <input
                                type="number"
                                placeholder="100"
                                value={newCatMargin}
                                onChange={(e) => setNewCatMargin(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => setShowStandaloneCatForm(false)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCreateCategory(newCatName, Number(newCatMargin) || 100)}
                            className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow"
                        >
                            💾 Guardar Categoría
                        </button>
                    </div>
                </div>
            )}

            {/* FORMULARIO DE PRODUCTO */}
            {showProductForm && (
                <div className="flex-none bg-white rounded-xl shadow-md border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b pb-1.5">
                        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                            {id ? '✏️ Editar Producto' : '🌱 Registrar Nuevo Producto'}
                        </h2>
                        {id && (
                            <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Modo Edición
                            </span>
                        )}
                    </div>

                    <form action={async (formData) => {
                        const res = await saveProduct(formData);
                        if (res.error) setMessage({ type: 'error', text: res.error });
                        else {
                            setMessage({ type: 'success', text: 'Producto guardado con éxito.' });
                            resetForm();
                            setShowProductForm(false);
                            loadData();
                        }
                    }} className="space-y-2">

                        <input type="hidden" name="id" value={id || ''} />
                        <input type="hidden" name="categoryId" value={categoryId} />
                        <input type="hidden" name="supplierId" value={supplierId} />
                        <input type="hidden" name="price" value={priceFinal} />
                        <input type="hidden" name="trackStock" value={trackStock ? 'true' : 'false'} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {/* CATEGORÍA EN FORMULARIO */}
                            <div className="relative" ref={catRef}>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Categoría *</label>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={categorySearch}
                                    onFocus={() => setShowCatDropdown(true)}
                                    onChange={(e) => { setCategorySearch(e.target.value.toUpperCase()); setShowCatDropdown(true); if (categoryId) setCategoryId(''); }}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-emerald-500 uppercase font-semibold text-slate-700"
                                />
                                {showCatDropdown && (
                                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                        {filteredCats.map((cat) => (
                                            <div key={cat.id} className="w-full flex items-center justify-between px-2.5 py-1 text-xs hover:bg-emerald-50">
                                                <button type="button" onClick={() => handleSelectCategory(cat)} className="flex-1 text-left font-semibold text-slate-700">
                                                    {cat.name}
                                                </button>
                                                <button type="button" onClick={(e) => handleDeleteCategory(e, cat)} className="p-0.5 text-slate-400 hover:text-rose-600" title="Eliminar Categoría">
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => { setNewCatName(categorySearch); setShowInlineCatForm(true); setShowCatDropdown(false); }} className="w-full text-left px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                                            ➕ Crear: "{categorySearch}"
                                        </button>
                                    </div>
                                )}

                                {showInlineCatForm && (
                                    <div className="absolute z-40 left-0 right-0 mt-1 bg-slate-800 text-white p-2.5 rounded-lg shadow-xl space-y-2">
                                        <p className="text-[10px] font-bold text-slate-300">NUEVA CATEGORÍA</p>
                                        <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value.toUpperCase())} placeholder="Nombre" className="w-full px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600 uppercase" />
                                        <input type="number" value={newCatMargin} onChange={(e) => setNewCatMargin(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Margen %" className="w-full px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600" />
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => setShowInlineCatForm(false)} className="text-[10px] px-2 py-0.5 bg-slate-600 rounded">Cancelar</button>
                                            <button type="button" onClick={() => handleCreateCategory(newCatName, Number(newCatMargin) || 100)} className="text-[10px] px-2 py-0.5 bg-emerald-600 font-bold rounded">Guardar</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PROVEEDOR */}
                            <div className="relative" ref={supRef}>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Proveedor</label>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={supplierSearch}
                                    onFocus={() => setShowSupDropdown(true)}
                                    onChange={(e) => { setSupplierSearch(e.target.value.toUpperCase()); setShowSupDropdown(true); if (supplierId) setSupplierId(''); }}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-emerald-500 uppercase font-semibold text-slate-700"
                                />
                                {showSupDropdown && (
                                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                        {filteredSups.map((sup) => (
                                            <button key={sup.id} type="button" onClick={() => handleSelectSupplier(sup)} className="w-full text-left px-2.5 py-1 text-xs hover:bg-emerald-50">
                                                <span className="font-semibold text-slate-700">{sup.name}</span>
                                            </button>
                                        ))}
                                        <button type="button" onClick={() => { setNewSupName(supplierSearch); setShowInlineSupForm(true); setShowSupDropdown(false); }} className="w-full text-left px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                                            ➕ Crear: "{supplierSearch}"
                                        </button>
                                    </div>
                                )}

                                {showInlineSupForm && (
                                    <div className="absolute z-40 left-0 right-0 mt-1 bg-slate-800 text-white p-2.5 rounded-lg shadow-xl space-y-2">
                                        <p className="text-[10px] font-bold text-slate-300">NUEVO PROVEEDOR</p>
                                        <input type="text" value={newSupName} onChange={(e) => setNewSupName(e.target.value.toUpperCase())} placeholder="Nombre" className="w-full px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600 uppercase" />
                                        <input type="text" value={newSupPhone} onChange={(e) => setNewSupPhone(e.target.value)} placeholder="Teléfono" className="w-full px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600" />
                                        <div className="flex gap-2 justify-end">
                                            <button type="button" onClick={() => setShowInlineSupForm(false)} className="text-[10px] px-2 py-0.5 bg-slate-600 rounded">Cancelar</button>
                                            <button type="button" onClick={handleCreateSupplierInline} className="text-[10px] px-2 py-0.5 bg-emerald-600 font-bold rounded">Guardar</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Código</label>
                                <input type="text" name="code" readOnly value={code} placeholder="Auto..." className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-slate-100 font-mono font-bold text-slate-600 cursor-not-allowed" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Nombre Producto *</label>
                                <input type="text" name="name" required value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="ej. FICUS LYRATA" className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs uppercase font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 border-t border-slate-100">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Costo Base ($)</label>
                                <input type="number" name="cost" required value={cost} onChange={(e) => { setCost(Math.round(parseFloat(e.target.value) || 0)); computePrices(Math.round(parseFloat(e.target.value) || 0), Number(otherCosts), Number(margin), taxRate); }} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Flete/Otros ($)</label>
                                <input type="number" name="otherCosts" value={otherCosts} onChange={(e) => { setOtherCosts(Math.round(parseFloat(e.target.value) || 0)); computePrices(Number(cost), Math.round(parseFloat(e.target.value) || 0), Number(margin), taxRate); }} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Margen (%)</label>
                                <input type="number" name="margin" step="0.1" value={margin} onChange={(e) => { setMargin(parseFloat(e.target.value) || 0); computePrices(Number(cost), Number(otherCosts), parseFloat(e.target.value) || 0, taxRate); }} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">IVA (%)</label>
                                <select name="taxRate" value={taxRate} onChange={(e) => { setTaxRate(parseFloat(e.target.value)); computePrices(Number(cost), Number(otherCosts), Number(margin), parseFloat(e.target.value)); }} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500">
                                    <option value={0}>0 %</option>
                                    <option value={10.5}>10.5 %</option>
                                    <option value={21}>21 %</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Stock Inicial</label>
                                <input type="number" name="stock" value={stock} onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5 uppercase">Alerta Mín.</label>
                                <input type="number" name="minStock" value={minStock} onChange={(e) => setMinStock(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-emerald-500" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Sin IVA:</span>
                                    <span className="text-xs font-bold text-slate-700">${priceNoTax.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="h-6 w-px bg-emerald-200"></div>
                                <div>
                                    <span className="block text-[9px] font-bold text-emerald-800 uppercase">Precio Final Venta:</span>
                                    <span className="text-base font-extrabold text-emerald-900">${priceFinal.toLocaleString('es-AR')}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button type="button" onClick={resetForm} className="px-2.5 py-1 border border-slate-300 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-100">
                                    Limpiar
                                </button>
                                <button type="submit" className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 shadow-sm">
                                    {id ? '💾 Actualizar' : '➕ Guardar'}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            )}

            {/* BARRA DE FILTROS Y BÚSQUEDA */}
            <div className="flex-none bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex items-center justify-between gap-2 relative">

                {/* FILTRO DE CATEGORÍAS (CON BORRADO) */}
                <div className="flex items-center gap-2" ref={filterDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                        <span>{getFilterButtonLabel()}</span>
                        <span className="text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-600 font-extrabold">
                            {filteredProducts.length}
                        </span>
                        <span className="text-[9px] text-slate-400">{showFilterDropdown ? '▲' : '▼'}</span>
                    </button>

                    {showFilterDropdown && (
                        <div className="absolute top-full left-2 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 space-y-1.5">
                            <div className="flex items-center justify-between border-b pb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Categorías</span>
                                <span className="text-[9px] text-slate-400">Filtrado y gestión</span>
                            </div>

                            <label className="flex items-center gap-2 p-1 hover:bg-emerald-50 rounded cursor-pointer border-b border-slate-100">
                                <input
                                    type="checkbox"
                                    checked={isAllCategoriesSelected}
                                    onChange={toggleSelectAllCategories}
                                    className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-800">
                                    {isAllCategoriesSelected ? 'Desmarcar todas' : 'Marcar todas'}
                                </span>
                            </label>

                            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                                {categories.map((cat) => {
                                    const isChecked = selectedCategoryIds.includes(cat.id);
                                    const count = getProductCountByCat(cat.id);

                                    return (
                                        <div
                                            key={cat.id}
                                            className="flex items-center justify-between p-1 hover:bg-slate-50 rounded text-xs group"
                                        >
                                            <label className="flex items-center gap-2 cursor-pointer flex-1 truncate mr-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleCategorySelection(cat.id)}
                                                    className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                                />
                                                <span className={`font-semibold text-[11px] truncate ${isChecked ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {cat.name}
                                                </span>
                                            </label>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500">
                                                    {count}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteCategory(e, cat)}
                                                    className="opacity-0 group-hover:opacity-100 hover:text-rose-600 p-0.5 transition-opacity text-[11px]"
                                                    title="Eliminar Categoría"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                                <span>{selectedCategoryIds.length}/{categories.length} elegidas</span>
                                <button
                                    type="button"
                                    onClick={() => setShowFilterDropdown(false)}
                                    className="text-emerald-700 font-bold hover:underline text-xs"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}

                    {!isAllCategoriesSelected && (
                        <button
                            type="button"
                            onClick={() => setSelectedCategoryIds(categories.map(c => c.id))}
                            className="text-[10px] font-semibold text-emerald-700 hover:underline"
                        >
                            Restablecer
                        </button>
                    )}
                </div>

                <div className="w-48 sm:w-64 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar producto, código..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="w-full pl-7 pr-6 py-1 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                    {globalSearch && (
                        <button onClick={() => setGlobalSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                    )}
                </div>
            </div>

            {/* CONTENEDOR FLEXIBLE DE TABLA: OCUPA EL RESTO DE LA PANTALLA */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">Cargando productos...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        <span className="text-2xl mb-1">🪴</span>
                        <h4 className="text-slate-700 font-bold text-xs mb-0.5">Sin coincidencia de productos</h4>
                        <p className="text-slate-400 text-[11px]">Probá seleccionar más categorías o borrar la búsqueda.</p>
                    </div>
                ) : (
                    <>
                        {/* CONTENEDOR EXCLUSIVO DE SCROLL PARA LOS REGISTROS */}
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-xs text-slate-600 border-collapse">
                                <thead className="text-slate-700 text-[10px] uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-100 z-10 font-bold shadow-sm">
                                    <tr>
                                        <th className="px-3 py-2 bg-slate-100">Código</th>
                                        <th className="px-3 py-2 bg-slate-100">Producto</th>
                                        <th className="px-3 py-2 bg-slate-100">Proveedor</th>
                                        <th className="px-3 py-2 text-right bg-slate-100">Costo Total</th>
                                        <th className="px-3 py-2 text-right bg-slate-100">Margen</th>
                                        <th className="px-3 py-2 text-right bg-slate-100">Precio Final</th>
                                        <th className="px-3 py-2 text-center bg-slate-100">Stock</th>
                                        <th className="px-3 py-2 text-center bg-slate-100">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                                    {paginatedProducts.map((p) => {
                                        const isLowStock = p.trackStock && p.stock <= p.minStock;
                                        const costoTotalCalculado = p.cost + (p.otherCosts || 0);

                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-3 py-1.5 font-mono font-bold text-slate-700 whitespace-nowrap">{p.code}</td>
                                                <td className="px-3 py-1.5">
                                                    <div className="font-bold text-slate-800 uppercase leading-tight">{p.name}</div>
                                                    <div className="text-[9px] font-extrabold text-slate-400">{p.category?.name || 'SIN CATEGORÍA'}</div>
                                                </td>
                                                <td className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 truncate max-w-[120px]" title={p.supplier?.name || ''}>
                                                    {p.supplier ? p.supplier.name : '-'}
                                                </td>

                                                <td className="px-3 py-1.5 text-right">
                                                    <div className="font-bold text-slate-700">${costoTotalCalculado.toLocaleString('es-AR')}</div>
                                                </td>

                                                <td className="px-3 py-1.5 text-right font-semibold text-slate-600">{p.margin ?? 100}%</td>
                                                <td className="px-3 py-1.5 text-right font-extrabold text-emerald-800 text-xs">${p.price.toLocaleString('es-AR')}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${isLowStock ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                                        {isLowStock && <span>⚠️</span>}
                                                        {p.stock} u.
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => handleEdit(p)} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors" title="Editar">✏️</button>
                                                        <button onClick={() => handleDelete(p.id)} className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition-colors" title="Borrar">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* PIE DE PAGINACIÓN TOTALMENTE FIJO ABAJO */}
                        <div className="flex-none p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                            <div className="text-slate-500 font-medium text-[10px]">
                                Mostrando <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> de <span className="font-bold text-slate-700">{filteredProducts.length}</span>
                            </div>

                            <div className="flex gap-1.5">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 font-semibold text-[10px]"
                                >
                                    Anterior
                                </button>
                                <div className="flex items-center px-1.5 font-bold text-slate-700 text-[10px]">
                                    {currentPage} / {totalPages || 1}
                                </div>
                                <button
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 font-semibold text-[10px]"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}