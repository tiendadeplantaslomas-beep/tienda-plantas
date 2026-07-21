'use client';

import { useState, useEffect } from 'react';
import { getCategories, getProducts, saveProduct, deleteProduct } from '@/app/actions/product-actions';

interface Category {
    id: string;
    name: string;
    defaultMargin: number;
}

interface Product {
    id: string;
    code: string;
    name: string;
    categoryId: string;
    cost: number;
    price: number;
    stock: number;
    category?: Category;
}

export default function ProductosPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Estados del Formulario
    const [selectedId, setSelectedId] = useState<string>('');
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [cost, setCost] = useState<number | ''>('');
    const [price, setPrice] = useState<number | ''>('');
    const [stock, setStock] = useState<number>(0);
    const [activeMargin, setActiveMargin] = useState<number>(0);

    // Cargar datos iniciales
    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
            setCategories(cats);
            setProducts(prods as unknown as Product[]);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Recalcular el precio de venta dinámicamente según costo y categoría
    const handleCategoryOrCostChange = (newCategoryId: string, newCost: number | '') => {
        const selectedCat = categories.find((c) => c.id === newCategoryId);
        const margin = selectedCat ? selectedCat.defaultMargin : 0;
        setActiveMargin(margin);

        if (typeof newCost === 'number' && newCost > 0) {
            const calculatedPrice = newCost * (1 + margin / 100);
            setPrice(Math.round(calculatedPrice)); // Redondeamos a números enteros
        } else {
            setPrice('');
        }
    };

    const handleResetForm = () => {
        setSelectedId('');
        setCode('');
        setName('');
        setCategoryId('');
        setCost('');
        setPrice('');
        setStock(0);
        setActiveMargin(0);
    };

    const handleEdit = (prod: Product) => {
        setSelectedId(prod.id);
        setCode(prod.code);
        setName(prod.name);
        setCategoryId(prod.categoryId);
        setCost(prod.cost);
        setPrice(prod.price);
        setStock(prod.stock);

        const cat = categories.find((c) => c.id === prod.categoryId);
        setActiveMargin(cat ? cat.defaultMargin : 0);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage(null);

        const formData = new FormData();
        if (selectedId) formData.append('id', selectedId);
        formData.append('code', code);
        formData.append('name', name);
        formData.append('categoryId', categoryId);
        formData.append('cost', cost.toString());
        formData.append('price', price.toString());
        formData.append('stock', stock.toString());

        const result = await saveProduct(formData);

        if (result?.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: selectedId ? 'Producto actualizado.' : 'Producto guardado con éxito.' });
            handleResetForm();
            loadData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que querés eliminar este producto?')) return;
        const res = await deleteProduct(id);
        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: 'Producto eliminado.' });
            loadData();
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <header className="border-b pb-4">
                <h1 className="text-3xl font-bold text-emerald-800">🪴 Gestión de Productos del Vivero</h1>
                <p className="text-slate-600">Alta, modificación y cálculo de precios por margen comercial.</p>
            </header>

            {message && (
                <div
                    className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                >
                    {message.text}
                </div>
            )}

            {/* FORMULARIO */}
            <section className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-slate-800">
                    {selectedId ? '✏️ Editar Producto' : '➕ Cargar Nuevo Producto'}
                </h2>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">CÓDIGO (Ej: PLT-003)</label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                            placeholder="PLT-001"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">NOMBRE DEL PRODUCTO</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                            placeholder="Monstera Deliciosa 15L"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">CATEGORÍA</label>
                        <select
                            required
                            value={categoryId}
                            onChange={(e) => {
                                setCategoryId(e.target.value);
                                handleCategoryOrCostChange(e.target.value, cost);
                            }}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Seleccionar --</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name} ({cat.defaultMargin}% margen)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">COSTO DE COMPRA ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={cost}
                            onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : '';
                                setCost(val);
                                handleCategoryOrCostChange(categoryId, val);
                            }}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                            placeholder="1000.00"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                            PRECIO VENTA ($) <span className="text-emerald-600 font-normal">(Margen: +{activeMargin}%)</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-emerald-50/50 font-semibold text-emerald-900 border-emerald-300 focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">STOCK INICIAL</label>
                        <input
                            type="number"
                            required
                            value={stock}
                            onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="md:col-span-2 flex items-end gap-2">
                        <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
                        >
                            {selectedId ? 'Actualizar Producto' : 'Guardar Producto'}
                        </button>
                        {selectedId && (
                            <button
                                type="button"
                                onClick={handleResetForm}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm transition"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </section>

            {/* TABLA DE PRODUCTOS */}
            <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Inventario Actual</h3>
                    <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                        {products.length} productos
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Cargando inventario...</div>
                ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-100 text-xs text-slate-500 uppercase border-b">
                            <tr>
                                <th className="py-3 px-4">Código</th>
                                <th className="py-3 px-4">Producto</th>
                                <th className="py-3 px-4">Categoría</th>
                                <th className="py-3 px-4 text-right">Costo</th>
                                <th className="py-3 px-4 text-right">Precio</th>
                                <th className="py-3 px-4 text-center">Stock</th>
                                <th className="py-3 px-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">{p.code}</td>
                                    <td className="py-3 px-4 font-medium text-slate-800">{p.name}</td>
                                    <td className="py-3 px-4">{p.category?.name || '-'}</td>
                                    <td className="py-3 px-4 text-right">${p.cost.toLocaleString('es-AR')}</td>
                                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                                        ${p.price.toLocaleString('es-AR')}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-bold ${p.stock > 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}
                                        >
                                            {p.stock} u.
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center space-x-2">
                                        <button
                                            onClick={() => handleEdit(p)}
                                            className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 px-2.5 py-1 rounded font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="text-xs bg-rose-100 text-rose-800 hover:bg-rose-200 px-2.5 py-1 rounded font-medium"
                                        >
                                            Borrar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}