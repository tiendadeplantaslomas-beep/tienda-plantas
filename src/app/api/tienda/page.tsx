'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, Check, AlertCircle } from 'lucide-react';

export default function TiendaPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    useEffect(() => {
        async function fetchProducts() {
            try {
                const res = await fetch('/api/products'); // O tu endpoint de productos actual
                const data = await res.json();
                if (res.ok) {
                    setProducts(data);
                }
            } catch (err) {
                console.error('Error al cargar productos:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    if (loading) {
        return <div className="text-center py-20 text-slate-500">Cargando catálogo del vivero...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 text-slate-800">
            <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl font-black text-emerald-900 tracking-tight">Catálogo de Plantas y Productos 🌿</h1>
                <p className="text-sm text-slate-500">Elegí tus favoritos, aprovechá tus promociones y pedí directo por WhatsApp.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => {
                    const noStock = product.stock <= 0;

                    return (
                        <div key={product.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                            <div>
                                {product.imageUrl && (
                                    <div className="h-48 overflow-hidden bg-slate-100">
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                                    </div>
                                )}
                                <div className="p-4 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                        Stock: {product.stock} un.
                                    </span>
                                    <h3 className="font-bold text-slate-900 text-sm mt-1">{product.name}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2">{product.description || 'Sin descripción'}</p>
                                </div>
                            </div>

                            <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-50 mt-4">
                                <span className="text-base font-black text-emerald-700">
                                    ${Number(product.price).toLocaleString()}
                                </span>
                                <button
                                    onClick={() => addToCart(product)}
                                    disabled={noStock}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                >
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    {noStock ? 'Sin Stock' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}