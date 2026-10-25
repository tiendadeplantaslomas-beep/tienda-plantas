'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getProducts } from '@/actions/product-actions';
import { getSuppliersForSelect, createPurchase, CreatePurchasePayload } from '@/actions/purchase-actions';

interface ProductItem {
    id: string;
    code: string;
    name: string;
    cost: number;
    price: number;
    stock: number;
    margin?: number;
}

interface PurchaseItem extends ProductItem {
    quantity: number;
    unitCost: number;
}

interface Supplier {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
}

export default function ComprasPosPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [cart, setCart] = useState<PurchaseItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [freightCost, setFreightCost] = useState<number>(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Estados para Proveedores y Alta Rápida
    const [suppliersDb, setSuppliersDb] = useState<Supplier[]>([]);
    const [supplierQuery, setSupplierQuery] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

    // Datos del comprobante
    const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [docNumber, setDocNumber] = useState('');
    const [docType, setDocType] = useState<'FACTURA' | 'REMITO' | 'PRESUPUESTO'>('FACTURA');

    // Estados recuperados para Alta Rápida con Teléfono y Dirección
    const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierPhone, setNewSupplierPhone] = useState('');
    const [newSupplierAddress, setNewSupplierAddress] = useState('');
    const [supplierError, setSupplierError] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadInitialData();
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const loadInitialData = async () => {
        try {
            const prodData = await getProducts();
            setProducts(prodData as any);

            const supData = await getSuppliersForSelect();
            setSuppliersDb(supData as any);
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
        setIsCreatingSupplier(false);
        setSupplierError(null);
    };

    const handleSaveSupplierQuick = () => {
        setSupplierError(null);
        if (!newSupplierName.trim()) {
            setSupplierError('⚠️ El nombre del proveedor es obligatorio.');
            return;
        }

        const supplierNameFormatted = newSupplierName.trim().toUpperCase();
        setSelectedSupplier(null);
        setSupplierQuery(supplierNameFormatted);
        setIsCreatingSupplier(false);
        setNewSupplierName('');
        setNewSupplierPhone('');
        setNewSupplierAddress('');
        setSupplierError(null);
        setIsSupplierDropdownOpen(false);
    };

    const handleAddToCart = (product: ProductItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1, unitCost: product.cost || 0, margin: product.margin || 100 }];
        });
        setSearchQuery('');
        setIsDropdownOpen(false);
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const handleUpdateQuantity = (id: string, delta: number) => {
        setCart(prev =>
            prev
                .map(item => {
                    if (item.id === id) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as PurchaseItem[]
        );
    };

    const handleUpdateCost = (id: string, newCost: number) => {
        setCart(prev =>
            prev.map(item => (item.id === id ? { ...item, unitCost: newCost } : item))
        );
    };

    const handleRemoveItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const subtotalAmount = cart.reduce((acc, item) => acc + (item.unitCost * item.quantity), 0);
    const totalFinal = subtotalAmount + freightCost;
    const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleRegisterPurchase = async () => {
        if (!supplierQuery.trim()) {
            alert('⚠️ Debe seleccionar o ingresar un proveedor obligatorio.');
            return;
        }
        if (cart.length === 0) {
            alert('⚠️ El comprobante de compra está vacío. Agregue al menos un producto.');
            return;
        }

        const payload: CreatePurchasePayload = {
            supplierId: selectedSupplier ? selectedSupplier.id : undefined,
            supplierName: !selectedSupplier ? supplierQuery.trim().toUpperCase() : undefined,
            docType: docType,
            docNumber: docNumber.trim() || undefined,
            date: purchaseDate,
            otherCostsTotal: freightCost,
            items: cart.map(item => ({
                productId: item.id,
                code: item.code,
                name: item.name,
                categoryId: item.id,
                quantity: item.quantity,
                unitCost: item.unitCost,
                margin: item.margin || 100
            }))
        };

        try {
            const res = await createPurchase(payload);

            if (res.error) {
                alert(`No se pudo registrar la compra: ${res.error}`);
                return;
            }

            alert('¡Comprobante de compra registrado con éxito, stock actualizado y costos prorrateados!');

            setCart([]);
            setDocNumber('');
            setFreightCost(0);
            setSelectedSupplier(null);
            setSupplierQuery('');
            loadInitialData();

        } catch (error: any) {
            console.error('Error al registrar compra:', error);
            alert(`No se pudo registrar la compra: ${error.message}`);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 text-slate-800 overflow-hidden font-sans">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* COLUMNA IZQUIERDA: PROVEEDOR Y NAVEGACIÓN */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                Datos del Proveedor
                            </h3>
                            {selectedSupplier ? (
                                <button
                                    onClick={() => { setSelectedSupplier(null); setSupplierQuery(''); setIsCreatingSupplier(false); setSupplierError(null); }}
                                    className="text-rose-600 font-bold hover:underline"
                                >
                                    Quitar
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setIsCreatingSupplier(!isCreatingSupplier); setSupplierError(null); }}
                                    className="text-emerald-700 font-bold hover:underline"
                                >
                                    {isCreatingSupplier ? '✕ Cancelar' : '+ Alta Rápida'}
                                </button>
                            )}
                        </div>

                        {/* FORMULARIO RESTAURADO DE ALTA RÁPIDA CON TELÉFONO Y DIRECCIÓN */}
                        {isCreatingSupplier ? (
                            <div className="p-2.5 bg-slate-50 border border-emerald-300 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Nuevo Proveedor</span>
                                    <button onClick={() => { setIsCreatingSupplier(false); setSupplierError(null); }} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                                </div>

                                {supplierError && (
                                    <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded-md font-medium">
                                        {supplierError}
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="RAZÓN SOCIAL / NOMBRE *"
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-white outline-none text-xs"
                                />

                                <input
                                    type="text"
                                    placeholder="TELÉFONO"
                                    value={newSupplierPhone}
                                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono uppercase bg-white outline-none text-xs"
                                />

                                <input
                                    type="text"
                                    placeholder="DIRECCIÓN"
                                    value={newSupplierAddress}
                                    onChange={(e) => setNewSupplierAddress(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase bg-white outline-none text-xs"
                                />

                                <button
                                    onClick={handleSaveSupplierQuick}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase shadow-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    💾 Listo
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">PROVEEDOR *</label>
                                    <input
                                        type="text"
                                        placeholder="BUSCAR PROVEEDOR..."
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
                                                        className="p-2.5 hover:bg-emerald-50 cursor-pointer text-xs uppercase font-bold text-slate-800 transition-colors flex justify-between items-center"
                                                    >
                                                        <span>{s.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-center text-[10px] text-slate-400 italic">
                                                    Se registrará como: <strong className="text-emerald-700 uppercase">{supplierQuery}</strong>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">FECHA COMPROBANTE</label>
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
                                            <option value="FACTURA">FACTURA</option>
                                            <option value="REMITO">REMITO</option>
                                            <option value="PRESUPUESTO">PRESUPUESTO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Nº COMPROBANTE</label>
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
                        )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 mb-2">
                                Opciones y Reportes
                            </h3>
                            <Link
                                href="/compras/historial"
                                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase transition-colors text-center flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                📜 Historial de Compras
                            </Link>
                        </div>

                        <button
                            onClick={() => setCart([])}
                            className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition-colors text-center cursor-pointer"
                        >
                            🗑️ Limpiar Comprobante
                        </button>
                    </div>
                </div>

                {/* COLUMNA CENTRAL: PRODUCTOS */}
                <div className="lg:col-span-6 flex flex-col gap-3 h-full overflow-hidden">
                    <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="ESCRIBÍ CÓDIGO O NOMBRE DE PLANTA/PRODUCTO..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filteredProducts.length > 0) {
                                        handleAddToCart(filteredProducts[0]);
                                    }
                                }}
                                className="w-full text-base font-bold placeholder-slate-400 text-slate-800 outline-none uppercase bg-transparent px-2"
                            />
                            <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-sm">
                                Buscar
                            </button>
                        </div>

                        {isDropdownOpen && filteredProducts.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                {filteredProducts.map(p => {
                                    const sinStock = p.stock <= 0;
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => handleAddToCart(p)}
                                            className={`p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs uppercase ${sinStock ? 'bg-rose-50/40 hover:bg-rose-50' : ''}`}
                                        >
                                            <div>
                                                <span className="font-mono font-bold text-slate-500 mr-2">[{p.code}]</span>
                                                <span className="font-bold text-slate-800">{p.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold ${sinStock ? 'text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded text-[10px]' : 'text-slate-500'}`}>
                                                    Stock Actual: {p.stock} u.
                                                </span>
                                                <span className="font-mono font-bold text-emerald-700 text-sm">Costo: $ {p.cost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2.5">Código</th>
                                        <th className="p-2.5">Producto</th>
                                        <th className="p-2.5 text-center">Cant.</th>
                                        <th className="p-2.5 text-right">Costo Unit. [$]</th>
                                        <th className="p-2.5 text-right">Subtotal [$]</th>
                                        <th className="p-2.5 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400 italic text-xs">
                                                No hay productos agregados al comprobante de compra.
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono font-bold text-slate-600">{item.code}</td>
                                                <td className="p-2.5 font-bold text-slate-800">{item.name}</td>
                                                <td className="p-2.5 text-center">
                                                    <div className="inline-flex items-center gap-1 bg-slate-100 rounded border border-slate-200 px-1 py-0.5">
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.id, -1)}
                                                            className="px-1 text-slate-500 hover:text-slate-900 font-bold"
                                                        >-</button>
                                                        <span className="font-bold px-1">{item.quantity}</span>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.id, 1)}
                                                            className="px-1 text-slate-500 hover:text-slate-900 font-bold"
                                                        >+</button>
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        value={item.unitCost}
                                                        onChange={(e) => handleUpdateCost(item.id, Number(e.target.value))}
                                                        className="w-20 text-right font-mono border border-slate-200 rounded p-1 bg-slate-50 outline-none"
                                                    />
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-slate-800">$ {(item.unitCost * item.quantity).toLocaleString()}</td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                                                        title="Eliminar"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: TOTALES Y REGISTRO */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Prorrata y Gastos
                        </h3>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">FLETE / GASTOS VARIOS ($)</label>
                            <input
                                type="number"
                                value={freightCost}
                                onChange={(e) => setFreightCost(Number(e.target.value))}
                                className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold bg-slate-50 outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Comprobante:</span>
                        <div className="text-3xl font-black font-mono text-emerald-400">
                            $ {totalFinal.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1">
                            Items cargados: <strong className="text-white">{totalUnits} u.</strong>
                        </p>
                    </div>

                    <button
                        onClick={handleRegisterPurchase}
                        className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs uppercase shadow-sm transition-colors cursor-pointer"
                    >
                        💾 Registrar Comprobante
                    </button>
                </div>

            </div>
        </div>
    );
}