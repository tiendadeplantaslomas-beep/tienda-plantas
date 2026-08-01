'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getProducts, createSupplier } from '@/actions/product-actions';
import { createPurchase, getSuppliersForSelect, getCategoriesForSelect, PurchaseItemInput } from '@/actions/purchase-actions';

interface ProductSelectOption {
    id: string;
    code: string;
    name: string;
    cost: number;
    margin: number;
    categoryId: string;
}

interface SupplierOption {
    id: string;
    name: string;
}

interface CategoryOption {
    id: string;
    name: string;
    defaultMargin: number;
}

type SortField = 'code' | 'name' | null;
type SortOrder = 'asc' | 'desc';

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [existingProducts, setExistingProducts] = useState<ProductSelectOption[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    // Form Datos Generales del Comprobante
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const [focusedSupplierIndex, setFocusedSupplierIndex] = useState<number>(-1);
    const supplierDropdownRef = useRef<HTMLDivElement>(null);
    const supplierItemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [docType, setDocType] = useState<'FACTURA' | 'REMITO' | 'PRESUPUESTO'>('FACTURA');
    const [docNumber, setDocNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [otherCostsTotal, setOtherCostsTotal] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

    // Estado Formulario Pop-over Inline Proveedor
    const [showInlineSupplier, setShowInlineSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierPhone, setNewSupplierPhone] = useState('');
    const [isSavingSupplier, setIsSavingSupplier] = useState(false);

    // Grilla de ítems agregados
    const [items, setItems] = useState<PurchaseItemInput[]>([]);

    // Ordenamiento y Paginación de la Grilla de Ítems
    const [sortField, setSortField] = useState<SortField>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Form Renglón Actual
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemCategoryId, setItemCategoryId] = useState('');
    const [itemQty, setItemQty] = useState<number | ''>('');
    const [itemCost, setItemCost] = useState<number | ''>('');
    const [itemMargin, setItemMargin] = useState<number>(100);

    // Buscador Predictivo de Productos (Combobox)
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Cerrar desplegables predictivos al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setFocusedIndex(-1);
            }
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
                setIsSupplierDropdownOpen(false);
                setFocusedSupplierIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Timer para ocultar mensajes automáticamente
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const loadData = async () => {
        setPageLoading(true);
        try {
            const [sups, cats, prods] = await Promise.all([
                getSuppliersForSelect(),
                getCategoriesForSelect(),
                getProducts()
            ]);
            setSuppliers(sups);
            setCategories(cats);
            setExistingProducts(prods as any);
            if (cats && cats.length > 0) setItemCategoryId(cats[0].id);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setMessage({ type: 'error', text: 'Error al cargar opciones de la base de datos.' });
        } finally {
            setPageLoading(false);
        }
    };

    // Proveedores filtrados para el buscador predictivo
    const filteredSuppliers = useMemo(() => {
        if (!supplierSearchQuery.trim() || selectedSupplierId) return suppliers;
        const query = supplierSearchQuery.toLowerCase();
        return suppliers.filter(s => s.name.toLowerCase().includes(query));
    }, [suppliers, supplierSearchQuery, selectedSupplierId]);

    const handleSelectSupplier = (supplier: SupplierOption) => {
        setSelectedSupplierId(supplier.id);
        setSupplierSearchQuery(supplier.name);
        setIsSupplierDropdownOpen(false);
        setFocusedSupplierIndex(-1);
    };

    const handleClearSupplierSelection = () => {
        setSelectedSupplierId('');
        setSupplierSearchQuery('');
        setIsSupplierDropdownOpen(false);
        setFocusedSupplierIndex(-1);
    };

    const handleSupplierKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isSupplierDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsSupplierDropdownOpen(true);
            return;
        }

        const totalItems = filteredSuppliers.length + 1; // +1 por la opción "+ NUEVO PROVEEDOR"

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (focusedSupplierIndex + 1) % totalItems;
            setFocusedSupplierIndex(nextIndex);
            supplierItemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (focusedSupplierIndex - 1 + totalItems) % totalItems;
            setFocusedSupplierIndex(prevIndex);
            supplierItemRefs.current[prevIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            if (isSupplierDropdownOpen && focusedSupplierIndex >= 0) {
                e.preventDefault();
                if (focusedSupplierIndex === 0) {
                    setShowInlineSupplier(true);
                    setIsSupplierDropdownOpen(false);
                } else {
                    handleSelectSupplier(filteredSuppliers[focusedSupplierIndex - 1]);
                }
            }
        } else if (e.key === 'Escape') {
            setIsSupplierDropdownOpen(false);
            setFocusedSupplierIndex(-1);
        }
    };

    // Productos filtrados para el buscador predictivo
    const filteredSearchProducts = useMemo(() => {
        if (!searchQuery.trim() || selectedProductId) return existingProducts;
        const query = searchQuery.toLowerCase();
        return existingProducts.filter(
            p => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
        );
    }, [existingProducts, searchQuery, selectedProductId]);

    // Ítems ordenados dinámicamente
    const sortedItems = useMemo(() => {
        const mappedItems = items.map((item, originalIndex) => ({ item, originalIndex }));

        if (!sortField) return mappedItems;

        return mappedItems.sort((a, b) => {
            const valA = a.item[sortField].toString().toLowerCase();
            const valB = b.item[sortField].toString().toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [items, sortField, sortOrder]);

    // Paginación aplicada sobre los ítems ordenados
    const totalPages = Math.ceil(sortedItems.length / itemsPerPage) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedItems.slice(start, start + itemsPerPage);
    }, [sortedItems, currentPage, itemsPerPage]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortOrder === 'asc') {
                setSortOrder('desc');
            } else {
                setSortField(null);
                setSortOrder('asc');
            }
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleSelectProduct = (product: ProductSelectOption) => {
        setSelectedProductId(product.id);
        setSearchQuery(`[${product.code}] ${product.name}`);
        setItemCode(product.code.toUpperCase());
        setItemName(product.name.toUpperCase());
        setItemCost(product.cost);
        setItemMargin(product.margin);
        setItemCategoryId(product.categoryId);
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
    };

    const handleClearProductSelection = () => {
        setSelectedProductId('');
        setSearchQuery('');
        setItemCode('');
        setItemName('');
        setItemCost('');
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
    };

    // Navegación por Teclado en Buscador Predictivo de Productos
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsDropdownOpen(true);
            return;
        }

        if (filteredSearchProducts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (focusedIndex + 1) % filteredSearchProducts.length;
            setFocusedIndex(nextIndex);
            itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (focusedIndex - 1 + filteredSearchProducts.length) % filteredSearchProducts.length;
            setFocusedIndex(prevIndex);
            itemRefs.current[prevIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            if (isDropdownOpen && focusedIndex >= 0 && focusedIndex < filteredSearchProducts.length) {
                e.preventDefault();
                handleSelectProduct(filteredSearchProducts[focusedIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
            setFocusedIndex(-1);
        }
    };

    const handleCreateSupplierInline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;

        setIsSavingSupplier(true);
        const upperName = newSupplierName.trim().toUpperCase();
        const upperPhone = newSupplierPhone.trim().toUpperCase();

        const res = await createSupplier({
            name: upperName,
            phone: upperPhone,
        });

        if (res.success && res.supplier) {
            const updatedSuppliers = [...suppliers, { id: res.supplier.id, name: res.supplier.name }];
            setSuppliers(updatedSuppliers);
            setSelectedSupplierId(res.supplier.id);
            setSupplierSearchQuery(res.supplier.name);
            setNewSupplierName('');
            setNewSupplierPhone('');
            setShowInlineSupplier(false);
            setMessage({ type: 'success', text: 'Proveedor creado y seleccionado.' });
        } else {
            setMessage({ type: 'error', text: res.error || 'No se pudo crear el proveedor.' });
        }

        setIsSavingSupplier(false);
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemCode || !itemName || !itemQty || Number(itemQty) <= 0 || itemCost === '') {
            setMessage({ type: 'error', text: 'Completá código, nombre, cantidad y costo unitario.' });
            return;
        }

        const newItem: PurchaseItemInput = {
            productId: selectedProductId || undefined,
            code: itemCode.trim().toUpperCase(),
            name: itemName.trim().toUpperCase(),
            categoryId: itemCategoryId,
            quantity: Number(itemQty),
            unitCost: Number(itemCost),
            margin: Number(itemMargin) || 100,
        };

        setItems([...items, newItem]);
        handleClearProductSelection();
        setItemQty('');
        setMessage(null);
    };

    const handleRemoveItem = (originalIndex: number) => {
        const newItems = items.filter((_, i) => i !== originalIndex);
        setItems(newItems);
        if (currentPage > 1 && (newItems.length <= (currentPage - 1) * itemsPerPage)) {
            setCurrentPage(currentPage - 1);
        }
    };

    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const totalUnits = items.reduce((acc, item) => acc + item.quantity, 0);
    const fletePerUnit = totalUnits > 0 && otherCostsTotal ? Math.round(Number(otherCostsTotal) / totalUnits) : 0;
    const totalFinal = subtotal + (Number(otherCostsTotal) || 0);

    const resetWholeForm = () => {
        setItems([]);
        handleClearSupplierSelection();
        setDocNumber('');
        setOtherCostsTotal('');
        setNotes('');
        handleClearProductSelection();
        setItemQty('');
        setCurrentPage(1);
    };

    const handleSubmitPurchase = async () => {
        if (items.length === 0) {
            setMessage({ type: 'error', text: 'Ingresá al menos un producto a la compra.' });
            return;
        }

        const selectedSupObj = suppliers.find(s => s.id === selectedSupplierId);
        if (!selectedSupplierId || !selectedSupObj) {
            setMessage({ type: 'error', text: 'Seleccioná un proveedor válido o creá uno nuevo.' });
            return;
        }

        setLoading(true);
        const res = await createPurchase({
            supplierId: selectedSupplierId,
            supplierName: selectedSupObj.name.toUpperCase(),
            docType,
            docNumber: docNumber.trim().toUpperCase(),
            date: purchaseDate,
            otherCostsTotal: Number(otherCostsTotal) || 0,
            notes: notes.trim().toUpperCase(),
            items
        });

        setLoading(false);

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: 'Comprobante registrado con éxito. Stock y costos actualizados.' });
            resetWholeForm();
            loadData();
        }
    };

    if (pageLoading) {
        return (
            <div className="flex justify-center items-center h-screen text-slate-500 font-medium text-xs">
                Cargando módulo de compras...
            </div>
        );
    }

    return (
        <div className="p-2.5 md:p-4 max-w-7xl mx-auto space-y-2.5 text-slate-800">

            {/* ENCABEZADO COMPACTO */}
            <div className="flex justify-between items-center border-b pb-1.5 border-slate-200">
                <div>
                    <h1 className="text-base font-bold text-slate-800">Ingreso de Compras y Recepción</h1>
                    <p className="text-[10px] text-slate-500">Comprobantes, prorrateo de flete y actualización de costos de stock.</p>
                </div>
            </div>

            {/* ALERTAS CON AUTO-HIDE */}
            {message && (
                <div className={`p-1.5 rounded-lg text-xs font-medium flex justify-between items-center transition-all duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-400 hover:text-slate-600 ml-2">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">

                {/* COLUMNA IZQUIERDA: FORMULARIOS COMPACTOS */}
                <div className="space-y-2.5">

                    {/* DATOS DEL COMPROBANTE */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide border-b pb-1">
                            Datos del Comprobante
                        </h2>

                        <div className="space-y-1.5">
                            {/* PROVEEDOR PREDICTIVO + POPOVER INLINE */}
                            <div className="relative" ref={supplierDropdownRef}>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                                    Proveedor <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-1">
                                    <div className="relative w-full">
                                        <input
                                            type="text"
                                            placeholder="Buscar o seleccionar proveedor..."
                                            value={supplierSearchQuery}
                                            onKeyDown={handleSupplierKeyDown}
                                            onChange={(e) => {
                                                setSupplierSearchQuery(e.target.value);
                                                if (selectedSupplierId) setSelectedSupplierId('');
                                                setIsSupplierDropdownOpen(true);
                                                setFocusedSupplierIndex(0);
                                            }}
                                            onFocus={() => {
                                                setIsSupplierDropdownOpen(true);
                                                setFocusedSupplierIndex(0);
                                            }}
                                            className="w-full border border-slate-300 rounded-md p-1 pr-6 text-xs font-medium uppercase bg-white focus:ring-1 focus:ring-slate-800"
                                        />
                                        {supplierSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={handleClearSupplierSelection}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowInlineSupplier(!showInlineSupplier)}
                                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-2 py-1 rounded-md text-xs shadow"
                                        title="Agregar nuevo proveedor"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* LISTA DESPLEGABLE FILTRADA DE PROVEEDORES */}
                                {isSupplierDropdownOpen && (
                                    <div className="absolute left-0 right-8 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-44 overflow-y-auto z-50 divide-y divide-slate-100">
                                        {/* Opción para crear rápido */}
                                        <div
                                            ref={(el) => (supplierItemRefs.current[0] = el)}
                                            onClick={() => {
                                                setShowInlineSupplier(true);
                                                setIsSupplierDropdownOpen(false);
                                            }}
                                            onMouseEnter={() => setFocusedSupplierIndex(0)}
                                            className={`p-1.5 text-xs font-bold cursor-pointer transition-colors ${focusedSupplierIndex === 0 ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                                        >
                                            + NUEVO PROVEEDOR...
                                        </div>

                                        {filteredSuppliers.length === 0 ? (
                                            <div className="p-1.5 text-xs text-slate-400 italic text-center">
                                                No se encontraron proveedores
                                            </div>
                                        ) : (
                                            filteredSuppliers.map((s, index) => {
                                                const actualIndex = index + 1;
                                                const isFocused = actualIndex === focusedSupplierIndex;
                                                return (
                                                    <div
                                                        key={s.id}
                                                        ref={(el) => (supplierItemRefs.current[actualIndex] = el)}
                                                        onClick={() => handleSelectSupplier(s)}
                                                        onMouseEnter={() => setFocusedSupplierIndex(actualIndex)}
                                                        className={`p-1.5 text-xs cursor-pointer uppercase transition-colors ${isFocused ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-100 text-slate-800'}`}
                                                    >
                                                        {s.name}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* POPOVER NUEVO PROVEEDOR */}
                                {showInlineSupplier && (
                                    <div className="absolute top-10 left-0 z-50 bg-slate-800 p-2.5 rounded-xl shadow-xl border border-slate-700 w-full text-white space-y-1.5">
                                        <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Nuevo Proveedor</h3>
                                        <input
                                            type="text"
                                            placeholder="Nombre..."
                                            value={newSupplierName}
                                            onChange={(e) => setNewSupplierName(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-1 text-xs text-white placeholder-slate-500 uppercase"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Teléfono..."
                                            value={newSupplierPhone}
                                            onChange={(e) => setNewSupplierPhone(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-1 text-xs text-white placeholder-slate-500 uppercase"
                                        />
                                        <div className="flex justify-end gap-1 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setShowInlineSupplier(false)}
                                                className="bg-slate-700 hover:bg-slate-600 text-[9px] px-2 py-0.5 rounded text-slate-200 font-bold"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCreateSupplierInline}
                                                disabled={isSavingSupplier || !newSupplierName.trim()}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-[9px] px-2 py-0.5 rounded text-white font-bold disabled:opacity-50"
                                            >
                                                {isSavingSupplier ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Tipo</label>
                                    <select
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value as any)}
                                        className="w-full border border-slate-300 rounded-md p-1 text-xs font-bold bg-white focus:ring-1 focus:ring-slate-800"
                                    >
                                        <option value="FACTURA">📄 FACTURA</option>
                                        <option value="REMITO">📦 REMITO</option>
                                        <option value="PRESUPUESTO">📝 PRESUPUESTO</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">N° Comprobante</label>
                                    <input
                                        type="text"
                                        placeholder="0001-00004582"
                                        value={docNumber}
                                        onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                                        className="w-full border border-slate-300 rounded-md p-1 text-xs uppercase focus:ring-1 focus:ring-slate-800 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Fecha Emisión</label>
                                <input
                                    type="date"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    className="w-full border border-slate-300 rounded-md p-1 text-xs focus:ring-1 focus:ring-slate-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AÑADIR PRODUCTO (COMPACTO) */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-center border-b pb-1">
                            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                                Añadir Producto
                            </h2>
                            {selectedProductId && (
                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Catálogo
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleAddItem} className="space-y-1.5">

                            {/* BUSCADOR PREDICTIVO CON NAVEGACIÓN POR TECLADO */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                                    Buscar en Catálogo <span className="text-slate-400 font-normal lowercase">(o crear abajo)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Escribí código o nombre..."
                                        value={searchQuery}
                                        onKeyDown={handleKeyDown}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (selectedProductId) setSelectedProductId('');
                                            setIsDropdownOpen(true);
                                            setFocusedIndex(0);
                                        }}
                                        onFocus={() => {
                                            setIsDropdownOpen(true);
                                            setFocusedIndex(0);
                                        }}
                                        className="w-full border border-slate-300 rounded-md p-1 pr-6 text-xs font-medium bg-white focus:ring-1 focus:ring-slate-800"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={handleClearProductSelection}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* LISTA DESPLEGABLE FILTRADA */}
                                {isDropdownOpen && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto z-50 divide-y divide-slate-100">
                                        {filteredSearchProducts.length === 0 ? (
                                            <div className="p-1.5 text-xs text-slate-400 italic text-center">
                                                No se encontraron productos
                                            </div>
                                        ) : (
                                            filteredSearchProducts.map((p, index) => {
                                                const isFocused = index === focusedIndex;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        ref={(el) => (itemRefs.current[index] = el)}
                                                        onClick={() => handleSelectProduct(p)}
                                                        onMouseEnter={() => setFocusedIndex(index)}
                                                        className={`p-1.5 text-xs cursor-pointer flex justify-between items-center transition-colors ${isFocused ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-800'}`}
                                                    >
                                                        <div>
                                                            <span className={`font-mono font-bold ${isFocused ? 'text-slate-200' : 'text-slate-600'}`}>[{p.code}]</span>{' '}
                                                            <span className="font-medium">{p.name}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-mono ${isFocused ? 'text-emerald-300 font-bold' : 'text-emerald-700'}`}>
                                                            $ {p.cost.toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Código <span className="text-rose-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="COD"
                                        value={itemCode}
                                        onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                                        className="w-full border border-slate-300 rounded-md p-1 text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Cantidad <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="0"
                                        value={itemQty}
                                        onChange={(e) => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full border border-slate-300 rounded-md p-1 text-xs font-bold focus:ring-1 focus:ring-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Descripción <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Nombre del producto..."
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value.toUpperCase())}
                                    className="w-full border border-slate-300 rounded-md p-1 text-xs uppercase focus:ring-1 focus:ring-slate-800"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Costo Unitario ($) <span className="text-rose-500">*</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="$ 0"
                                    value={itemCost}
                                    onChange={(e) => setItemCost(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full border border-slate-300 rounded-md p-1 text-xs font-bold font-mono text-emerald-800 focus:ring-1 focus:ring-slate-800"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-bold shadow transition-all mt-1"
                            >
                                ➕ Agregar Ítem a la Lista
                            </button>
                        </form>
                    </div>

                </div>

                {/* COLUMNA DERECHA: TABLA ORDENABLE CON PAGINADOR Y TOTALES */}
                <div className="lg:col-span-2 space-y-2.5">

                    {/* DETALLE Y TABLA */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="p-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-700 uppercase">Detalle de Comprobante</span>
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{items.length} ítems</span>
                            </div>

                            <div className="overflow-x-auto min-h-[180px]">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 text-[9px] uppercase text-slate-600 font-bold border-b border-slate-200 select-none">
                                        <tr>
                                            {/* COLUMNA CÓDIGO CON ORDENAMIENTO */}
                                            <th
                                                onClick={() => handleSort('code')}
                                                className="p-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>Código</span>
                                                    <span className="text-[10px]">
                                                        {sortField === 'code' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                                    </span>
                                                </div>
                                            </th>

                                            {/* COLUMNA PRODUCTO CON ORDENAMIENTO */}
                                            <th
                                                onClick={() => handleSort('name')}
                                                className="p-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>Producto</span>
                                                    <span className="text-[10px]">
                                                        {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                                                    </span>
                                                </div>
                                            </th>

                                            <th className="p-1.5 text-center">Cant.</th>
                                            <th className="p-1.5 text-right">Costo Unit.</th>
                                            <th className="p-1.5 text-right">Flete/u.</th>
                                            <th className="p-1.5 text-right">Costo Final</th>
                                            <th className="p-1.5 text-right">Subtotal</th>
                                            <th className="p-1.5 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {paginatedItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="text-center py-6 text-slate-400 italic">No hay productos agregados al comprobante.</td>
                                            </tr>
                                        ) : (
                                            paginatedItems.map(({ item, originalIndex }) => {
                                                const finalUnit = item.unitCost + fletePerUnit;
                                                return (
                                                    <tr key={originalIndex} className="hover:bg-slate-50">
                                                        <td className="p-1.5 font-mono font-bold text-slate-700">{item.code}</td>
                                                        <td className="p-1.5 font-bold text-slate-800">{item.name}</td>
                                                        <td className="p-1.5 text-center font-bold">{item.quantity} u.</td>
                                                        <td className="p-1.5 text-right font-mono">$ {item.unitCost.toLocaleString()}</td>
                                                        <td className="p-1.5 text-right font-mono text-amber-700">+ $ {fletePerUnit.toLocaleString()}</td>
                                                        <td className="p-1.5 text-right font-mono font-bold text-emerald-800">$ {finalUnit.toLocaleString()}</td>
                                                        <td className="p-1.5 text-right font-mono font-bold">$ {(item.quantity * item.unitCost).toLocaleString()}</td>
                                                        <td className="p-1.5 text-center">
                                                            <button
                                                                onClick={() => handleRemoveItem(originalIndex)}
                                                                className="text-slate-400 hover:text-rose-600 font-bold px-1"
                                                                title="Quitar ítem"
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PAGINADOR AL PIE DE LA TABLA */}
                        {items.length > 0 && (
                            <div className="p-1.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-[10px] text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    <span>Mostrar:</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="border border-slate-300 rounded px-1 py-0.5 bg-white text-[10px] font-bold"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                    </select>
                                    <span>de {items.length} ítems</span>
                                </div>

                                <div className="flex items-center gap-1 font-bold">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-2 py-0.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                                    >
                                        ◀
                                    </button>
                                    <span className="px-1.5">
                                        Pág. {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-2 py-0.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                                    >
                                        ▶
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TARJETA DE RESUMEN Y TOTALES COMPACTA */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">

                            {/* Gastos / Flete */}
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                                <label className="block text-[9px] font-bold uppercase text-slate-600">
                                    Flete / Gastos Varios ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="$ 0"
                                    value={otherCostsTotal}
                                    onChange={(e) => setOtherCostsTotal(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full border border-slate-300 bg-white rounded-md p-1 text-xs font-bold text-amber-700 font-mono focus:ring-1 focus:ring-slate-800"
                                />
                                {totalUnits > 0 && otherCostsTotal !== '' && (
                                    <p className="text-[9px] text-slate-500 pt-0.5">
                                        Prorrateo: <strong className="text-amber-700 font-mono">+ $ {fletePerUnit.toLocaleString()}</strong> por unidad ({totalUnits} u. en total)
                                    </p>
                                )}
                            </div>

                            {/* Totales y Acción */}
                            <div className="flex flex-col justify-between space-y-1.5 text-right">
                                <div>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Comprobante</span>
                                    <span className="text-lg font-bold font-mono text-emerald-700">$ {totalFinal.toLocaleString()}</span>
                                </div>

                                <button
                                    onClick={handleSubmitPurchase}
                                    disabled={loading || items.length === 0}
                                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-md text-xs font-bold shadow transition-all"
                                >
                                    {loading ? 'Guardando Comprobante...' : '💾 Registrar Comprobante'}
                                </button>
                            </div>

                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}