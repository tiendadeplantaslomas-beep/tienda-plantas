'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getProducts } from '@/actions/product-actions';

interface ProductItem {
    id: string;
    code: string;
    name: string;
    cost: number;
    price: number;
    stock: number;
}

interface CartItem extends ProductItem {
    quantity: number;
}

export default function PosFastPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [useScanner, setUseScanner] = useState(true);
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
            return [...prev, { ...product, quantity: 1 }];
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
                .filter(Boolean) as CartItem[]
        );
    };

    const handleRemoveItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <div className="flex flex-col h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans">
            <header className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black tracking-wider uppercase text-emerald-400">⚡ Caja Rápida (POS)</span>
                    <span className="text-xs text-slate-400">|</span>
                    <Link href="/dashboard" className="text-xs text-slate-300 hover:text-white font-medium transition-colors">
                        ← Volver al Dashboard
                    </Link>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 font-bold text-emerald-300">
                        Caja Activa: Principal
                    </span>
                    <span className="text-slate-300 font-medium">Daniel Urraca</span>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
                <div className="lg:col-span-2 hidden lg:flex flex-col gap-2 shrink-0">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Menú Pedidos</h3>
                        <div className="space-y-1">
                            <button className="w-full text-left px-2.5 py-1.5 rounded text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex justify-between items-center">
                                <span>Pendientes</span>
                                <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">1</span>
                            </button>
                            <button className="w-full text-left px-2.5 py-1.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 flex justify-between items-center">
                                <span>Atendidos</span>
                                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">4</span>
                            </button>
                            <button className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium hover:bg-slate-100 text-slate-600">
                                Entregados
                            </button>
                            <button className="w-full text-left px-2.5 py-1.5 rounded text-xs font-medium hover:bg-slate-100 text-slate-600">
                                Borrador
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Acciones</h3>
                        <button
                            onClick={() => setCart([])}
                            className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition-colors text-center"
                        >
                            🗑️ Limpiar Carrito
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-7 flex flex-col gap-3 h-full overflow-hidden">
                    <div className="flex gap-2 shrink-0">
                        <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-bold text-xs shadow-2xs">Nuevo</button>
                        <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-bold text-xs shadow-2xs">Guardar</button>
                        <button className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs shadow-2xs">Cobrar / Atendido</button>
                        <div className="flex-1"></div>
                        <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-bold text-xs shadow-2xs">Imprimir</button>
                    </div>

                    <div className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Ingrese un producto o escanee código..."
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
                                className="w-full text-lg font-bold placeholder-slate-400 text-slate-800 outline-none uppercase bg-transparent px-2"
                            />
                            <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase shadow-sm">
                                Buscar
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={useScanner}
                                    onChange={(e) => setUseScanner(e.target.checked)}
                                    className="rounded accent-slate-900"
                                />
                                <span className="font-medium">Usar Scanner</span>
                            </label>
                        </div>

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
                                            <span className="text-slate-500">Stock: {p.stock} u.</span>
                                            <span className="font-mono font-bold text-emerald-700 text-sm">$ {p.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2.5">Cod. Ref</th>
                                        <th className="p-2.5">Descripción</th>
                                        <th className="p-2.5 text-center">Cant.</th>
                                        <th className="p-2.5 text-right">P.U [$]</th>
                                        <th className="p-2.5 text-right">P.T [$]</th>
                                        <th className="p-2.5 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {cart.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-slate-400 italic text-xs">
                                                No hay productos en el carrito actual.
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
                                                <td className="p-2.5 text-right font-mono">$ {item.price.toLocaleString()}</td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-800">$ {(item.price * item.quantity).toLocaleString()}</td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded"
                                                        title="Eliminar ítem"
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

                <div className="lg:col-span-3 flex flex-col gap-3 shrink-0">
                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total a pagar:</span>
                        <div className="text-3xl font-black font-mono text-emerald-400">
                            $ {totalAmount.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1">
                            Total de unidades: <strong className="text-white">{totalUnits} u.</strong>
                        </p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Datos del Comprobante
                        </h3>
                        <div className="space-y-1 text-slate-600 font-medium">
                            <p><strong className="text-slate-800">Pedido:</strong> #_2026081201</p>
                            <p><strong className="text-slate-800">Vendedor:</strong> Vendedor Local</p>
                            <p><strong className="text-slate-800">Cliente:</strong> Mostrador General</p>
                            <p><strong className="text-slate-800">Forma de pago:</strong> Contado / Efectivo</p>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 flex-1">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Observaciones</h3>
                            <button className="text-slate-400 hover:text-slate-700 font-bold">+</button>
                        </div>
                        <textarea
                            placeholder="Agregar nota al pedido..."
                            className="w-full h-20 text-xs border border-slate-200 rounded p-2 uppercase bg-slate-50 focus:ring-1 focus:ring-slate-900 outline-none resize-none"
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
}