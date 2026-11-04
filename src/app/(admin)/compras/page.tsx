'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getProducts } from '@/actions/product-actions';
import {
    getSuppliersForSelect,
    getCategoriesForSelect,
    createQuickProduct,
    createPurchaseBatch,
    createSupplier,
    SingleInvoiceInput,
    SinglePurchaseItemInput
} from '@/actions/purchase-actions';

interface ProductItem {
    id: string;
    code: string;
    name: string;
    cost: number;
    price: number;
    stock: number;
    margin?: number;
    categoryId: string;
}

interface Supplier {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
}

interface Category {
    id: string;
    name: string;
    defaultMargin: number;
}

export default function ComprasBatchPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [suppliersDb, setSuppliersDb] = useState<Supplier[]>([]);
    const [categoriesDb, setCategoriesDb] = useState<Category[]>([]);

    const [batchInvoices, setBatchInvoices] = useState<SingleInvoiceInput[]>([]);
    const [batchNotes, setBatchNotes] = useState<string>('');
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    // Paginación ajustada para el espacio con título
    const [cartPage, setCartPage] = useState(1);
    const cartItemsPerPage = 6;

    const [invoicesPage, setInvoicesPage] = useState(1);
    const invoicesPerPage = 3;

    const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
    const [expFuel, setExpFuel] = useState<number>(0);
    const [expTolls, setExpTolls] = useState<number>(0);
    const [expLunch, setExpLunch] = useState<number>(0);
    const [expOthers, setExpOthers] = useState<number>(0);

    const globalFreight = expFuel + expTolls + expLunch + expOthers;

    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

    const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [docNumber, setDocNumber] = useState('');
    const [docType, setDocType] = useState<'FACTURA' | 'REMITO' | 'PRESUPUESTO'>('PRESUPUESTO');

    const [cart, setCart] = useState<SinglePurchaseItemInput[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupName, setNewSupName] = useState('');
    const [newSupPhone, setNewSupPhone] = useState('');
    const [newSupAddress, setNewSupAddress] = useState('');
    const [supError, setSupError] = useState<string | null>(null);

    const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [quickCategoryId, setQuickCategoryId] = useState('');
    const [quickCost, setQuickCost] = useState<number>(0);
    const [quickTamano, setQuickTamano] = useState('');
    const [quickColor, setQuickColor] = useState('');
    const [quickError, setQuickError] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        loadInitialData();
        if (searchInputRef.current) searchInputRef.current.focus();
    }, []);

    const loadInitialData = async () => {
        try {
            const [prodData, supData, catData] = await Promise.all([
                getProducts(),
                getSuppliersForSelect(),
                getCategoriesForSelect()
            ]);
            setProducts(prodData as any);
            setSuppliersDb(supData as any);
            const sortedCategories = (catData as Category[]).sort((a, b) => a.name.localeCompare(b.name));
            setCategoriesDb(sortedCategories);
        } catch (err) {
            console.error('Error al cargar datos iniciales:', err);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return products.filter(
            p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const filteredSuppliers = useMemo(() => {
        if (!supplierQuery.trim()) return [];
        const q = supplierQuery.toLowerCase();
        return suppliersDb
            .filter(s => s.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliersDb, supplierQuery]);

    const handleSelectSupplier = (sup: Supplier) => {
        setSelectedSupplier(sup);
        setSupplierQuery(sup.name);
        setIsSupplierDropdownOpen(false);
    };

    const handleSaveQuickSupplier = async () => {
        setSupError(null);
        if (!newSupName.trim()) {
            setSupError('El nombre del proveedor es obligatorio.');
            return;
        }

        const res = await createSupplier({
            name: newSupName.trim().toUpperCase(),
            phone: newSupPhone.trim() || undefined,
            address: newSupAddress.trim() || undefined
        });

        if (res.error) {
            setSupError(res.error);
            return;
        }

        if (res.supplier) {
            setSuppliersDb(prev => [...prev, res.supplier as any]);
            setSelectedSupplier(res.supplier as any);
            setSupplierQuery(res.supplier.name);
            setIsSupplierModalOpen(false);
            setNewSupName('');
            setNewSupPhone('');
            setNewSupAddress('');
        }
    };

    const handleAddToCart = (product: ProductItem) => {
        setCart(prev => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const existing = safePrev.find(item => item.productId === product.id);
            if (existing) {
                return safePrev.map(item =>
                    item.productId === product.id ? { ...item, quantity: (item.quantity || 0) + 1 } : item
                );
            }
            const newItem: SinglePurchaseItemInput = {
                productId: product.id,
                code: product.code,
                name: product.name,
                categoryId: product.categoryId,
                quantity: '' as unknown as number,
                unitCost: product.cost || 0,
                margin: product.margin || 100
            };
            return [newItem, ...safePrev];
        });
        setCartPage(1);
        setSearchQuery('');
        setIsProductDropdownOpen(false);

        setTimeout(() => {
            if (quantityInputRefs.current[product.id]) {
                quantityInputRefs.current[product.id]?.focus();
                quantityInputRefs.current[product.id]?.select();
            }
        }, 50);
    };

    const handleSetQuantity = (productId: string, val: string) => {
        setCart(prev =>
            (Array.isArray(prev) ? prev : []).map(item => (item.productId === productId ? { ...item, quantity: val === '' ? '' as unknown as number : Number(val) } : item))
        );
    };

    const handleUpdateCost = (productId: string, newCost: number) => {
        setCart(prev =>
            (Array.isArray(prev) ? prev : []).map(item => (item.productId === productId ? { ...item, unitCost: newCost } : item))
        );
    };

    const handleRemoveItem = (productId: string) => {
        setCart(prev => (Array.isArray(prev) ? prev : []).filter(item => item.productId !== productId));
    };

    const handleAddInvoiceToBatch = () => {
        if (!supplierQuery.trim()) {
            alert('⚠️ Debe seleccionar o ingresar el nombre de un proveedor.');
            return;
        }
        if (!cart || cart.length === 0) {
            alert('⚠️ El comprobante actual está vacío. Cargue al menos un producto.');
            return;
        }

        for (const item of cart) {
            if (!item.quantity || Number(item.quantity) <= 0) {
                alert(`⚠️ Ingrese una cantidad válida para el producto: ${item.name}`);
                return;
            }
        }

        const supplierNameFormatted = selectedSupplier ? selectedSupplier.name : supplierQuery.trim().toUpperCase();

        const newInvoice: SingleInvoiceInput = {
            supplierId: selectedSupplier ? selectedSupplier.id : undefined,
            supplierName: supplierNameFormatted,
            docType,
            docNumber: docNumber.trim() || undefined,
            date: purchaseDate,
            items: [...cart]
        };

        setBatchInvoices(prev => [...prev, newInvoice]);
        setInvoicesPage(1);

        setCart([]);
        setDocNumber('');
        setSelectedSupplier(null);
        setSupplierQuery('');
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const handleEditInvoiceFromBatch = (indexReal: number) => {
        const target = batchInvoices[indexReal];
        if (cart && cart.length > 0) {
            if (!confirm('¿Desea reemplazar el comprobante en edición actual por el seleccionado?')) return;
        }

        setSupplierQuery(target.supplierName || '');
        if (target.supplierId) {
            const found = suppliersDb.find(s => s.id === target.supplierId);
            if (found) setSelectedSupplier(found);
        } else {
            setSelectedSupplier(null);
        }

        setDocType(target.docType);
        setDocNumber(target.docNumber || '');
        setCart(target.items);
        setBatchInvoices(prev => prev.filter((_, i) => i !== indexReal));
    };

    const handleRemoveInvoiceFromBatch = (indexReal: number) => {
        setBatchInvoices(prev => prev.filter((_, i) => i !== indexReal));
    };

    const handleOpenQuickProductModal = () => {
        setQuickName(searchQuery.trim().toUpperCase());
        setQuickCost(0);
        setQuickCategoryId('');
        setQuickTamano('');
        setQuickColor('');
        setQuickError(null);
        setIsQuickProductModalOpen(true);
    };

    const handleSaveQuickProduct = async () => {
        setQuickError(null);
        if (!quickName.trim()) {
            setQuickError('El nombre del producto es obligatorio.');
            return;
        }
        if (!quickCategoryId) {
            setQuickError('Debe seleccionar una categoría obligatoriamente.');
            return;
        }

        const res = await createQuickProduct({
            name: quickName,
            categoryId: quickCategoryId,
            cost: quickCost,
            tamano: quickTamano,
            color: quickColor
        });

        if (res.error) {
            setQuickError(res.error);
            return;
        }

        if (res.product) {
            setProducts(prev => [res.product as any, ...prev]);
            handleAddToCart(res.product as any);
            setIsQuickProductModalOpen(false);
            setSearchQuery('');
        }
    };

    const handleRegisterBatch = async () => {
        if (batchInvoices.length === 0) {
            alert('⚠️ Debe agregar al menos un comprobante al lote de compras antes de registrar.');
            return;
        }

        if (globalFreight <= 0) {
            alert('⚠️ Es obligatorio cargar los Gastos de Transporte / Viaje (Combustible, Peajes, etc.) para continuar.');
            setIsFreightModalOpen(true);
            return;
        }

        setIsSubmittingBatch(true);
        try {
            const notesDetails = `Combustible: $${expFuel} | Peajes: $${expTolls} | Viáticos: $${expLunch} | Varios: $${expOthers}. ${batchNotes}`.trim();

            const payload = {
                freightCostTotal: globalFreight,
                notes: notesDetails,
                invoices: batchInvoices
            };

            const res = await createPurchaseBatch(payload);

            if (res.error) {
                alert(`Error al procesar la salida de compras: ${res.error}`);
                setIsSubmittingBatch(false);
                return;
            }

            alert('✅ ¡Salida de compras registrada exitosamente! El flete fue prorrateado entre los productos y la mercadería quedó en Stand-By para su recepción.');

            setBatchInvoices([]);
            setExpFuel(0);
            setExpTolls(0);
            setExpLunch(0);
            setExpOthers(0);
            setBatchNotes('');
            loadInitialData();
        } catch (error: any) {
            console.error('Error al registrar lote:', error);
            alert(`Ocurrió un error inesperado: ${error.message}`);
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    const safeCart = Array.isArray(cart) ? cart : [];
    const currentInvoiceSubtotal = safeCart.reduce((acc, item) => acc + (Number(item.unitCost) || 0) * (Number(item.quantity) || 0), 0);

    const batchTotalSubtotal = batchInvoices.reduce((acc, inv) => {
        return acc + (inv.items || []).reduce((sum, item) => sum + (Number(item.unitCost) || 0) * (Number(item.quantity) || 0), 0);
    }, 0);

    const batchTotalUnits = batchInvoices.reduce((acc, inv) => {
        return acc + (inv.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    }, 0);

    const grandTotal = batchTotalSubtotal + globalFreight;

    const totalCartPages = Math.ceil(safeCart.length / cartItemsPerPage) || 1;
    const paginatedCart = safeCart.slice((cartPage - 1) * cartItemsPerPage, cartPage * cartItemsPerPage);

    const totalInvoicesPages = Math.ceil(batchInvoices.length / invoicesPerPage) || 1;
    const paginatedInvoices = batchInvoices.slice((invoicesPage - 1) * invoicesPerPage, invoicesPage * invoicesPerPage);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 text-slate-800 overflow-hidden font-sans">
            <style jsx global>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>

            {/* ENCABEZADO / TÍTULO DE LA PÁGINA */}
            <div className="bg-white px-4 py-2.5 border-b border-slate-200 shadow-2xs flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🛒</span>
                    <div>
                        <h1 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Registro de Compras y Lotes Multi-Proveedor
                        </h1>
                        <p className="text-[10px] text-slate-500 font-medium">
                            Carga de comprobantes, control de gastos de logística y preparación de stock en Stand-By.
                        </p>
                    </div>
                </div>
                <Link
                    href="/compras/historial"
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-1.5 shadow-xs"
                >
                    📜 Historial de Lotes
                </Link>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* COLUMNA IZQUIERDA: PROVEEDOR */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                1. Datos del Proveedor
                            </h3>
                            <button
                                onClick={() => setIsSupplierModalOpen(true)}
                                className="text-emerald-700 font-bold hover:underline text-[10px]"
                            >
                                + Alta Rápida
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">PROVEEDOR *</label>
                                <input
                                    type="text"
                                    placeholder="BUSCAR O INGRESAR PROVEEDOR..."
                                    value={supplierQuery}
                                    onChange={(e) => {
                                        setSupplierQuery(e.target.value);
                                        setIsSupplierDropdownOpen(true);
                                        setSelectedSupplier(null);
                                    }}
                                    onFocus={() => setIsSupplierDropdownOpen(true)}
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none"
                                />

                                {isSupplierDropdownOpen && supplierQuery.trim() && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                                        {filteredSuppliers.length > 0 ? (
                                            filteredSuppliers.map(s => (
                                                <div
                                                    key={s.id}
                                                    onMouseDown={() => handleSelectSupplier(s)}
                                                    className="p-2.5 hover:bg-emerald-50 cursor-pointer text-xs uppercase font-bold text-slate-800 transition-colors"
                                                >
                                                    {s.name}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-2 text-center text-[10px] text-slate-400 italic">
                                                Se registrará nuevo: <strong className="text-emerald-700 uppercase">{supplierQuery}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">FECHA</label>
                                <input
                                    type="date"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 font-medium bg-slate-50 outline-none text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">TIPO DOC</label>
                                    <select
                                        value={docType}
                                        onChange={(e: any) => setDocType(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1.5 font-bold uppercase bg-slate-50 outline-none text-xs"
                                    >
                                        <option value="PRESUPUESTO">PRESUPUESTO</option>
                                        <option value="REMITO">REMITO</option>
                                        <option value="FACTURA">FACTURA</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Nº DOC</label>
                                    <input
                                        type="text"
                                        placeholder="0001-0000..."
                                        value={docNumber}
                                        onChange={(e) => setDocNumber(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA CENTRAL: PRODUCTOS */}
                <div className="lg:col-span-5 flex flex-col gap-3 h-full overflow-hidden">
                    <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-xs shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="CÓDIGO O NOMBRE DE PRODUCTO..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsProductDropdownOpen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filteredProducts.length > 0) {
                                        handleAddToCart(filteredProducts[0]);
                                    }
                                }}
                                className="w-full text-sm font-bold placeholder-slate-400 text-slate-800 outline-none uppercase bg-transparent px-2"
                            />
                            <button
                                onClick={handleOpenQuickProductModal}
                                className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase shadow-xs shrink-0 flex items-center gap-1"
                            >
                                ➕ Alta al Vuelo
                            </button>
                        </div>

                        {isProductDropdownOpen && searchQuery.trim() && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleAddToCart(p)}
                                            className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs uppercase"
                                        >
                                            <div>
                                                <span className="font-mono font-bold text-slate-500 mr-2">[{p.code}]</span>
                                                <span className="font-bold text-slate-800">{p.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-emerald-700 text-sm">Costo: $ {p.cost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center space-y-2">
                                        <p className="text-xs text-slate-500">No se encontró el producto "<strong className="uppercase">{searchQuery}</strong>"</p>
                                        <button
                                            onClick={handleOpenQuickProductModal}
                                            className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold uppercase hover:bg-emerald-500"
                                        >
                                            ➕ Dar de Alta al Vuelo
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>REMITO / FACTURA EN CARGA ({safeCart.length})</span>
                            <span>Subtotal: ${currentInvoiceSubtotal.toLocaleString()}</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2">Código</th>
                                        <th className="p-2">Producto</th>
                                        <th className="p-2 text-center">Cant.</th>
                                        <th className="p-2 text-right">Costo Unit.</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                        <th className="p-2 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {paginatedCart.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-slate-400 italic text-xs">
                                                Agregue productos a este comprobante.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedCart.map(item => (
                                            <tr key={item.productId} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono font-bold text-slate-600">{item.code}</td>
                                                <td className="p-2 font-bold text-slate-800">{item.name}</td>
                                                <td className="p-2 text-center">
                                                    <input
                                                        ref={(el) => { quantityInputRefs.current[item.productId!] = el; }}
                                                        type="number"
                                                        min="1"
                                                        placeholder=""
                                                        value={item.quantity === ('' as unknown as number) ? '' : item.quantity}
                                                        onChange={(e) => handleSetQuantity(item.productId!, e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-16 text-center font-bold border border-slate-200 rounded p-1 bg-slate-50 outline-none text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 text-right">
                                                    <input
                                                        type="number"
                                                        value={item.unitCost === 0 ? '' : item.unitCost}
                                                        onChange={(e) => handleUpdateCost(item.productId!, e.target.value === '' ? 0 : Number(e.target.value))}
                                                        onFocus={(e) => e.target.select()}
                                                        className="w-20 text-right font-mono border border-slate-200 rounded p-1 bg-slate-50 outline-none text-xs"
                                                    />
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-slate-800">$ {((item.unitCost || 0) * (Number(item.quantity) || 0)).toLocaleString()}</td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.productId!)}
                                                        className="text-rose-500 hover:text-rose-700 font-bold"
                                                    >✕</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* BARRA DE PAGINACIÓN */}
                        <div className="py-1.5 px-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-600">
                            <span>Pág. {cartPage} de {totalCartPages} ({safeCart.length} ítems)</span>
                            <div className="space-x-1">
                                <button
                                    disabled={cartPage === 1}
                                    onClick={() => setCartPage(p => Math.max(p - 1, 1))}
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded disabled:opacity-40"
                                >◀</button>
                                <button
                                    disabled={cartPage >= totalCartPages}
                                    onClick={() => setCartPage(p => Math.min(p + 1, totalCartPages))}
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded disabled:opacity-40"
                                >▶</button>
                            </div>
                        </div>

                        <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                            <button
                                onClick={handleAddInvoiceToBatch}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                                📥 Guardar Comprobante en el Lote
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: BANDEJA DE LOTE */}
                <div className="lg:col-span-4 flex flex-col gap-3 shrink-0 h-full overflow-hidden">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1 shrink-0">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                2. Comprobantes Acumulados ({batchInvoices.length})
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 py-2">
                            {paginatedInvoices.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs italic">
                                    No hay comprobantes guardados en el lote aún. Arme un comprobante y presione "Guardar Comprobante en el Lote".
                                </div>
                            ) : (
                                paginatedInvoices.map((inv, idx) => {
                                    const indexReal = (invoicesPage - 1) * invoicesPerPage + idx;
                                    const invSub = inv.items.reduce((acc, i) => acc + i.unitCost * i.quantity, 0);
                                    const invUnits = inv.items.reduce((acc, i) => acc + i.quantity, 0);
                                    return (
                                        <div key={indexReal} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                                            <div className="flex justify-between items-start font-bold text-slate-800">
                                                <div>
                                                    <span className="text-emerald-700 font-bold uppercase">{inv.supplierName || 'PROVEEDOR SIN NOMBRE'}</span>
                                                    <span className="text-[10px] font-mono text-slate-500 ml-2">({inv.docType} {inv.docNumber || 'S/N'})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditInvoiceFromBatch(indexReal)}
                                                        className="text-slate-500 hover:text-slate-800 font-bold text-[11px]"
                                                        title="Editar Comprobante"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveInvoiceFromBatch(indexReal)}
                                                        className="text-rose-600 hover:text-rose-800 font-bold"
                                                        title="Eliminar Comprobante"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                                                <span>{invUnits} u. en {inv.items.length} productos</span>
                                                <span className="font-bold text-slate-900">$ {invSub.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* PAGINADOR DE COMPROBANTES */}
                        <div className="py-1 px-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-600 shrink-0">
                            <span>Pág. {invoicesPage} de {totalInvoicesPages}</span>
                            <div className="space-x-1">
                                <button
                                    disabled={invoicesPage === 1}
                                    onClick={() => setInvoicesPage(p => Math.max(p - 1, 1))}
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded disabled:opacity-40"
                                >◀</button>
                                <button
                                    disabled={invoicesPage >= totalInvoicesPages}
                                    onClick={() => setInvoicesPage(p => Math.min(p + 1, totalInvoicesPages))}
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded disabled:opacity-40"
                                >▶</button>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-2 space-y-2 shrink-0">
                            <div>
                                <button
                                    onClick={() => setIsFreightModalOpen(true)}
                                    className={`w-full py-2.5 border rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-between px-3 ${globalFreight === 0
                                            ? 'bg-rose-100 border-rose-400 text-rose-900 shadow-sm ring-2 ring-rose-300 animate-pulse'
                                            : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                                        }`}
                                >
                                    <div className="flex flex-col text-left">
                                        <span>🛞 Gastos de Transporte / Viaje</span>
                                        {globalFreight === 0 && <span className="text-[9px] text-rose-700 font-black">⚠️ OBLIGATORIO CARGAR ANTES DE CONFIRMAR</span>}
                                    </div>
                                    <span className="font-mono text-sm font-bold">${globalFreight.toLocaleString()}</span>
                                </button>
                                {globalFreight > 0 && batchTotalUnits > 0 && (
                                    <span className="text-[10px] text-emerald-700 font-medium block text-right mt-0.5">
                                        Prorrateo estimado: ~${Math.round(globalFreight / batchTotalUnits)} por unidad física
                                    </span>
                                )}
                            </div>

                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs space-y-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Subtotal Mercaderías:</span>
                                    <span className="font-mono text-white">$ {batchTotalSubtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Gastos Transporte/Viaje:</span>
                                    <span className="font-mono text-amber-400">$ {globalFreight.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-slate-800 pt-1 flex justify-between items-baseline">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">TOTAL LOTE:</span>
                                    <span className="text-xl font-black font-mono text-emerald-400">
                                        $ {grandTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleRegisterBatch}
                                disabled={isSubmittingBatch || batchInvoices.length === 0}
                                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs uppercase shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {isSubmittingBatch ? 'Procesando Salida...' : '💾 Confirmar Salida y Prorratear Flete'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* MODAL: GASTOS */}
            {isFreightModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-4 space-y-3 font-sans">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5 text-emerald-800">
                                🛞 Cargar Gastos de Transporte y Viaje (Obligatorio)
                            </h3>
                            <button onClick={() => setIsFreightModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">COMBUSTIBLE / NAFTA / GNC ($)</label>
                                <input
                                    type="number"
                                    value={expFuel === 0 ? '' : expFuel}
                                    onChange={(e) => setExpFuel(e.target.value === '' ? 0 : Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">PEAJES ($)</label>
                                <input
                                    type="number"
                                    value={expTolls === 0 ? '' : expTolls}
                                    onChange={(e) => setExpTolls(e.target.value === '' ? 0 : Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">ALMUERZO / VIÁTICOS ($)</label>
                                <input
                                    type="number"
                                    value={expLunch === 0 ? '' : expLunch}
                                    onChange={(e) => setExpLunch(e.target.value === '' ? 0 : Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">OTROS GASTOS DE SALIDA ($)</label>
                                <input
                                    type="number"
                                    value={expOthers === 0 ? '' : expOthers}
                                    onChange={(e) => setExpOthers(e.target.value === '' ? 0 : Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold outline-none bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                            <div className="text-xs font-bold text-slate-800">
                                Total Gastos: <span className="font-mono text-emerald-700 text-sm">${globalFreight.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => setIsFreightModalOpen(false)}
                                className="px-4 py-1.5 bg-emerald-700 text-white rounded text-xs font-bold uppercase hover:bg-emerald-600 shadow-xs"
                            >
                                💾 Aplicar Gastos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PROVEEDOR */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-4 space-y-3 font-sans">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
                                🏢 Alta Rápida de Proveedor
                            </h3>
                            <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                        </div>

                        {supError && (
                            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium">
                                {supError}
                            </div>
                        )}

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">RAZÓN SOCIAL / NOMBRE *</label>
                                <input
                                    type="text"
                                    value={newSupName}
                                    onChange={(e) => setNewSupName(e.target.value)}
                                    placeholder="EJ: VIVERO SAN JOSÉ"
                                    className="w-full border border-slate-200 rounded p-1.5 font-bold uppercase outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">TELÉFONO DE CONTACTO</label>
                                <input
                                    type="text"
                                    value={newSupPhone}
                                    onChange={(e) => setNewSupPhone(e.target.value)}
                                    placeholder="11-XXXX-XXXX"
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">DIRECCIÓN / LOCALIDAD</label>
                                <input
                                    type="text"
                                    value={newSupAddress}
                                    onChange={(e) => setNewSupAddress(e.target.value)}
                                    placeholder="EJ: MORENO 1234"
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase outline-none bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                            <button
                                onClick={() => setIsSupplierModalOpen(false)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveQuickSupplier}
                                className="px-4 py-1.5 bg-emerald-700 text-white rounded text-xs font-bold uppercase hover:bg-emerald-600 shadow-xs"
                            >
                                💾 Guardar Proveedor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PRODUCTO AL VUELO */}
            {isQuickProductModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-4 space-y-3 font-sans">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
                                🌿 Alta Rápida de Producto al Vuelo
                            </h3>
                            <button onClick={() => setIsQuickProductModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                        </div>

                        {quickError && (
                            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium">
                                {quickError}
                            </div>
                        )}

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">NOMBRE / DESCRIPCIÓN *</label>
                                <input
                                    type="text"
                                    value={quickName}
                                    onChange={(e) => setQuickName(e.target.value)}
                                    placeholder="EJ: POTUS VERDE N12"
                                    className="w-full border border-slate-200 rounded p-1.5 font-bold uppercase outline-none bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">CATEGORÍA * (SELECCIONE)</label>
                                <select
                                    value={quickCategoryId}
                                    onChange={(e) => setQuickCategoryId(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 font-bold uppercase outline-none bg-slate-50"
                                >
                                    <option value="">-- SELECCIONE CATEGORÍA --</option>
                                    {categoriesDb.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} (Margen Sugerido: {c.defaultMargin}%)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">COSTO BASE ($)</label>
                                    <input
                                        type="number"
                                        value={quickCost === 0 ? '' : quickCost}
                                        onChange={(e) => setQuickCost(e.target.value === '' ? 0 : Number(e.target.value))}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold outline-none bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">TAMAÑO</label>
                                    <input
                                        type="text"
                                        placeholder="EJ: N12 / 3L"
                                        value={quickTamano}
                                        onChange={(e) => setQuickTamano(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1.5 font-medium uppercase outline-none bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">COLOR</label>
                                    <input
                                        type="text"
                                        placeholder="EJ: VERDE"
                                        value={quickColor}
                                        onChange={(e) => setQuickColor(e.target.value)}
                                        className="w-full border border-slate-200 rounded p-1.5 font-medium uppercase outline-none bg-slate-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                            <button
                                onClick={() => setIsQuickProductModalOpen(false)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveQuickProduct}
                                className="px-4 py-1.5 bg-emerald-700 text-white rounded text-xs font-bold uppercase hover:bg-emerald-600 shadow-xs"
                            >
                                💾 Guardar y Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}