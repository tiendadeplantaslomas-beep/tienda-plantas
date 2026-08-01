'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

const ITEMS_PER_PAGE = 20;

export default function VentasPage() {
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

    // CARGA INICIAL
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

    // FILTRADO Y ORDEN A-Z
    const processedProducts = useMemo(() => {
        return products
            .filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category?.name && p.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }, [products, searchTerm]);

    // PAGINACIÓN
    const totalPages = Math.ceil(processedProducts.length / ITEMS_PER_PAGE) || 1;
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [processedProducts, currentPage]);

    // FILTRADO CLIENTES
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
        <div className="h-screen flex flex-col bg-slate-100/60 p-4 md:p-6 max-w-7xl mx-auto font-sans text-slate-800 overflow-hidden">

            {/* ENCABEZADO Y ACCIONES */}
            <header className="flex-shrink-0 flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">Punto de Venta (POS)</h1>
                    <p className="text-[11px] text-slate-500">Gestión rápida de facturación y mostrador.</p>
                </div>

                <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCart}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                        >
                            🗑️ Vaciar ({cart.length})
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={loadInitialData}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                        🔄 Recargar
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
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1">✕</button>
                </div>
            )}

            {/* CUERPO PRINCIPAL DIVIDIDO (Catálogo / Carrito) */}
            <div className="flex-1 mt-3 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">

                {/* IZQUIERDA: CATÁLOGO DE PRODUCTOS */}
                <div className="col-span-12 lg:col-span-8 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">

                    {/* BARRA DE BÚSQUEDA PREDICTIVA */}
                    <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 flex-shrink-0">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar por código, producto o categoría..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all uppercase"
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
                    <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 content-start">
                        {loadingProducts ? (
                            <div className="col-span-full p-12 text-center text-slate-400 text-xs font-medium">Cargando catálogo de productos...</div>
                        ) : paginatedProducts.length === 0 ? (
                            <div className="col-span-full p-12 text-center text-slate-400 flex flex-col items-center">
                                <span className="text-3xl mb-2">🪴</span>
                                <span className="text-xs font-semibold text-slate-600">No se encontraron productos coincidentes.</span>
                            </div>
                        ) : (
                            paginatedProducts.map(product => {
                                const isOut = product.trackStock && product.stock <= 0;
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !isOut && addToCart(product)}
                                        className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between select-none ${isOut
                                            ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                                            : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer active:scale-[0.98]'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-center gap-1 mb-1">
                                                <span className="font-mono text-[10px] text-slate-400">{product.code}</span>
                                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60 truncate max-w-[80px]">
                                                    {product.category?.name || 'GENERAL'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-xs text-slate-800 uppercase leading-snug line-clamp-2">{product.name}</h3>
                                        </div>

                                        <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-medium leading-none mb-1">
                                                    Stock: <strong className={isOut ? 'text-rose-600 font-bold' : 'text-slate-700 font-semibold'}>{product.stock}</strong>
                                                </span>
                                                <span className="text-xs font-bold text-emerald-700">${product.price.toLocaleString('es-AR')}</span>
                                            </div>
                                            <button
                                                disabled={isOut}
                                                className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 disabled:text-slate-500 shadow-sm transition-colors"
                                            >
                                                {isOut ? '✕' : '+'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* PAGINACIÓN COMPACTA */}
                    <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-semibold disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            « Anterior
                        </button>
                        <span className="font-bold text-slate-800">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-semibold disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-sm"
                        >
                            Siguiente »
                        </button>
                    </div>
                </div>

                {/* DERECHA: CARRITO DE COMPRA Y DETALLE DE COBRO */}
                <div className="col-span-12 lg:col-span-4 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">

                    {/* TITULO SECCIÓN */}
                    <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            🛒 Resumen de Venta
                        </h2>
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                            {cart.reduce((a, b) => a + b.quantity, 0)} ítems
                        </span>
                    </div>

                    {/* LISTA DEL CARRITO */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 divide-y divide-slate-100 bg-slate-50/30">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
                                <span className="text-3xl mb-1">🛍️</span>
                                <p className="text-xs font-semibold text-slate-600">El carrito está vacío</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Hacé clic en los productos para agregarlos</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.productId} className="py-2 flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-xs text-slate-800 uppercase truncate">{item.name}</h4>
                                        <span className="text-[10px] text-slate-400 font-medium">${item.unitPrice.toLocaleString('es-AR')} c/u</span>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 flex-shrink-0">
                                        <button
                                            onClick={() => updateQuantity(item.productId, -1)}
                                            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors"
                                        >-</button>
                                        <span className="w-5 text-center font-bold text-xs text-slate-800">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.productId, 1)}
                                            className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors"
                                        >+</button>
                                    </div>

                                    <div className="text-right flex-shrink-0 min-w-[60px]">
                                        <span className="font-bold text-xs text-slate-800 block">${(item.quantity * item.unitPrice).toLocaleString('es-AR')}</span>
                                        <button
                                            onClick={() => removeFromCart(item.productId)}
                                            className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                                        >Quitar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* FORMULARIO DE CLIENTE Y ENVÍO */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2.5 flex-shrink-0">

                        {/* SECCIÓN CLIENTE */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    👤 Cliente
                                    {selectedCustomer && <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[9px] font-bold">✔ OK</span>}
                                </label>
                                {!isCreatingCustomer && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreatingCustomer(true);
                                            setShowCustomerDropdown(false);
                                        }}
                                        className="text-[10px] font-bold text-emerald-700 hover:underline"
                                    >
                                        + Nuevo Cliente
                                    </button>
                                )}
                            </div>

                            {isCreatingCustomer ? (
                                <div className="p-2 bg-slate-100 rounded-lg border border-slate-300 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-700 uppercase">Alta Rápida de Cliente</span>
                                        <button onClick={() => setIsCreatingCustomer(false)} className="text-xs text-slate-400 hover:text-slate-700 font-bold">✕</button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nombre completo *"
                                        value={newCustomerName}
                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <input
                                            type="text"
                                            placeholder="Teléfono"
                                            value={newCustomerPhone}
                                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Dirección"
                                            value={newCustomerAddress}
                                            onChange={(e) => setNewCustomerAddress(e.target.value)}
                                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveCustomerToDB}
                                        disabled={savingCustomer}
                                        className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-sm disabled:opacity-50 transition-colors"
                                    >
                                        {savingCustomer ? 'Guardando...' : '💾 Guardar Cliente'}
                                    </button>
                                </div>
                            ) : (
                                <div className="relative" ref={customerDropdownRef}>
                                    <input
                                        type="text"
                                        placeholder="Buscar o ingresar nombre..."
                                        value={customerSearch}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerDropdown(true);
                                            if (selectedCustomer) setSelectedCustomer(null);
                                        }}
                                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs uppercase font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-6 transition-all ${selectedCustomer ? 'bg-emerald-50/60 border-emerald-400 font-bold' : 'bg-white border-slate-300'
                                            }`}
                                    />
                                    {customerSearch && (
                                        <button
                                            onClick={handleClearCustomer}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}

                                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 border border-slate-200 rounded-lg bg-white max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs shadow-xl z-50">
                                            {filteredCustomers.map(cust => (
                                                <div
                                                    key={cust.id}
                                                    onClick={() => handleSelectCustomer(cust)}
                                                    className="p-2 hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
                                                >
                                                    <span className="font-bold text-slate-800 uppercase">{cust.name}</span>
                                                    {cust.phone && <span className="text-[10px] font-mono text-slate-400">📞 {cust.phone}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ENVÍO Y MÉTODO DE PAGO */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 uppercase">
                                    <input
                                        type="checkbox"
                                        checked={isShipping}
                                        onChange={(e) => {
                                            setIsShipping(e.target.checked);
                                            if (!e.target.checked) setShippingAddress('');
                                        }}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                    />
                                    🚚 Envío
                                </label>
                            </div>

                            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                    className="w-full px-1 py-1 border-none text-xs font-bold bg-transparent text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="EFECTIVO">💵 EFECTIVO</option>
                                    <option value="TRANSFERENCIA">📲 TRANSF.</option>
                                    <option value="DEBITO">💳 DÉBITO</option>
                                    <option value="CREDITO">💳 CRÉDITO</option>
                                </select>
                            </div>
                        </div>

                        {/* DIRECCIÓN DE ENVÍO Y MAPA */}
                        {isShipping && (
                            <div className="flex gap-1.5 animate-in fade-in">
                                <input
                                    type="text"
                                    placeholder="DIRECCIÓN DE ENTREGA..."
                                    value={shippingAddress}
                                    onChange={(e) => setShippingAddress(e.target.value.toUpperCase())}
                                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs uppercase font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {shippingAddress && (
                                    <button
                                        type="button"
                                        onClick={() => openGoogleMaps(shippingAddress)}
                                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-lg border border-sky-300 shrink-0 transition-colors"
                                        title="Ver en Google Maps"
                                    >
                                        📍
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONFIRMACIÓN Y TOTAL FINAL */}
                    <div className="p-3 bg-slate-900 text-white flex-shrink-0 space-y-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="block text-[10px] font-medium text-slate-400 uppercase">Total a Cobrar</span>
                                <span className="text-[10px] text-slate-400 font-medium">({cart.reduce((a, b) => a + b.quantity, 0)} unidades)</span>
                            </div>
                            <span className="text-xl font-bold text-emerald-400">${totalCart.toLocaleString('es-AR')}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleProcessSale}
                            disabled={cart.length === 0 || loading}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <span>⏳ Procesando Venta...</span> : <span>✅ Confirmar y Registrar Venta</span>}
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}