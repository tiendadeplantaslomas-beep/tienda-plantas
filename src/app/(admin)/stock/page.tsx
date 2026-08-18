'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    getProducts,
    adjustStock,
    saveProduct,
    getCategories,
    getSuppliers,
    createCategory,
    createSupplier,
    generateNextProductCode
} from '@/actions/product-actions';

interface ProductItem {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    categoryId?: string;
    supplierId?: string | null;
    cost: number;
    otherCosts?: number;
    price: number;
    margin?: number;
    taxRate?: number;
    trackStock?: boolean;
    stock: number;
    minStock?: number;
    category?: { id: string; name: string; defaultMargin?: number };
    supplier?: { id: string; name: string };
}

export default function StockPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
    const [editStockValue, setEditStockValue] = useState<number>(0);

    // Estados para el Modal de Nuevo Producto / Planta
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newCategoryId, setNewCategoryId] = useState('');
    const [newSupplierId, setNewSupplierId] = useState('');
    const [newCost, setNewCost] = useState(0);
    const [newOtherCosts, setNewOtherCosts] = useState(0);
    const [newPrice, setNewPrice] = useState(0);
    const [newMargin, setNewMargin] = useState(30);
    const [newTaxRate, setNewTaxRate] = useState<number>(0);
    const [newStock, setNewStock] = useState(0);
    const [newMinStock, setNewMinStock] = useState(2);
    const [newTrackStock, setNewTrackStock] = useState(true);

    // Formularios Inline para Categoría y Proveedor
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [inlineCategoryName, setInlineCategoryName] = useState('');
    const [inlineCategoryMargin, setInlineCategoryMargin] = useState(30);

    const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
    const [inlineSupplierName, setInlineSupplierName] = useState('');
    const [inlineSupplierPhone, setInlineSupplierPhone] = useState('');
    const [inlineSupplierAddress, setInlineSupplierAddress] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            setEditStockValue(selectedProduct.stock);
        }
    }, [selectedProduct]);

    // Cálculo automático del precio de venta incluyendo Costos, Margen e IVA
    useEffect(() => {
        const totalCost = Number(newCost || 0) + Number(newOtherCosts || 0);
        const marginDecimal = Number(newMargin || 0) / 100;
        const taxMultiplier = 1 + (Number(newTaxRate || 0) / 100);

        if (marginDecimal >= 0) {
            const subtotal = totalCost * (1 + marginDecimal);
            const calculatedPrice = subtotal * taxMultiplier;
            setNewPrice(Math.round(calculatedPrice));
        }
    }, [newCost, newOtherCosts, newMargin, newTaxRate]);

    const loadData = async () => {
        try {
            const [prodsData, catsData, suppsData] = await Promise.all([
                getProducts(),
                getCategories(),
                getSuppliers()
            ]);
            setProducts(prodsData as any);
            setCategories(catsData);
            setSuppliers(suppsData);

            if (catsData && catsData.length > 0 && !newCategoryId) {
                const firstCat = catsData[0];
                setNewCategoryId(firstCat.id);
                setNewMargin(firstCat.defaultMargin ?? 30);
                const code = await generateNextProductCode(firstCat.id);
                setNewCode(code);
            }
            if (suppsData && suppsData.length > 0 && !newSupplierId) {
                setNewSupplierId(suppsData[0].id);
            }

            if (prodsData && (prodsData as any[]).length > 0) {
                const list = prodsData as any[];
                if (!selectedProduct) {
                    setSelectedProduct(list[0]);
                } else {
                    const current = list.find(p => p.id === selectedProduct.id);
                    if (current) setSelectedProduct(current);
                }
            }
        } catch (err) {
            console.error('Error al cargar inventario:', err);
        }
    };

    const handleCategoryChange = async (catId: string) => {
        setNewCategoryId(catId);
        const found = categories.find(c => c.id === catId);
        if (found && found.defaultMargin !== undefined) {
            setNewMargin(Math.round(found.defaultMargin));
        }
        const generatedCode = await generateNextProductCode(catId);
        setNewCode(generatedCode);
    };

    const handleOpenModal = async () => {
        setIsModalOpen(true);
        if (categories.length > 0 && !newCategoryId) {
            const firstCat = categories[0];
            setNewCategoryId(firstCat.id);
            setNewMargin(firstCat.defaultMargin ?? 30);
            const code = await generateNextProductCode(firstCat.id);
            setNewCode(code);
        } else if (newCategoryId) {
            const code = await generateNextProductCode(newCategoryId);
            setNewCode(code);
        }
    };

    const handleCloseModal = async () => {
        setIsModalOpen(false);
        setNewName('');
        setNewDescription('');
        setNewImageUrl('');
        setNewCost(0);
        setNewOtherCosts(0);
        setNewPrice(0);
        setNewMargin(30);
        setNewTaxRate(0);
        setNewStock(0);
        setNewMinStock(2);
        setNewTrackStock(true);
        setIsCreatingCategory(false);
        setIsCreatingSupplier(false);

        if (newCategoryId) {
            const code = await generateNextProductCode(newCategoryId);
            setNewCode(code);
        }
    };

    const handleSaveInlineCategory = async () => {
        if (!inlineCategoryName.trim()) return;
        try {
            const res = await createCategory({
                name: inlineCategoryName.trim(),
                defaultMargin: Math.round(Number(inlineCategoryMargin))
            });
            if (res.success && res.category) {
                const updatedCats = await getCategories();
                setCategories(updatedCats);
                setNewCategoryId(res.category.id);
                setNewMargin(Math.round(res.category.defaultMargin));
                const code = await generateNextProductCode(res.category.id);
                setNewCode(code);
                setInlineCategoryName('');
                setInlineCategoryMargin(30);
                setIsCreatingCategory(false);
            } else {
                alert(res.error || 'Error al crear la categoría');
            }
        } catch (error) {
            console.error(error);
            alert('Error al crear categoría');
        }
    };

    const handleSaveInlineSupplier = async () => {
        if (!inlineSupplierName.trim()) return;
        try {
            const res = await createSupplier({
                name: inlineSupplierName.trim(),
                phone: inlineSupplierPhone.trim(),
                address: inlineSupplierAddress.trim()
            });
            if (res.success && res.supplier) {
                const updatedSupps = await getSuppliers();
                setSuppliers(updatedSupps);
                setNewSupplierId(res.supplier.id);
                setInlineSupplierName('');
                setInlineSupplierPhone('');
                setInlineSupplierAddress('');
                setIsCreatingSupplier(false);
            } else {
                alert(res.error || 'Error al crear el proveedor');
            }
        } catch (error) {
            console.error(error);
            alert('Error al crear proveedor');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpdateStock = async () => {
        if (!selectedProduct) return;
        try {
            const res = await adjustStock(selectedProduct.id, Math.round(Number(editStockValue)), 'ADJUSTMENT');
            if (res.success) {
                await loadData();
                alert('¡Stock actualizado con éxito!');
            } else {
                alert(res.error || 'Error al actualizar el stock');
            }
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            alert('Error de conexión al actualizar el stock');
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryId) {
            alert('Debes seleccionar una categoría.');
            return;
        }

        try {
            const res = await saveProduct({
                code: newCode.trim() || undefined,
                name: newName,
                description: newDescription.trim() || undefined,
                imageUrl: newImageUrl.trim() || undefined,
                categoryId: newCategoryId,
                supplierId: newSupplierId || undefined,
                cost: Math.round(Number(newCost)),
                otherCosts: Math.round(Number(newOtherCosts)),
                price: Math.round(Number(newPrice)),
                margin: Math.round(Number(newMargin)),
                taxRate: Number(newTaxRate),
                stock: Math.round(Number(newStock)),
                minStock: Math.round(Number(newMinStock)),
                trackStock: Boolean(newTrackStock)
            });

            if (res.success) {
                await handleCloseModal();
                await loadData();
                alert('¡Producto / Planta creado con éxito!');
            } else {
                alert(res.error || 'Error al crear el producto');
            }
        } catch (error) {
            console.error('Error al crear producto:', error);
            alert('Error de conexión al crear el producto');
        }
    };

    const filteredProducts = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return products.filter(p => {
            const matchesQuery = p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
            if (selectedCategory === 'bajo') {
                const min = p.minStock ?? 2;
                return matchesQuery && (p.stock <= min);
            }
            return matchesQuery;
        });
    }, [products, searchQuery, selectedCategory]);

    const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalInventoryValue = products.reduce((acc, p) => acc + ((p.cost || 0) * (p.stock || 0)), 0);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 text-slate-800 overflow-hidden font-sans relative">

            {/* MODAL COMPACTO PARA NUEVO PRODUCTO / PLANTA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[96vh] flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-100 px-4 py-3 pb-2">
                            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                                ➕ Registrar Nuevo Producto / Planta
                            </h3>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateProduct} className="p-4 overflow-y-auto space-y-2 text-xs flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">

                            {/* CATEGORÍA */}
                            <div>
                                <div className="flex justify-between items-center mb-0.5">
                                    <label className="font-bold text-slate-700">Categoría:</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                                        className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                                    >
                                        {isCreatingCategory ? '← Seleccionar existente' : '+ Nueva Categoría'}
                                    </button>
                                </div>
                                {isCreatingCategory ? (
                                    <div className="space-y-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                                        <input
                                            type="text"
                                            placeholder="Nombre de categoría *"
                                            value={inlineCategoryName}
                                            onChange={(e) => setInlineCategoryName(e.target.value)}
                                            className="w-full border border-slate-200 rounded p-1 bg-white uppercase font-bold text-xs"
                                        />
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Margen por Defecto [%]:</label>
                                            <input
                                                type="number"
                                                step="1"
                                                value={inlineCategoryMargin}
                                                onChange={(e) => setInlineCategoryMargin(Math.round(Number(e.target.value)))}
                                                className="w-full border border-slate-200 rounded p-1 bg-white font-mono text-xs"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveInlineCategory}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1 rounded font-bold uppercase text-[10px] cursor-pointer"
                                        >
                                            Guardar Categoría
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={newCategoryId}
                                        onChange={(e) => handleCategoryChange(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-bold uppercase text-xs"
                                        required
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* PROVEEDOR */}
                            <div>
                                <div className="flex justify-between items-center mb-0.5">
                                    <label className="font-bold text-slate-700">Proveedor:</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingSupplier(!isCreatingSupplier)}
                                        className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                                    >
                                        {isCreatingSupplier ? '← Seleccionar existente' : '+ Nuevo Proveedor'}
                                    </button>
                                </div>
                                {isCreatingSupplier ? (
                                    <div className="space-y-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                                        <input
                                            type="text"
                                            placeholder="Nombre del proveedor *"
                                            value={inlineSupplierName}
                                            onChange={(e) => setInlineSupplierName(e.target.value)}
                                            className="w-full border border-slate-200 rounded p-1 bg-white uppercase font-bold text-xs"
                                        />
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <input
                                                type="text"
                                                placeholder="Teléfono"
                                                value={inlineSupplierPhone}
                                                onChange={(e) => setInlineSupplierPhone(e.target.value)}
                                                className="border border-slate-200 rounded p-1 bg-white text-xs font-mono"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Dirección"
                                                value={inlineSupplierAddress}
                                                onChange={(e) => setInlineSupplierAddress(e.target.value)}
                                                className="border border-slate-200 rounded p-1 bg-white text-xs uppercase"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveInlineSupplier}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1 rounded font-bold uppercase text-[10px] cursor-pointer"
                                        >
                                            Guardar Proveedor
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={newSupplierId}
                                        onChange={(e) => setNewSupplierId(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 uppercase text-xs"
                                    >
                                        <option value="">-- SIN PROVEEDOR ASIGNADO --</option>
                                        {suppliers.map(supp => (
                                            <option key={supp.id} value={supp.id}>{supp.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Código (Automático):</label>
                                    <input
                                        type="text"
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                        placeholder="Ej. SUS001"
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 uppercase font-mono text-[11px]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Nombre:</label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="EJ. MONSTERA"
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 uppercase text-xs"
                                    />
                                </div>
                            </div>

                            {/* UPLOAD DE IMAGEN */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-0.5">Imagen:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="w-full border border-slate-200 rounded p-1 bg-slate-50 text-[11px] cursor-pointer"
                                    />
                                    {newImageUrl && (
                                        <img src={newImageUrl} alt="Preview" className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0" />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-0.5">Descripción:</label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Detalles..."
                                    rows={1}
                                    className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 uppercase resize-none text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Costo Unitario ($):</label>
                                    <input
                                        type="number"
                                        step="1"
                                        required
                                        value={newCost}
                                        onChange={(e) => setNewCost(Math.round(Number(e.target.value)))}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Costos Extras ($):</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={newOtherCosts}
                                        onChange={(e) => setNewOtherCosts(Math.round(Number(e.target.value)))}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Margen (%):</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={newMargin}
                                        onChange={(e) => setNewMargin(Math.round(Number(e.target.value)))}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-mono font-bold text-amber-700 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">IVA:</label>
                                    <select
                                        value={newTaxRate}
                                        onChange={(e) => setNewTaxRate(Number(e.target.value))}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-mono text-xs"
                                    >
                                        <option value={0}>0%</option>
                                        <option value={10.5}>10.5%</option>
                                        <option value={21}>21%</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-emerald-700 mb-0.5">Precio ($):</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(Math.round(Number(e.target.value)))}
                                        className="w-full border border-emerald-300 rounded p-1.5 bg-emerald-50 font-mono text-emerald-900 font-bold text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Stock Inicial:</label>
                                    <input
                                        type="number"
                                        step="1"
                                        required
                                        value={newStock}
                                        onChange={(e) => setNewStock(Math.round(Number(e.target.value)))}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-0.5">Stock Mínimo:</label>
                                    <input
                                        type="number"
                                        step="1"
                                        required
                                        value={newMinStock}
                                        onChange={(e) => setNewMinStock(Math.round(Number(e.target.value)))}
                                        className="w-full border border-slate-200 rounded p-1.5 bg-slate-50 font-mono text-amber-600 font-bold text-xs"
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-0.5">
                                    <label className="flex items-center gap-1.5 cursor-pointer pt-3">
                                        <input
                                            type="checkbox"
                                            checked={newTrackStock}
                                            onChange={(e) => setNewTrackStock(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        />
                                        <span className="font-bold text-slate-700 text-[11px]">Llevar Stock</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold rounded text-slate-600 uppercase text-[11px] cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 font-bold rounded text-white uppercase shadow-sm text-[11px] cursor-pointer"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CUERPO PRINCIPAL EN 3 COLUMNAS */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* COLUMNA IZQUIERDA: FILTROS Y RESUMEN */}
                <div className="lg:col-span-3 hidden lg:flex flex-col gap-3 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Filtros de Inventario
                        </h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => setSelectedCategory('todos')}
                                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${selectedCategory === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                            >
                                🌿 Todos los Productos / Plantas
                            </button>
                            <button
                                onClick={() => setSelectedCategory('bajo')}
                                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${selectedCategory === 'bajo' ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                            >
                                ⚠️ Stock Bajo / Reposición
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs flex-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Resumen General
                        </h3>
                        <div className="space-y-2 text-slate-600 font-medium">
                            <p className="flex justify-between">
                                <span>Total Variedades:</span>
                                <strong className="text-slate-900 font-mono">{products.length}</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Unidades Físicas:</span>
                                <strong className="text-slate-900 font-mono">{totalStockUnits} u.</strong>
                            </p>
                            <p className="flex justify-between">
                                <span>Valor Costo Total:</span>
                                <strong className="text-emerald-700 font-mono">$ {totalInventoryValue.toLocaleString()}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* COLUMNA CENTRAL: BUSCADOR Y GRILLA DE STOCK */}
                <div className="lg:col-span-6 flex flex-col gap-3 h-full overflow-hidden">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="BUSCAR PLANTA O CÓDIGO EN STOCK..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-base font-bold placeholder-slate-400 text-slate-800 outline-none uppercase bg-transparent px-2"
                            />
                            <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-sm cursor-pointer">
                                Buscar
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2.5">Código</th>
                                        <th className="p-2.5">Planta / Producto</th>
                                        <th className="p-2.5 text-center">Stock Actual</th>
                                        <th className="p-2.5 text-right">Costo [$]</th>
                                        <th className="p-2.5 text-right">Precio [$]</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {filteredProducts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-slate-400 italic text-xs">
                                                No se encontraron productos en el inventario.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProducts.map(p => {
                                            const min = p.minStock ?? 2;
                                            const isLowStock = p.stock <= min;
                                            return (
                                                <tr
                                                    key={p.id}
                                                    onClick={() => setSelectedProduct(p)}
                                                    className={`hover:bg-slate-50 cursor-pointer ${selectedProduct?.id === p.id ? 'bg-slate-100/80 font-bold' : ''}`}
                                                >
                                                    <td className="p-2.5 font-mono text-slate-600">{p.code}</td>
                                                    <td className="p-2.5 text-slate-800 uppercase flex items-center gap-2">
                                                        {p.imageUrl && (
                                                            <img src={p.imageUrl} alt="" className="w-6 h-6 rounded object-cover border border-slate-200" />
                                                        )}
                                                        {p.name}
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${isLowStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                                            {p.stock} u.
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono">$ {p.cost?.toLocaleString()}</td>
                                                    <td className="p-2.5 text-right font-mono text-emerald-800">$ {p.price?.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DETALLE Y AJUSTE RÁPIDO DE STOCK */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Detalle de Selección
                        </h3>
                        {selectedProduct ? (
                            <div className="space-y-3">
                                {selectedProduct.imageUrl && (
                                    <div className="w-full h-32 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Producto Seleccionado:</span>
                                    <p className="font-bold text-slate-800 text-sm uppercase mt-0.5">{selectedProduct.name}</p>
                                    <span className="font-mono text-slate-500 text-[10px]">Ref: {selectedProduct.code}</span>
                                    {selectedProduct.description && (
                                        <p className="text-slate-600 text-[11px] mt-1 italic">{selectedProduct.description}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-400 block">COSTO UNIT.</span>
                                        <span className="font-mono font-bold text-slate-700 text-sm">$ {selectedProduct.cost?.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded border border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-400 block">PRECIO VENTA</span>
                                        <span className="font-mono font-bold text-emerald-700 text-sm">$ {selectedProduct.price?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Ajustar Stock Físico</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="1"
                                            value={editStockValue}
                                            onChange={(e) => setEditStockValue(Math.round(Number(e.target.value)))}
                                            className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold bg-slate-50 outline-none text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button
                                            onClick={handleUpdateStock}
                                            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded font-bold uppercase shadow-sm text-xs cursor-pointer"
                                        >
                                            Actualizar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-center py-6">Selecciona un producto de la lista para ver su detalle.</p>
                        )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 flex-1 flex flex-col justify-end">
                        <button
                            onClick={handleOpenModal}
                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase shadow-sm transition-colors cursor-pointer"
                        >
                            ➕ Nuevo Producto / Planta
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}