'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { getProducts } from '@/actions/product-actions';

interface ProductItem {
    id: string;
    code: string;
    name: string;
    cost: number;
    price: number;
    stock: number;
}

interface PurchaseItem extends ProductItem {
    quantity: number;
    unitCost: number;
}

export default function ComprasPosPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [cart, setCart] = useState<PurchaseItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [freightCost, setFreightCost] = useState<number>(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProducts();
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const loadProducts = async () => {
        try {
            const data = await getProducts();
            setProducts(data as any);
        } catch (err) {
            console.error('Error al cargar productos:', err);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return products.filter(
            p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const handleAddToCart = (product: ProductItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1, unitCost: product.cost || 0 }];
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

    return (

        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 text-slate-800 overflow-hidden font-sans">

            {/* CUERPO PRINCIPAL EN 3 COLUMNAS PARA COMPRAS */}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* COLUMNA IZQUIERDA: ESTADOS Y PROVEEDOR */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Datos del Proveedor
                        </h3>
                        <div className="space-y-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">PROVEEDOR *</label>
                                <input
                                    type="text"
                                    placeholder="BUSCAR O SELECCIONAR..."
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Nº COMPROBANTE</label>
                                <input
                                    type="text"
                                    placeholder="0001-0000..."
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs flex-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Opciones de Compras
                        </h3>
                        <button
                            onClick={() => setCart([])}
                            className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition-colors text-center"
                        >
                            🗑️ Limpiar Comprobante
                        </button>
                    </div>

                </div>

                {/* COLUMNA CENTRAL: BUSCADOR DE PRODUCTOS Y GRILLA */}
                <div className="lg:col-span-6 flex flex-col gap-3 h-full overflow-hidden">

                    {/* BUSCADOR GIGANTE DE PRODUCTOS PARA COMPRA */}
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

                        {/* DESPLEGABLE PREDICTIVO */}
                        {isDropdownOpen && filteredProducts.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                {filteredProducts.map(p => (
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
                                            <span className="text-slate-500">Stock Actual: {p.stock} u.</span>
                                            <span className="font-mono font-bold text-emerald-700 text-sm">Costo: $ {p.cost.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* GRILLA DE ÍTEMS DE COMPRA */}
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
                                                        className="text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded"
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

                {/* COLUMNA DERECHA: TOTALES, FLETES Y REGISTRO */}
                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">

                    {/* COSTOS Y FLETES */}
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

                    {/* TARJETA DE TOTAL COMPROBANTE */}
                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Comprobante:</span>
                        <div className="text-3xl font-black font-mono text-emerald-400">
                            $ {totalFinal.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1">
                            Items cargados: <strong className="text-white">{totalUnits} u.</strong>
                        </p>
                    </div>

                    {/* BOTÓN DE ACCIÓN FINAL */}
                    <button className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs uppercase shadow-sm transition-colors">
                        💾 Registrar Comprobante
                    </button>

                </div>

            </div>
        </div>
    );
}