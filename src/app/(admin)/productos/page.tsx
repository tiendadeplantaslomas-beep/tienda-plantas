'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    getCategories,
    createCategory,
    getSuppliers,
    createSupplier,
    getProducts,
    generateNextProductCode,
    saveProduct,
    deleteProduct,
    importProductsBatch
} from '@/actions/product-actions';

// ----------------------------------------------------------------------
// TIPOS DE DATOS
// ----------------------------------------------------------------------

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
    stock: number;
    minStock: number;
}

type SortField = 'name' | 'category' | 'code' | 'price' | 'stock';
type SortOrder = 'asc' | 'desc';

// ----------------------------------------------------------------------
// COMPONENTES AUXILIARES INLINE (Categoría / Proveedor)
// ----------------------------------------------------------------------

function CategoryInlineForm({ initialName = '', onClose, onSuccess }: { initialName?: string; onClose: () => void; onSuccess: (category: Category) => void; }) {
    const [name, setName] = useState(initialName);
    const [margin, setMargin] = useState<number | ''>(100);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) {
            setError('El nombre de la categoría es obligatorio.');
            return;
        }

        try {
            const res = await createCategory(cleanName, margin === '' ? 100 : Number(margin));
            if (res.error) setError(res.error);
            else if (res.category) onSuccess(res.category as Category);
        } catch {
            setError('Error al guardar.');
        }
    };

    return (
        <div className="absolute top-7 left-0 w-80 z-50 bg-emerald-50 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 space-y-2 shadow-xl animate-in fade-in">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 uppercase">
                <span>🏷️ Nueva Categoría</span>
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
                    type="number"
                    placeholder="%"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-14 bg-white border border-emerald-300 rounded px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold rounded text-white shadow-sm shrink-0">
                    ✓
                </button>
            </div>
            {error && <p className="text-[10px] text-rose-600 font-bold">⚠️ {error}</p>}
        </div>
    );
}

function SupplierInlineForm({ initialName = '', onClose, onSuccess }: { initialName?: string; onClose: () => void; onSuccess: (supplier: Supplier) => void; }) {
    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) {
            setError('El nombre es obligatorio.');
            return;
        }

        try {
            const res = await createSupplier({ name: cleanName, phone });
            if (res.error) setError(res.error);
            else if (res.supplier) onSuccess(res.supplier as Supplier);
        } catch {
            setError('Error al guardar.');
        }
    };

    return (
        <div className="absolute top-7 left-0 w-80 z-50 bg-emerald-50 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 space-y-2 shadow-xl animate-in fade-in">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 uppercase">
                <span>🚚 Nuevo Proveedor</span>
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [showProductForm, setShowProductForm] = useState(false);
    const [showCategoryPanel, setShowCategoryPanel] = useState(false);
    const [showSupplierPanel, setShowSupplierPanel] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const [showInlineCat, setShowInlineCat] = useState(false);
    const [showInlineSup, setShowInlineSup] = useState(false);

    // Formulario standalone Categoría / Proveedor
    const [catName, setCatName] = useState('');
    const [catMargin, setCatMargin] = useState<number | ''>(100);
    const [catPanelError, setCatPanelError] = useState<string | null>(null);

    const [supFormData, setSupFormData] = useState({ name: '', phone: '', address: '' });
    const [supPanelError, setSupPanelError] = useState<string | null>(null);

    // Formulario de producto
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

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ESTADOS DE ORDENAMIENTO
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // NUEVOS ESTADOS: BUSCADOR PREDICTIVO Y PAGINACIÓN
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Importación / Exportación
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const catRef = useRef<HTMLDivElement>(null);
    const supRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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
            const timer = setTimeout(() => {
                setMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Resetear la página al filtrar o cambiar items por página
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    const resetPanels = () => {
        setCatName('');
        setCatMargin(100);
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

    // MEMOIZED: FILTRADO + ORDENAMIENTO (Optimizado para 300+ items)
    const filteredAndSortedProducts = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();

        return products
            .filter(p => {
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
    }, [products, searchTerm, sortField, sortOrder]);

    // LÓGICA DE PAGINACIÓN
    const totalItems = filteredAndSortedProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);

    const filteredCats = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
    const filteredSups = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

    return (
        <div className="h-screen flex flex-col bg-slate-100/60 p-4 md:p-6 max-w-7xl mx-auto font-sans text-slate-800 overflow-hidden">

            {/* ENCABEZADO Y BOTONES DE ACCIÓN (Fixed Top) */}
            <header className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">Gestión de Catálogo</h1>
                    <p className="text-[11px] text-slate-500">Administrá productos, precios, importaciones y catálogo.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                        title="Exportar a CSV"
                    >
                        📥 Exportar
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                    >
                        📤 Importar
                    </button>

                    <div className="h-6 w-px bg-slate-300 mx-0.5 hidden sm:block"></div>

                    <button
                        type="button"
                        onClick={() => { resetPanels(); setShowCategoryPanel(!showCategoryPanel); setShowSupplierPanel(false); }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${showCategoryPanel ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {showCategoryPanel ? '✕ Cerrar' : '🏷️ Nueva Categoría'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { resetPanels(); setShowSupplierPanel(!showSupplierPanel); setShowCategoryPanel(false); }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${showSupplierPanel ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {showSupplierPanel ? '✕ Cerrar' : '🚚 Nuevo Proveedor'}
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
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                        {showProductForm ? '✕ Cerrar' : '🌱 Nuevo Producto'}
                    </button>
                </div>
            </header>

            {/* NOTIFICACIONES */}
            {message && (
                <div className={`flex-shrink-0 mt-3 p-3 rounded-lg text-xs font-medium flex justify-between items-center transition-all ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-sm'
                    : 'bg-rose-50 text-rose-900 border border-rose-300 shadow-sm'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <span className="font-semibold">{message.text}</span>
                    </div>
                    <button type="button" onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1">✕</button>
                </div>
            )}

            {/* MODAL DE IMPORTACIÓN */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">📤 Importar Catálogo</h3>
                            <button type="button" onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                        </div>

                        <p className="text-xs text-slate-500">
                            Seleccioná un archivo en formato <strong className="text-slate-700">.CSV</strong> o <strong className="text-slate-700">.JSON</strong> para cargar o actualizar productos masivamente.
                        </p>

                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors">
                            <input
                                type="file"
                                accept=".csv, .json"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="file-import-input"
                            />
                            <label htmlFor="file-import-input" className="cursor-pointer block">
                                <span className="text-2xl block mb-1">📁</span>
                                <span className="text-xs font-semibold text-slate-700 block">
                                    {importFile ? importFile.name : 'Hacé clic para seleccionar archivo'}
                                </span>
                                <span className="text-[10px] text-slate-400">Soporta .CSV y .JSON</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowImportModal(false)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!importFile || importing}
                                onClick={handleProcessImport}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                            >
                                {importing ? 'Procesando...' : 'Iniciar Importación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PANEL STANDALONE CATEGORÍA */}
            {showCategoryPanel && (
                <div className="flex-shrink-0 mt-3 bg-emerald-50/90 text-emerald-950 p-3.5 rounded-xl border border-emerald-200 shadow-sm max-w-md animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-emerald-200/80 pb-2 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            🏷️ Alta de Categoría
                        </span>
                        <button type="button" onClick={() => setShowCategoryPanel(false)} className="text-emerald-700 hover:text-emerald-950 text-xs font-bold">✕</button>
                    </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setCatPanelError(null);

                        const form = e.currentTarget;
                        const data = new FormData(form);
                        const inputName = (data.get('categoryName') as string || '').trim().toUpperCase();
                        const inputMargin = parseFloat(data.get('categoryMargin') as string) || 100;

                        if (!inputName) {
                            setCatPanelError('El nombre de la categoría es obligatorio.');
                            return;
                        }

                        try {
                            const res = await createCategory(inputName, inputMargin);
                            if (res.error) {
                                setCatPanelError(res.error);
                            } else if (res.category) {
                                setMessage({ type: 'success', text: `Categoría "${res.category.name}" creada exitosamente.` });
                                setCategories(prev => [...prev, res.category as Category]);
                                setShowCategoryPanel(false);
                            }
                        } catch {
                            setCatPanelError('Error al guardar la categoría.');
                        }
                    }} className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    name="categoryName"
                                    autoFocus
                                    placeholder="EJ: PLANTAS, MACETAS"
                                    className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="w-20">
                                <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Margen %</label>
                                <input
                                    type="number"
                                    name="categoryMargin"
                                    defaultValue={100}
                                    placeholder="100"
                                    className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="pt-5">
                                <button
                                    type="submit"
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>

                        {catPanelError && (
                            <p className="text-[10px] font-bold text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                                ⚠️ {catPanelError}
                            </p>
                        )}
                    </form>
                </div>
            )}

            {/* PANEL STANDALONE PROVEEDOR */}
            {showSupplierPanel && (
                <div className="flex-shrink-0 mt-3 bg-emerald-50/90 text-emerald-950 p-3.5 rounded-xl border border-emerald-200 shadow-sm max-w-lg animate-in fade-in">
                    <div className="flex justify-between items-center border-b border-emerald-200/80 pb-2 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            🚚 Alta de Proveedor
                        </span>
                        <button type="button" onClick={() => { resetPanels(); setShowSupplierPanel(false); }} className="text-emerald-700 hover:text-emerald-950 text-xs font-bold">✕</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-1">
                            <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Nombre *</label>
                            <input
                                type="text"
                                autoFocus
                                placeholder="PROVEEDOR"
                                value={supFormData.name}
                                onChange={(e) => setSupFormData({ ...supFormData, name: e.target.value.toUpperCase() })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveSupplierStandalone()}
                                className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Teléfono</label>
                            <input
                                type="text"
                                placeholder="TELÉFONO"
                                value={supFormData.phone}
                                onChange={(e) => setSupFormData({ ...supFormData, phone: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveSupplierStandalone()}
                                className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Dirección</label>
                            <input
                                type="text"
                                placeholder="DIRECCIÓN"
                                value={supFormData.address}
                                onChange={(e) => setSupFormData({ ...supFormData, address: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveSupplierStandalone()}
                                className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {supPanelError && (
                        <p className="mt-2 text-[10px] font-bold text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                            ⚠️ {supPanelError}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-3">
                        <button type="button" onClick={() => { resetPanels(); setShowSupplierPanel(false); }} className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSaveSupplierStandalone} className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm">
                            Guardar Proveedor
                        </button>
                    </div>
                </div>
            )}

            {/* FORMULARIO DE PRODUCTO (NUEVO / EDICIÓN) */}
            {showProductForm && (
                <div ref={formRef} className="flex-shrink-0 mt-3 bg-white p-4 max-h-[45vh] overflow-y-auto rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            {id ? '✏️ Editar Producto' : '🌱 Alta de Producto'}
                        </h2>
                        {id && (
                            <button
                                type="button"
                                onClick={resetProductForm}
                                className="text-[10px] font-semibold text-emerald-700 hover:underline"
                            >
                                ➕ Cambiar a Alta
                            </button>
                        )}
                    </div>

                    <form action={async (formData) => {
                        const res = await saveProduct(formData);
                        if (res.error) {
                            setMessage({ type: 'error', text: res.error });
                        } else {
                            setMessage({ type: 'success', text: id ? 'Producto actualizado correctamente.' : 'Producto guardado con éxito.' });
                            setShowProductForm(false);
                            resetProductForm();
                            loadData();
                        }
                    }} className="space-y-3">
                        <input type="hidden" name="id" value={id || ''} />
                        <input type="hidden" name="categoryId" value={categoryId} />
                        <input type="hidden" name="supplierId" value={supplierId} />
                        <input type="hidden" name="price" value={priceFinal} />

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="relative md:col-span-1" ref={catRef}>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoría *</label>
                                {!showInlineCat ? (
                                    <>
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
                                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />

                                        {showCatDropdown && (
                                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                {filteredCats.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => handleSelectCategory(cat)}
                                                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-emerald-50 text-slate-700 flex justify-between"
                                                    >
                                                        <span>{cat.name}</span>
                                                        <span className="text-[10px] text-slate-400">({cat.defaultMargin}%)</span>
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => { setShowInlineCat(true); setShowCatDropdown(false); }}
                                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                                >
                                                    ➕ Crear categoría inline
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <CategoryInlineForm
                                        initialName={categorySearch}
                                        onClose={() => setShowInlineCat(false)}
                                        onSuccess={(newCat) => {
                                            setCategories(prev => [...prev, newCat]);
                                            handleSelectCategory(newCat);
                                            setShowInlineCat(false);
                                        }}
                                    />
                                )}
                            </div>

                            <div className="relative md:col-span-1" ref={supRef}>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Proveedor</label>
                                {!showInlineSup ? (
                                    <>
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
                                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />

                                        {showSupDropdown && (
                                            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                {filteredSups.map((sup) => (
                                                    <button
                                                        key={sup.id}
                                                        type="button"
                                                        onClick={() => { setSupplierId(sup.id); setSupplierSearch(sup.name); setShowSupDropdown(false); }}
                                                        className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-emerald-50 text-slate-700"
                                                    >
                                                        {sup.name}
                                                    </button>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() => { setShowInlineSup(true); setShowSupDropdown(false); }}
                                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                                >
                                                    ➕ Crear proveedor inline
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
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
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código</label>
                                <input type="text" name="code" readOnly value={code} placeholder="Autogenerado" className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-400 cursor-not-allowed" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Nombre Producto *</label>
                                <input type="text" name="name" required value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="EJ: FICUS LYRATA" className="w-full border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Costo Base ($)</label>
                                <input type="number" name="cost" required value={cost} onChange={(e) => { setCost(parseFloat(e.target.value) || 0); computePrices(parseFloat(e.target.value) || 0, Number(otherCosts), Number(margin), taxRate); }} className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Flete/Otros ($)</label>
                                <input type="number" name="otherCosts" value={otherCosts} onChange={(e) => { setOtherCosts(parseFloat(e.target.value) || 0); computePrices(Number(cost), parseFloat(e.target.value) || 0, Number(margin), taxRate); }} className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Margen (%)</label>
                                <input type="number" name="margin" step="0.1" value={margin} onChange={(e) => { setMargin(parseFloat(e.target.value) || 0); computePrices(Number(cost), Number(otherCosts), parseFloat(e.target.value) || 0, taxRate); }} className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IVA (%)</label>
                                <select name="taxRate" value={taxRate} onChange={(e) => { setTaxRate(parseFloat(e.target.value)); computePrices(Number(cost), Number(otherCosts), Number(margin), parseFloat(e.target.value)); }} className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold">
                                    <option value={0}>0 %</option>
                                    <option value={10.5}>10.5 %</option>
                                    <option value={21}>21 %</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Inicial</label>
                                <input type="number" name="stock" value={stock} onChange={(e) => setStock(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alerta Mín.</label>
                                <input type="number" name="minStock" value={minStock} onChange={(e) => setMinStock(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold" />
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-lg">
                            <div>
                                <span className="block text-[10px] font-medium text-slate-400 uppercase">Precio Final Venta</span>
                                <span className="text-lg font-bold text-emerald-400">${priceFinal.toLocaleString('es-AR')}</span>
                            </div>
                            <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase transition-colors">
                                {id ? '💾 Actualizar Producto' : '💾 Guardar Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CONTENEDOR PRINCIPAL: BUSCADOR + TABLA + PAGINADOR */}
            <div className="flex-1 mt-3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">

                {/* BUSCADOR PREDICTIVO BARRA SUPERIOR */}
                <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                    <div className="relative w-full sm:w-80">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por producto, código o categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 hover:text-slate-700 font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
                        <span>Filtrados: <strong className="text-slate-800">{totalItems}</strong> de {products.length}</span>
                    </div>
                </div>

                {/* TABLA CON SCROLL INTERNO */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm select-none">
                            <tr>
                                <th className="p-3 cursor-pointer hover:text-slate-800 transition-colors" onClick={() => handleSort('code')}>
                                    <div className="flex items-center gap-1">
                                        <span>Código</span>
                                        <span className="text-[10px] font-normal text-slate-400">
                                            {sortField === 'code' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>

                                <th className="p-3 cursor-pointer hover:text-slate-800 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        <span>Producto</span>
                                        <span className="text-[10px] font-normal text-slate-400">
                                            {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>

                                <th className="p-3 cursor-pointer hover:text-slate-800 transition-colors" onClick={() => handleSort('category')}>
                                    <div className="flex items-center gap-1">
                                        <span>Categoría</span>
                                        <span className="text-[10px] font-normal text-slate-400">
                                            {sortField === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>

                                <th className="p-3 text-right cursor-pointer hover:text-slate-800 transition-colors" onClick={() => handleSort('price')}>
                                    <div className="flex items-center justify-end gap-1">
                                        <span>Precio Final</span>
                                        <span className="text-[10px] font-normal text-slate-400">
                                            {sortField === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th className="p-3 text-center cursor-pointer hover:text-slate-800 transition-colors" onClick={() => handleSort('stock')}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span>Stock</span>
                                        <span className="text-[10px] font-normal text-slate-400">
                                            {sortField === 'stock' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-slate-400">Cargando productos...</td>
                                </tr>
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-slate-400">
                                        {searchTerm ? 'No se encontraron productos coincidentes.' : 'No hay productos registrados en el catálogo.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-3 font-mono text-slate-400">{p.code}</td>
                                        <td className="p-3 font-bold text-slate-800 uppercase">{p.name}</td>

                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                {p.category?.name || 'SIN CATEGORÍA'}
                                            </span>
                                        </td>

                                        <td className="p-3 text-right font-bold text-emerald-700 text-sm">${p.price.toLocaleString('es-AR')}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.stock <= p.minStock ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                                                {p.stock} u.
                                            </span>
                                        </td>

                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditProduct(p)}
                                                    className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded font-bold transition-colors"
                                                    title="Editar producto"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => { if (confirm(`¿Eliminar producto "${p.name}"?`)) { await deleteProduct(p.id); loadData(); } }}
                                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded font-bold transition-colors"
                                                    title="Eliminar producto"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINADOR PIE DE PÁGINA */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span>Mostrar:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                            <option value={10}>10 por pág.</option>
                            <option value={25}>25 por pág.</option>
                            <option value={50}>50 por pág.</option>
                            <option value={100}>100 por pág.</option>
                        </select>
                        <span className="hidden sm:inline text-slate-400">|</span>
                        <span>
                            Mostrando {totalItems > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold"
                            title="Primera página"
                        >
                            «
                        </button>
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold"
                        >
                            Anterior
                        </button>

                        <span className="px-3 py-1 font-bold text-slate-800">
                            Pág. {currentPage} de {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold"
                        >
                            Siguiente
                        </button>
                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-bold"
                            title="Última página"
                        >
                            »
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}