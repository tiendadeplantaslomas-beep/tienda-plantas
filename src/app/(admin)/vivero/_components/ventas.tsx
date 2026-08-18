'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getProducts } from '@/actions/product-actions';
import { createSale, CartItemInput } from '@/actions/sale-actions';
import { createCustomer, getCustomers } from '@/actions/customer-actions';

interface Product {
    id: string;
    code: string;
    name: string;
    cost: number;
    otherCosts: number;
    price: number;
    stock: number;
    trackStock: boolean;
    category?: { name: string };
}

interface Customer {
    id: string;
    name: string;
    phone?: string;
    address?: string;
}

const ITEMS_PER_PAGE = 25; // 5 columnas x 5 filas

export default function VentasPage() {
    const [fechaActual, setFechaActual] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [cart, setCart] = useState<CartItemInput[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO' | 'CREDITO'>('EFECTIVO');

    // --- GESTIÓN DE CLIENTES ---
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // --- ALTA DE CLIENTE ---
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [savingCustomer, setSavingCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');

    // --- ENVÍO ---
    const [shippingAddress, setShippingAddress] = useState('');
    const [isShipping, setIsShipping] = useState(false);

    const [dbCustomers, setDbCustomers] = useState<Customer[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Formateo de fecha
    useEffect(() => {
        const hoy = new Date();
        const opciones: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const fechaStr = hoy.toLocaleDateString('es-AR', opciones);
        setFechaActual(fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1));
    }, []);

    // Carga Inicial
    const loadInitialData = async () => {
        setLoadingProducts(true);
        try {
            const [productsRes, customersRes] = await Promise.all([
                getProducts(),
                getCustomers(),
            ]);

            const parsedProducts = Array.isArray(productsRes) ? productsRes : (productsRes as any)?.products || (productsRes as any)?.data || [];
            const parsedCustomers = Array.isArray(customersRes) ? customersRes : (customersRes as any)?.customers || (customersRes as any)?.data || [];

            setProducts(parsedProducts);
            setDbCustomers(parsedCustomers);
        } catch {
            setMessage({ type: 'error', text: 'Error al conectar con la base de datos.' });
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // Cierra el dropdown de clientes si se hace clic afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Filtrado y Orden A-Z estricto
    const processedProducts = useMemo(() => {
        return products
            .filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category?.name && p.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }, [products, searchTerm]);

    // Paginación
    const totalPages = Math.ceil(processedProducts.length / ITEMS_PER_PAGE) || 1;
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [processedProducts, currentPage]);

    // Filtrado Clientes
    const filteredCustomers = (customerSearch.trim() === '' || selectedCustomer)
        ? []
        : dbCustomers.filter(c => {
            const term = customerSearch.toLowerCase().trim();
            return c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term);
        });

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
        setShowCustomerDropdown(false);

        if (customer.address) {
            setShippingAddress(customer.address);
            setIsShipping(true);
        }
    };

    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerSearch('');
        setShowCustomerDropdown(false);
        setShippingAddress('');
        setIsShipping(false);
    };

    const handleSaveCustomerToDB = async () => {
        if (!newCustomerName.trim()) {
            setMessage({ type: 'error', text: 'El nombre del cliente es obligatorio.' });
            return;
        }

        setSavingCustomer(true);
        setMessage(null);

        try {
            const res = await createCustomer({
                name: newCustomerName,
                phone: newCustomerPhone,
                address: newCustomerAddress,
            });

            if (res && res.success && res.customer) {
                const savedCust: Customer = {
                    id: res.customer.id,
                    name: res.customer.name,
                    phone: res.customer.phone || undefined,
                    address: res.customer.address || undefined,
                };

                setDbCustomers(prev => [...prev, savedCust]);
                handleSelectCustomer(savedCust);

                setIsCreatingCustomer(false);
                setNewCustomerName('');
                setNewCustomerPhone('');
                setNewCustomerAddress('');
                setMessage({ type: 'success', text: `¡Cliente "${savedCust.name}" registrado correctamente!` });
            } else {
                setMessage({ type: 'error', text: res?.error || 'No se pudo guardar el cliente.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Error al registrar el cliente.' });
        } finally {
            setSavingCustomer(false);
        }
    };

    const openGoogleMaps = (address: string) => {
        if (!address) return;
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    const addToCart = (product: Product) => {
        const existingIndex = cart.findIndex(item => item.productId === product.id);

        if (existingIndex > -1) {
            const updatedCart = [...cart];
            const currentQty = updatedCart[existingIndex].quantity;

            if (product.trackStock && currentQty + 1 > product.stock) {
                setMessage({ type: 'error', text: `Stock máximo alcanzado para ${product.name}.` });
                return;
            }

            updatedCart[existingIndex].quantity += 1;
            setCart(updatedCart);
        } else {
            if (product.trackStock && product.stock < 1) {
                setMessage({ type: 'error', text: `Sin stock disponible para ${product.name}.` });
                return;
            }

            setCart([...cart, {
                productId: product.id,
                code: product.code,
                name: product.name,
                quantity: 1,
                unitPrice: product.price,
                unitCost: product.cost + (product.otherCosts || 0),
            }]);
        }
        setMessage(null);
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.productId === productId) {
                const product = products.find(p => p.id === productId);
                const newQty = item.quantity + delta;

                if (newQty <= 0) return null;
                if (product && product.trackStock && newQty > product.stock) {
                    setMessage({ type: 'error', text: `Stock máximo alcanzado para ${product.name}.` });
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean) as CartItemInput[]);
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const clearCart = () => {
        setCart([]);
        handleClearCustomer();
    };

    const totalCart = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    const handleProcessSale = async () => {
        if (cart.length === 0) return;

        setLoading(true);
        setMessage(null);

        const finalCustomerName = selectedCustomer
            ? selectedCustomer.name
            : (customerSearch.trim() ? customerSearch.toUpperCase() : "CLIENTE OCASIONAL");

        const fullNotes = [
            isShipping && shippingAddress ? `ENVÍO A: ${shippingAddress.toUpperCase()}` : null,
        ].filter(Boolean).join(' | ');

        const res = await createSale({
            paymentMethod,
            customerName: finalCustomerName,
            notes: fullNotes || undefined,
            items: cart,
        });

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: '¡Venta registrada con éxito!' });
            clearCart();
            loadInitialData();
        }
        setLoading(false);
    };

    return (
        <div className="w-full flex flex-col font-sans text-slate-800 pb-2">

            {/* ENCABEZADO COMPACTO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1 px-1 gap-1">
                <div>
                    <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                        <span>🛒</span> Terminal de Ventas (POS)
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Catálogo y facturación ágil. &bull; {fechaActual}
                    </p>
                </div>
            </div>

            {/* NOTIFICACIONES */}
            {message && (
                <div className={`mb-1 px-2 py-0.5 rounded-md text-xs font-medium flex justify-between items-center transition-all ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-sm'
                    : 'bg-rose-50 text-rose-900 border border-rose-300 shadow-sm'
                    }`}>
                    <div className="flex items-center gap-1.5">
                        <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <span className="font-semibold text-xs">{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1">✕</button>
                </div>
            )}

            {/* CONTENEDOR PRINCIPAL EQUILIBRADO (445px): Mayor espacio interno manteniendo visible el footer */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start h-[445px]">

                {/* COLUMNA IZQUIERDA: CATÁLOGO (8 Columnas) */}
                <div className="md:col-span-8 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">

                    {/* BÚSQUEDA */}
                    <div className="p-1.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="BUSCAR POR CÓDIGO, PRODUCTO O CATEGORÍA..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-8 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all uppercase"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 hover:text-slate-700 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:inline">
                            Total: <strong className="text-slate-800">{processedProducts.length}</strong>
                        </span>
                    </div>

                    {/* GRILLA DE PRODUCTOS */}
                    <div className="p-1.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 content-start flex-1 overflow-y-auto">
                        {loadingProducts ? (
                            <div className="col-span-full p-10 text-center text-slate-400 text-xs font-medium">Cargando catálogo...</div>
                        ) : paginatedProducts.length === 0 ? (
                            <div className="col-span-full p-10 text-center text-slate-400 flex flex-col items-center justify-center">
                                <span className="text-xl mb-1">🪴</span>
                                <span className="text-xs font-semibold text-slate-600">No se encontraron productos coincidentes.</span>
                            </div>
                        ) : (
                            paginatedProducts.map(product => {
                                const isOut = product.trackStock && product.stock <= 0;
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !isOut && addToCart(product)}
                                        className={`p-1.5 rounded-lg border transition-all flex flex-col justify-between select-none ${isOut
                                            ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                                            : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer active:scale-[0.98]'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-center gap-1 mb-0.5">
                                                <span className="font-mono text-[8px] text-slate-400">{product.code}</span>
                                                <span className="text-[7px] font-bold uppercase px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60 truncate max-w-[65px]">
                                                    {product.category?.name || 'GRAL'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-[10px] text-slate-800 uppercase leading-tight line-clamp-2">{product.name}</h3>
                                        </div>

                                        <div className="mt-1 flex items-end justify-between border-t border-slate-100 pt-1">
                                            <div>
                                                <span className="text-[8px] text-slate-400 block font-medium leading-none mb-0.5">
                                                    Stk: <strong className={isOut ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>{product.stock}</strong>
                                                </span>
                                                <span className="text-[11px] font-bold text-emerald-700">${product.price.toLocaleString('es-AR')}</span>
                                            </div>
                                            <button
                                                disabled={isOut}
                                                className="w-5 h-5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:text-slate-500 shadow-sm transition-colors flex items-center justify-center"
                                            >
                                                {isOut ? '✕' : '+'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* PAGINACIÓN */}
                    <div className="p-1.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 shrink-0">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-2.5 py-0.5 bg-white border border-slate-300 rounded font-semibold disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm text-[11px]"
                        >
                            « Anterior
                        </button>
                        <span className="font-bold text-slate-800 text-[11px]">
                            Página {currentPage} de {totalPages} (A-Z)
                        </span>
                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-0.5 bg-white border border-slate-300 rounded font-semibold disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm text-[11px]"
                        >
                            Siguiente »
                        </button>
                    </div>
                </div>

                {/* COLUMNA DERECHA: CARRITO Y COBRO (4 Columnas) */}
                <div className="md:col-span-4 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden justify-between h-full">

                    {/* CABECERA CARRITO */}
                    <div className="p-1.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            🛒 Resumen
                        </h2>

                        <div className="flex items-center gap-1.5">
                            {cart.length > 0 && (
                                <button
                                    type="button"
                                    onClick={clearCart}
                                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[10px] font-bold rounded shadow-sm transition-colors flex items-center gap-1"
                                >
                                    🗑️ Vaciar ({cart.length})
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={loadInitialData}
                                className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[10px] font-bold rounded shadow-sm transition-colors flex items-center gap-1"
                                title="Recargar datos"
                            >
                                🔄 Recargar
                            </button>
                        </div>
                    </div>

                    {/* LISTA DE ITEMS CARRITO */}
                    <div className="p-1.5 divide-y divide-slate-100 bg-slate-50/20 flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-1">
                                <span className="text-lg mb-0.5">🛍️</span>
                                <p className="text-[10px] font-semibold text-slate-600">El carrito está vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.productId} className="py-1 flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-[10px] text-slate-800 uppercase truncate">{item.name}</h4>
                                        <span className="text-[8px] text-slate-400 font-medium">${item.unitPrice.toLocaleString('es-AR')} c/u</span>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0">
                                        <button
                                            onClick={() => updateQuantity(item.productId, -1)}
                                            className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-200 rounded"
                                        >-</button>
                                        <span className="w-3 text-center font-bold text-[10px] text-slate-800">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.productId, 1)}
                                            className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-200 rounded"
                                        >+</button>
                                    </div>

                                    <div className="text-right shrink-0 min-w-[45px]">
                                        <span className="font-bold text-[10px] text-slate-800 block">${(item.quantity * item.unitPrice).toLocaleString('es-AR')}</span>
                                        <button
                                            onClick={() => removeFromCart(item.productId)}
                                            className="text-[8px] font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                                        >Quitar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* BLOQUE INFERIOR DE DATOS DE VENTA */}
                    <div className="p-1.5 bg-slate-50 border-t border-slate-200 space-y-1 shrink-0">

                        {/* CLIENTE */}
                        <div className="bg-white p-1 rounded border border-slate-200 space-y-0.5 shadow-sm">
                            <div className="flex justify-between items-center">
                                <label className="text-[8px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    👤 Cliente
                                    {selectedCustomer && <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 text-[7px] font-bold">✔ OK</span>}
                                </label>
                                {!isCreatingCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingCustomer(true);
                                            setShowCustomerDropdown(false);
                                        }}
                                        className="text-[8px] font-bold text-emerald-700 hover:underline"
                                    >
                                        + Nuevo
                                    </button>
                                )}
                            </div>

                            {isCreatingCustomer ? (
                                <div className="p-1 bg-slate-100 rounded border border-slate-300 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-bold text-slate-700 uppercase">Alta Rápida</span>
                                        <button onClick={() => setIsCreatingCustomer(false)} className="text-[9px] text-slate-400 hover:text-slate-700 font-bold">✕</button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nombre completo *"
                                        value={newCustomerName}
                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                        className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <div className="grid grid-cols-2 gap-1">
                                        <input
                                            type="text"
                                            placeholder="Teléfono"
                                            value={newCustomerPhone}
                                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                                            className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Dirección"
                                            value={newCustomerAddress}
                                            onChange={(e) => setNewCustomerAddress(e.target.value)}
                                            className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveCustomerToDB}
                                        disabled={savingCustomer}
                                        className="w-full py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded shadow-sm disabled:opacity-50 transition-colors"
                                    >
                                        {savingCustomer ? 'Guardando...' : '💾 Guardar'}
                                    </button>
                                </div>
                            ) : (
                                <div className="relative" ref={customerDropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="BUSCAR O INGRESAR NOMBRE..."
                                        value={customerSearch}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerDropdown(true);
                                            if (selectedCustomer) setSelectedCustomer(null);
                                        }}
                                        className={`w-full px-2 py-0.5 border rounded text-[10px] uppercase font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-5 transition-all ${selectedCustomer ? 'bg-emerald-50/60 border-emerald-400 font-bold' : 'bg-white border-slate-300'
                                            }`}
                                    />
                                    {customerSearch && (
                                        <button
                                            onClick={handleClearCustomer}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold text-[9px]"
                                        >
                                            ✕
                                        </button>
                                    )}

                                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                                        <div className="absolute left-0 right-0 bottom-full mb-1 border border-slate-200 rounded bg-white max-h-24 overflow-y-auto divide-y divide-slate-100 text-[10px] shadow-xl z-50">
                                            {filteredCustomers.map(cust => (
                                                <div
                                                    key={cust.id}
                                                    onClick={() => handleSelectCustomer(cust)}
                                                    className="p-1 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
                                                >
                                                    <span className="font-bold text-slate-800 uppercase">{cust.name}</span>
                                                    {cust.phone && <span className="text-[8px] font-mono text-slate-400">📞 {cust.phone}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ENVÍO Y PAGO */}
                        <div className="grid grid-cols-2 gap-1">
                            <div className="bg-white p-1 rounded border border-slate-200 flex items-center justify-between shadow-sm">
                                <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={isShipping}
                                        onChange={(e) => {
                                            setIsShipping(e.target.checked);
                                            if (!e.target.checked) setShippingAddress('');
                                        }}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3 h-3"
                                    />
                                    🚚 Envío
                                </label>
                            </div>

                            <div className="bg-white p-0.5 rounded border border-slate-200 flex items-center shadow-sm">
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                    className="w-full px-1 py-0.5 border-none text-[10px] font-bold bg-transparent text-slate-700 outline-none cursor-pointer uppercase"
                                >
                                    <option value="EFECTIVO">💵 EFECTIVO</option>
                                    <option value="TRANSFERENCIA">📲 TRANSF.</option>
                                    <option value="DEBITO">💳 DÉBITO</option>
                                    <option value="CREDITO">💳 CRÉDITO</option>
                                </select>
                            </div>
                        </div>

                        {/* DIRECCIÓN DE ENVÍO */}
                        {isShipping && (
                            <div className="flex gap-1 animate-in fade-in">
                                <input
                                    type="text"
                                    placeholder="DIRECCIÓN DE ENTREGA..."
                                    value={shippingAddress}
                                    onChange={(e) => setShippingAddress(e.target.value.toUpperCase())}
                                    className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] uppercase font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {shippingAddress && (
                                    <button
                                        type="button"
                                        onClick={() => openGoogleMaps(shippingAddress)}
                                        className="px-1 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] font-bold rounded border border-sky-300 shrink-0 transition-colors"
                                        title="Ver en Google Maps"
                                    >
                                        📍
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONFIRMACIÓN Y TOTAL */}
                    <div className="p-2 bg-slate-900 text-white shrink-0 space-y-1">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="block text-[8px] font-medium text-slate-400 uppercase leading-none">Total a Cobrar</span>
                                <span className="text-[8px] text-slate-400 font-medium">({cart.reduce((a, b) => a + b.quantity, 0)} u.)</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-400">${totalCart.toLocaleString('es-AR')}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleProcessSale}
                            disabled={cart.length === 0 || loading}
                            className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] uppercase transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                            {loading ? <span>⏳ Procesando...</span> : <span>✅ Confirmar y Registrar Venta</span>}
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}