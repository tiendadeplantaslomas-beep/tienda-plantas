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

interface Client {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
}

interface Order {
    id: string;
    createdAt: string;
    client: string;
    clientEmail: string;
    total: number;
    paidAmount?: number;
    pendingBalance?: number;
    status: 'REGISTRADO' | 'ENTREGADO';
    isPaid: boolean;
    paymentStatus?: 'PAGADO' | 'PAGO PARCIAL' | 'PENDIENTE';
    isShipping: boolean;
    shippingAddress: string;
    items: CartItem[];
    channel: 'POS' | 'ONLINE';
    invoiced: boolean;
    invoiceNumber?: string;
    invoiceType?: 'FACTURA_A' | 'FACTURA_B' | 'CONSUMIDOR_FINAL';
}

interface CommerceSettings {
    commerceName?: string;
    address?: string;
    cuit?: string;
    phone?: string;
    email?: string;
    iibb?: string;
    startActivityDate?: string;
}

export default function VentasPosPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [settings, setSettings] = useState<CommerceSettings | null>(null);

    const [isOrderActive, setIsOrderActive] = useState(false);
    const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    const [clientsDb, setClientsDb] = useState<Client[]>([]);
    const [clientQuery, setClientQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientAddress, setNewClientAddress] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');

    const [isShipping, setIsShipping] = useState(false);
    const [shippingAddress, setShippingAddress] = useState('');

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [dateFrom, setDateFrom] = useState(todayStr);
    const [dateTo, setDateTo] = useState(todayStr);
    const [paymentFilter, setPaymentFilter] = useState<'TODOS' | 'PENDIENTES' | 'PAGADOS'>('TODOS');

    const [orders, setOrders] = useState<Order[]>([]);

    const [previewModal, setPreviewModal] = useState<{
        order: Order;
        mode: 'RECEIPT' | 'INVOICE';
    } | null>(null);

    const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
    const [montoAplicarInput, setMontoAplicarInput] = useState<number>(0);

    const [targetEmail, setTargetEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);
    const newClientAddressInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const prodData = await getProducts();
                setProducts(prodData as any);

                const resCustomers = await fetch('/api/customers');
                if (resCustomers.ok) {
                    const customersData = await resCustomers.json();
                    setClientsDb(customersData);
                }

                const resSettings = await fetch('/api/settings');
                if (resSettings.ok) {
                    const settingsData = await resSettings.json();
                    setSettings(settingsData);
                }

                const resOrders = await fetch('/api/orders');
                if (resOrders.ok) {
                    const ordersData = await resOrders.json();
                    setOrders(ordersData);
                }
            } catch (err) {
                console.error('Error al cargar datos iniciales:', err);
            }
        };

        loadInitialData();
    }, []);

    const handleAbrirModalPago = (order: Order) => {
        const saldo = order.pendingBalance !== undefined ? order.pendingBalance : (order.isPaid ? 0 : order.total);
        setMontoAplicarInput(saldo);
        setPaymentModalOrder({ ...order });
    };

    useEffect(() => {
        const initAutocomplete = () => {
            if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) return;

            const options = {
                componentRestrictions: { country: 'ar' },
                fields: ['address_components', 'formatted_address', 'geometry'],
            };

            const processPlace = (place: any, setAddressFn: (addr: string) => void) => {
                if (!place.address_components) {
                    if (place.formatted_address) {
                        setAddressFn(place.formatted_address.toUpperCase());
                    }
                    return;
                }

                let street = '';
                let number = '';
                let locality = '';
                let administrativeArea = '';

                for (const component of place.address_components) {
                    const types = component.types;
                    if (types.includes('street_number')) number = component.long_name;
                    if (types.includes('route')) street = component.long_name;
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) locality = component.long_name;
                    if (types.includes('administrative_area_level_1')) administrativeArea = component.short_name;
                }

                let finalFormatted = '';
                if (street) {
                    finalFormatted = `${street} ${number}`.trim();
                    finalFormatted += locality ? `, ${locality}` : `, LOMAS DE ZAMORA`;
                    if (administrativeArea) finalFormatted += `, ${administrativeArea}`;
                } else if (place.formatted_address) {
                    finalFormatted = place.formatted_address;
                }

                setAddressFn(finalFormatted.toUpperCase());
            };

            if (isShipping && addressInputRef.current) {
                const acShipping = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, options);
                acShipping.addListener('place_changed', () => {
                    const place = acShipping.getPlace();
                    processPlace(place, setShippingAddress);
                });
            }

            if (isCreatingClient && newClientAddressInputRef.current) {
                const acNewClient = new (window as any).google.maps.places.Autocomplete(newClientAddressInputRef.current, options);
                acNewClient.addListener('place_changed', () => {
                    const place = acNewClient.getPlace();
                    processPlace(place, setNewClientAddress);
                });
            }
        };

        if ((window as any).google && (window as any).google.maps) {
            initAutocomplete();
        } else {
            const timer = setInterval(() => {
                if ((window as any).google && (window as any).google.maps) {
                    initAutocomplete();
                    clearInterval(timer);
                }
            }, 500);
            return () => clearInterval(timer);
        }
    }, [isShipping, isCreatingClient]);

    const handleStartNewOrder = () => {
        const nextId = (Math.floor(1000 + Math.random() * 9000)).toString();
        setActiveOrderNumber(nextId);
        setEditingOrderId(null);
        setCart([]);
        setClientQuery('');
        setSelectedClient(null);
        setIsShipping(false);
        setShippingAddress('');
        setIsCreatingClient(false);
        setIsOrderActive(true);

        setTimeout(() => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }, 100);
    };

    const handleCancelCurrentOrder = () => {
        setIsOrderActive(false);
        setActiveOrderNumber(null);
        setEditingOrderId(null);
        setCart([]);
        setClientQuery('');
        setSelectedClient(null);
        setIsShipping(false);
        setShippingAddress('');
        setIsCreatingClient(false);
    };

    const handleStartEditOrder = (order: Order) => {
        setIsOrderActive(true);
        setActiveOrderNumber(order.id);
        setEditingOrderId(order.id);
        setCart([...order.items]);
        setClientQuery(order.client);
        setIsShipping(order.isShipping);
        setShippingAddress(order.shippingAddress || '');
        if (order.clientEmail) setNewClientEmail(order.clientEmail);

        setTimeout(() => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }, 100);
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        setClientQuery(client.name);
        setIsClientDropdownOpen(false);
        setIsCreatingClient(false);
        if (client.address) {
            setShippingAddress(client.address);
            setIsShipping(true);
        }
    };

    const handleSaveClientToDatabase = async () => {
        const clientData = {
            name: newClientName.trim().toUpperCase(),
            phone: newClientPhone.trim(),
            address: newClientAddress.trim().toUpperCase(),
            email: newClientEmail.trim().toLowerCase()
        };

        try {
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error del servidor (${response.status})`);
            }

            const createdClient: Client = await response.json();
            setClientsDb(prev => [createdClient, ...prev]);
            setSelectedClient(createdClient);
            setClientQuery(createdClient.name);

            if (createdClient.address) {
                setShippingAddress(createdClient.address);
                setIsShipping(true);
            }

            setIsCreatingClient(false);
            setNewClientName('');
            setNewClientPhone('');
            setNewClientAddress('');
            setNewClientEmail('');
            setIsClientDropdownOpen(false);

            alert('¡Cliente registrado exitosamente!');
        } catch (error: any) {
            console.error('Error detallado al guardar cliente:', error);
            alert(`No se pudo guardar el cliente: ${error.message}`);
        }
    };

    const handleAddToCart = (product: ProductItem) => {
        if (!isOrderActive) return;
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

    const handleConfirmSale = async () => {
        if (!isOrderActive) return;
        if (cart.length === 0) {
            alert('El carrito está vacío. Agregue al menos un producto.');
            return;
        }

        const clientNameFinal = selectedClient ? selectedClient.name : (clientQuery.trim() ? clientQuery.toUpperCase() : 'CLIENTE MOSTRADOR');
        const clientEmailFinal = selectedClient?.email || newClientEmail || 'sin_email@pos.com';
        const finalOrderId = activeOrderNumber || (Math.floor(1000 + Math.random() * 9000)).toString();

        const orderPayload = {
            id: finalOrderId,
            createdAt: new Date().toISOString(),
            client: clientNameFinal,
            clientEmail: clientEmailFinal,
            total: totalAmount,
            paidAmount: 0,
            pendingBalance: totalAmount,
            status: 'REGISTRADO',
            isPaid: false,
            paymentStatus: 'PENDIENTE',
            // <---method: 'EFECTIVO',  Asegúrate de que aquí también diga 'method' y no 'paymentMethod'
            paymentReference: '',
            isShipping,
            shippingAddress,
            items: [...cart],
            channel: 'POS',
            invoiced: false
        };

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Error del servidor (${response.status})`);
            }

            if (editingOrderId) {
                setOrders(prev => prev.map(ord => ord.id === editingOrderId ? orderPayload : ord));
                alert(`Operación #${editingOrderId} actualizada exitosamente en el servidor.`);
            } else {
                setOrders([orderPayload, ...orders]);
                alert(`¡Pedido #${orderPayload.id} registrado como PENDIENTE en el servidor con éxito!`);
            }

            handleCancelCurrentOrder();
        } catch (error: any) {
            console.error('Error al guardar el pedido:', error);
            alert(`No se pudo registrar el pedido en el servidor: ${error.message}`);
        }
    };

    const handleOpenPreview = (order: Order, mode: 'RECEIPT' | 'INVOICE') => {
        setTargetEmail(order.clientEmail || '');
        setPreviewModal({ order, mode });
    };

    const handleSavePaymentChanges = async (order: Order) => {
        if (montoAplicarInput <= 0) {
            alert('Por favor ingrese un monto válido a aplicar.');
            return;
        }

        const montoAplicadoActual = order.paidAmount || 0;
        const nuevoMontoAbonado = montoAplicadoActual + montoAplicarInput;
        const remanente = order.total - nuevoMontoAbonado;

        let nuevoEstado: 'PAGADO' | 'PAGO PARCIAL' | 'PENDIENTE' = 'PENDIENTE';
        let estaPagado = false;

        if (nuevoMontoAbonado >= order.total) {
            nuevoEstado = 'PAGADO';
            estaPagado = true;
        } else if (nuevoMontoAbonado > 0) {
            nuevoEstado = 'PAGO PARCIAL';
            estaPagado = false;
        }

        const paymentPayload = {
            saleId: order.id,
            amount: montoAplicarInput,
            method: order.paymentMethod, // <--- CORREGIDO: cambiado de paymentMethod a method
            reference: order.paymentReference || ''
        };

        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentPayload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `Error del servidor (Código ${response.status})`);
            }

            const updatedOrder: Order = {
                ...order,
                paidAmount: nuevoMontoAbonado,
                pendingBalance: remanente > 0 ? remanente : 0,
                isPaid: estaPagado,
                paymentStatus: nuevoEstado
            };

            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            setPaymentModalOrder(null);
            alert(`¡Pago de $ ${montoAplicarInput.toLocaleString()} registrado con éxito en la base de datos!`);

        } catch (error: any) {
            console.error('Error al guardar el pago:', error);
            alert(`No se pudo registrar el pago: ${error.message}`);
        }
    };

    const handleSendEmailFromPreview = async () => {
        if (!previewModal) return;
        if (!targetEmail.trim()) {
            alert('Por favor ingrese un e-mail de destino.');
            return;
        }

        setIsSendingEmail(true);

        try {
            const response = await fetch(`/api/orders/${previewModal.order.id}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: previewModal.mode,
                    email: targetEmail.trim()
                })
            });

            if (response.ok) {
                alert(`¡Documento enviado exitosamente a ${targetEmail}!`);
            } else {
                alert(`[Modo Simulación] Documento enviado a ${targetEmail}`);
            }
        } catch (error) {
            alert(`[Modo Simulación] Documento enviado a ${targetEmail}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleGenerateInvoiceFromPreview = () => {
        if (!previewModal) return;
        const invType = 'FACTURA_B';
        const invNumber = `0001-${Math.floor(10000000 + Math.random() * 90000000)}`;

        const updatedOrder: Order = {
            ...previewModal.order,
            invoiced: true,
            invoiceNumber: invNumber,
            invoiceType: invType
        };

        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setPreviewModal({ order: updatedOrder, mode: 'INVOICE' });

        alert(`Factura Electrónica (${invType} N° ${invNumber}) generada.`);
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return products.filter(
            p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const filteredClients = useMemo(() => {
        if (!clientQuery.trim()) return [];
        const q = clientQuery.toLowerCase();
        return clientsDb.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }, [clientsDb, clientQuery]);

    const filteredOrders = useMemo(() => {
        return orders.filter(ord => {
            const ordDate = ord.createdAt.split('T')[0];
            const inDateRange = ordDate >= dateFrom && ordDate <= dateTo;

            let inPaymentFilter = true;
            if (paymentFilter === 'PENDIENTES') inPaymentFilter = !ord.isPaid;
            if (paymentFilter === 'PAGADOS') inPaymentFilter = ord.isPaid;

            return inDateRange && inPaymentFilter;
        });
    }, [orders, dateFrom, dateTo, paymentFilter]);

    const countTodos = orders.length;
    const countPendientesPago = orders.filter(o => !o.isPaid).length;
    const countPagados = orders.filter(o => o.isPaid).length;

    const saldoPendienteActual = paymentModalOrder
        ? (paymentModalOrder.pendingBalance !== undefined ? paymentModalOrder.pendingBalance : (paymentModalOrder.isPaid ? 0 : paymentModalOrder.total))
        : 0;
    const diferenciaCtaCte = saldoPendienteActual - montoAplicarInput;

    return (

        /*<div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 text-slate-800 overflow-hidden font-sans">*/
        /*<div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6 space-y-4">*/
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-100 rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6 space-y-4">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                <div className="lg:col-span-3 hidden lg:flex flex-col gap-2 shrink-0 overflow-hidden">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Historial Operaciones</h3>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Desde</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full text-xs border border-slate-200 rounded p-1 font-mono font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Hasta</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full text-xs border border-slate-200 rounded p-1 font-mono font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                        <div className="space-y-1">
                            <button
                                onClick={() => setPaymentFilter('TODOS')}
                                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold flex justify-between items-center transition-colors ${paymentFilter === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                <span>Todas las operaciones</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-400 text-white">{countTodos}</span>
                            </button>
                            <button
                                onClick={() => setPaymentFilter('PENDIENTES')}
                                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold flex justify-between items-center transition-colors ${paymentFilter === 'PENDIENTES' ? 'bg-amber-600 text-white' : 'bg-amber-50 hover:bg-amber-100 text-amber-800'}`}
                            >
                                <span>Pendientes de Pago</span>
                                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">{countPendientesPago}</span>
                            </button>
                            <button
                                onClick={() => setPaymentFilter('PAGADOS')}
                                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold flex justify-between items-center transition-colors ${paymentFilter === 'PAGADOS' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'}`}
                            >
                                <span>Pagados</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">{countPagados}</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex-1 overflow-y-auto space-y-2">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Listado ({paymentFilter}) - {filteredOrders.length} op.
                        </h3>
                        {filteredOrders.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic text-center py-4">No hay operaciones en este estado.</p>
                        ) : (
                            filteredOrders.map(ord => (
                                <div key={ord.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1.5">
                                    <div className="flex justify-between font-bold text-slate-800">
                                        <span>#{ord.id} - {ord.client}</span>
                                        <span className="text-emerald-700 font-mono">$ {ord.total.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                        <span>Canal: <strong className="text-slate-700">{ord.channel}</strong></span>
                                        <span className={`px-1.5 py-0.5 rounded font-bold ${ord.paymentStatus === 'PAGADO' || ord.isPaid
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : ord.paymentStatus === 'PAGO PARCIAL'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}>
                                            {ord.paymentStatus || (ord.isPaid ? 'PAGADO' : 'PENDIENTE')}
                                        </span>
                                    </div>

                                    {ord.pendingBalance !== undefined && ord.pendingBalance > 0 && ord.pendingBalance < ord.total && (
                                        <div className="text-[10px] font-bold text-amber-700">
                                            Resta abonar: $ {ord.pendingBalance.toLocaleString()}
                                        </div>
                                    )}

                                    {ord.isShipping && (
                                        <div className="text-[10px] text-slate-600 bg-amber-50 p-1 rounded border border-amber-200">
                                            🚚 {ord.shippingAddress}
                                        </div>
                                    )}

                                    <div className="pt-1 border-t border-slate-200 flex flex-wrap gap-1.5 items-center">
                                        <button
                                            onClick={() => handleStartEditOrder(ord)}
                                            className="text-slate-700 font-bold hover:underline text-[10px]"
                                        >
                                            ✏️ Editar
                                        </button>

                                        <button
                                            onClick={() => handleOpenPreview(ord, 'RECEIPT')}
                                            className="text-slate-700 font-bold hover:underline text-[10px]"
                                        >
                                            👁️ Ver
                                        </button>

                                        <button
                                            onClick={() => handleAbrirModalPago(ord)}
                                            className="text-emerald-700 font-bold hover:underline text-[10px]"
                                        >
                                            💳 Pago
                                        </button>

                                        <button
                                            onClick={() => handleOpenPreview(ord, 'INVOICE')}
                                            className="text-indigo-700 font-bold hover:underline text-[10px]"
                                        >
                                            🧾 {ord.invoiced ? 'Ver Factura' : 'Facturar'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="lg:col-span-6 flex flex-col gap-3 h-full overflow-hidden">
                    <div className="flex items-center gap-2 shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        {!isOrderActive ? (
                            <button
                                onClick={handleStartNewOrder}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                            >
                                <span>+ NUEVO PEDIDO</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-900 text-emerald-400 font-mono font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-700">
                                    {editingOrderId ? `EDITANDO #${editingOrderId}` : `NUEVO PEDIDO #${activeOrderNumber}`}
                                </span>
                                <button
                                    onClick={handleCancelCurrentOrder}
                                    className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded font-bold text-xs border border-rose-200 transition-colors"
                                >
                                    ✕ Cancelar
                                </button>
                            </div>
                        )}

                        <div className="flex-1 text-center">
                            {!isOrderActive && (
                                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                    ⚠️ Presione "+ NUEVO PEDIDO" para iniciar pedido
                                </span>
                            )}
                        </div>

                        <Link href="/caja" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs border border-slate-300 transition-colors flex items-center">
                            Ir a Caja →
                        </Link>
                    </div>

                    <div className={`relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 transition-all ${!isOrderActive ? 'opacity-40 pointer-events-none select-none bg-slate-50' : ''}`}>
                        <div className="flex items-center gap-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                disabled={!isOrderActive}
                                placeholder={isOrderActive ? "BUSCAR POR CÓDIGO O NOMBRE DE PRODUCTO..." : "PRESIONE '+ NUEVO PEDIDO' PARA BUSCAR"}
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

                        {isDropdownOpen && filteredProducts.length > 0 && isOrderActive && (
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

                    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden transition-all ${!isOrderActive ? 'opacity-40 pointer-events-none select-none bg-slate-50' : ''}`}>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="p-2.5">Cód. Ref</th>
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
                                                {isOrderActive ? "El carrito está vacío. Busque un producto arriba." : "Terminal en espera. Inicie un pedido para comenzar."}
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

                <div className={`lg:col-span-3 flex flex-col gap-3 shrink-0 overflow-y-auto transition-all ${!isOrderActive ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs relative">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente</h3>
                            {selectedClient ? (
                                <button
                                    onClick={() => { setSelectedClient(null); setClientQuery(''); setShippingAddress(''); setIsCreatingClient(false); }}
                                    className="text-rose-600 font-bold hover:underline"
                                >
                                    Quitar
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingClient(!isCreatingClient)}
                                    className="text-emerald-700 font-bold hover:underline"
                                >
                                    {isCreatingClient ? '✕ Cancelar' : '+ Alta Rápida'}
                                </button>
                            )}
                        </div>

                        {isCreatingClient ? (
                            <div className="p-2.5 bg-slate-50 border border-emerald-300 rounded-lg space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Alta Rápida</span>
                                    <button onClick={() => setIsCreatingClient(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
                                </div>

                                <input
                                    type="text"
                                    placeholder="NOMBRE COMPLETO *"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-white outline-none text-xs"
                                />

                                <input
                                    type="text"
                                    placeholder="TELÉFONO *"
                                    value={newClientPhone}
                                    onChange={(e) => setNewClientPhone(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 font-mono uppercase bg-white outline-none text-xs"
                                />

                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">📍</span>
                                    <input
                                        ref={newClientAddressInputRef}
                                        type="text"
                                        placeholder="DIRECCIÓN *"
                                        value={newClientAddress}
                                        onChange={(e) => setNewClientAddress(e.target.value.toUpperCase())}
                                        className="w-full border border-slate-200 rounded p-1.5 pl-7 uppercase bg-white outline-none text-xs"
                                    />
                                </div>

                                <input
                                    type="email"
                                    placeholder="E-MAIL (PARA COMPROBANTE/FACTURA) *"
                                    value={newClientEmail}
                                    onChange={(e) => setNewClientEmail(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-1.5 lowercase bg-white outline-none text-xs"
                                />

                                <button
                                    onClick={handleSaveClientToDatabase}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase shadow-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    💾 Guardar Cliente
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="BUSCAR CLIENTE O PASANTE..."
                                    value={clientQuery}
                                    onChange={(e) => {
                                        setClientQuery(e.target.value);
                                        setIsClientDropdownOpen(true);
                                        setSelectedClient(null);
                                    }}
                                    onFocus={() => setIsClientDropdownOpen(true)}
                                    className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none"
                                />

                                {isClientDropdownOpen && clientQuery.trim() && (
                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-100">
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => handleSelectClient(c)}
                                                    className="p-2 hover:bg-slate-50 cursor-pointer text-xs uppercase"
                                                >
                                                    <div className="font-bold text-slate-800">{c.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">Tel: {c.phone || 'S/N'} | Mail: {c.email || 'S/N'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-2.5 text-center space-y-2">
                                                <p className="text-[10px] text-slate-400 italic">No se encontró el cliente.</p>
                                                <button
                                                    onClick={() => {
                                                        setNewClientName(clientQuery);
                                                        setIsCreatingClient(true);
                                                        setIsClientDropdownOpen(false);
                                                    }}
                                                    className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] uppercase"
                                                >
                                                    + Registrar "{clientQuery.toUpperCase()}"
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
                            Logística de Entrega
                        </h3>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isShipping}
                                    onChange={(e) => setIsShipping(e.target.checked)}
                                    className="rounded accent-slate-900"
                                />
                                <span className="font-bold text-slate-700">🚚 Envío a domicilio</span>
                            </label>

                            {isShipping && (
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[9px] text-slate-400 font-bold">DIRECCIÓN (AUTOCOMPLETADO GOOGLE)</label>
                                        {shippingAddress && (
                                            <button
                                                type="button"
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shippingAddress)}`, '_blank')}
                                                className="text-[9px] text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                📍 Abrir Mapa
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (shippingAddress) {
                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shippingAddress)}`, '_blank');
                                                }
                                            }}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:scale-110 transition-transform cursor-pointer"
                                        >
                                            📍
                                        </button>
                                        <input
                                            ref={addressInputRef}
                                            type="text"
                                            placeholder="INGRESE CALLE, NÚMERO, LOCALIDAD..."
                                            value={shippingAddress}
                                            onChange={(e) => setShippingAddress(e.target.value.toUpperCase())}
                                            className="w-full border border-slate-200 rounded p-1.5 pl-7 uppercase font-medium bg-slate-50 outline-none text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Pedido:</span>
                            <div className="text-3xl font-black font-mono text-emerald-400">
                                $ {totalAmount.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-slate-400 pt-0.5">
                                Cliente: <strong className="text-white">{selectedClient ? selectedClient.name : (clientQuery.trim() ? clientQuery.toUpperCase() : 'MOSTRADOR')}</strong>
                            </p>
                        </div>

                        <button
                            onClick={handleConfirmSale}
                            disabled={!isOrderActive}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold text-xs uppercase shadow-sm transition-colors text-center cursor-pointer"
                        >
                            {editingOrderId ? `✓ Guardar Cambios en #${editingOrderId}` : `✓ Registrar Pedido Pendiente #${activeOrderNumber || ''}`}
                        </button>
                    </div>
                </div>
            </div>

            {paymentModalOrder && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-extrabold text-sm uppercase tracking-wider">Gestión de Pago / Cobro</h3>
                                <p className="text-[10px] text-slate-400 font-mono">Orden #{paymentModalOrder.id} - Total: ${paymentModalOrder.total.toLocaleString()}</p>
                            </div>
                            <button onClick={() => setPaymentModalOrder(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
                        </div>

                        <div className="p-5 space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                    Importe a Aplicar
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={montoAplicarInput}
                                        onChange={(e) => setMontoAplicarInput(parseFloat(e.target.value) || 0)}
                                        className="w-full border border-slate-300 rounded p-2 pl-7 font-mono font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Saldo pendiente actual:</span>
                                    <span className="font-mono font-bold">$ {saldoPendienteActual.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                                    <span className="text-slate-600 font-medium">Estado resultante:</span>
                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${diferenciaCtaCte <= 0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                        }`}>
                                        {diferenciaCtaCte <= 0 ? 'PAGADO' : 'PAGO PARCIAL'}
                                    </span>
                                </div>

                                {diferenciaCtaCte > 0 && (
                                    <div className="flex justify-between text-amber-700 font-bold pt-1">
                                        <span>Saldo remanente en Cta. Cte.:</span>
                                        <span className="font-mono">$ {diferenciaCtaCte.toLocaleString()}</span>
                                    </div>
                                )}

                                {diferenciaCtaCte < 0 && (
                                    <div className="flex justify-between text-emerald-700 font-bold pt-1">
                                        <span>Crédito a favor en Cta. Cte.:</span>
                                        <span className="font-mono">$ {Math.abs(diferenciaCtaCte).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Método de Pago</label>
                                <select
                                    value={paymentModalOrder.paymentMethod}
                                    onChange={(e) => setPaymentModalOrder({ ...paymentModalOrder, paymentMethod: e.target.value })}
                                    className="w-full border border-slate-200 rounded p-2 font-bold uppercase bg-slate-50 outline-none"
                                >
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                    <option value="TARJETA">Tarjeta de Débito / Crédito</option>
                                    <option value="MERCADOPAGO">Mercado Pago / Online</option>
                                    <option value="CTA_CTE">Cuenta Corriente</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nro. de Comprobante / Transacción (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="EJ: TR-998877 O CÓDIGO..."
                                    value={paymentModalOrder.paymentReference || ''}
                                    onChange={(e) => setPaymentModalOrder({ ...paymentModalOrder, paymentReference: e.target.value.toUpperCase() })}
                                    className="w-full border border-slate-200 rounded p-2 uppercase font-mono bg-slate-50 outline-none text-xs font-bold"
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setPaymentModalOrder(null)}
                                className="px-3 py-1.5 text-slate-600 font-bold hover:underline"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSavePaymentChanges(paymentModalOrder)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase shadow-xs"
                            >
                                Guardar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="font-extrabold text-sm uppercase tracking-wider">
                                    {previewModal.mode === 'INVOICE' ? 'Vista Previa - Factura Electrónica' : 'Vista Previa - Comprobante de Pedido'}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-mono">Orden #{previewModal.order.id} | {new Date(previewModal.order.createdAt).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setPreviewModal(null)}
                                className="text-slate-400 hover:text-white font-bold text-lg px-2"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-4 font-mono text-xs text-slate-800">
                            <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs space-y-4 print:border-none print:shadow-none">
                                <div className="flex justify-between items-start border-b pb-3">
                                    <div>
                                        <h3 className="font-bold text-lg">{settings?.commerceName || 'NUESTRO COMERCIO'}</h3>
                                        <p className="text-[10px] text-slate-500">{settings?.address || 'Dirección no configurada'}</p>
                                        {settings?.cuit && <p className="text-[10px] text-slate-500">CUIT: {settings.cuit}</p>}
                                        {settings?.phone && <p className="text-[10px] text-slate-500">Tel: {settings.phone}</p>}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold border px-2 py-1 rounded text-xs bg-slate-100">
                                            {previewModal.mode === 'INVOICE' ? (previewModal.order.invoiceType || 'FACTURA B') : 'PEDIDO PENDIENTE'}
                                        </span>
                                        {previewModal.order.invoiced && (
                                            <p className="text-[10px] font-bold text-emerald-700 mt-1">N° {previewModal.order.invoiceNumber}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded">
                                    <div>
                                        <strong>Cliente:</strong> {previewModal.order.client}<br />
                                        <strong>Estado Pago:</strong> {previewModal.order.paymentStatus || (previewModal.order.isPaid ? 'PAGADO' : 'PENDIENTE')}
                                    </div>
                                    <div>
                                        <strong>E-mail:</strong> {targetEmail || 'S/N'}<br />
                                        {previewModal.order.isShipping && (
                                            <span><strong>Envío:</strong> {previewModal.order.shippingAddress}</span>
                                        )}
                                    </div>
                                </div>

                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="border-b text-slate-500 uppercase text-[9px]">
                                        <tr>
                                            <th className="py-1">Cód</th>
                                            <th className="py-1">Descripción</th>
                                            <th className="py-1 text-center">Cant</th>
                                            <th className="py-1 text-right">Precio</th>
                                            <th className="py-1 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewModal.order.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-4 text-center text-slate-400 italic">Sin ítems en el detalle</td>
                                            </tr>
                                        ) : (
                                            previewModal.order.items.map((it, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-1.5">{it.code}</td>
                                                    <td className="py-1.5 font-bold">{it.name}</td>
                                                    <td className="py-1.5 text-center">{it.quantity}</td>
                                                    <td className="py-1.5 text-right">$ {it.price.toLocaleString()}</td>
                                                    <td className="py-1.5 text-right font-bold">$ {(it.price * it.quantity).toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                <div className="border-t pt-2 flex justify-between items-center text-base font-bold">
                                    <span>TOTAL:</span>
                                    <span className="text-emerald-700 font-mono text-xl">$ {previewModal.order.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                                <label className="block text-[10px] font-bold uppercase text-slate-500">Destinatario de Correo Electrónico:</label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={targetEmail}
                                        onChange={(e) => setTargetEmail(e.target.value)}
                                        placeholder="cliente@correo.com"
                                        className="flex-1 border border-slate-200 rounded px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 outline-none"
                                    />
                                    <button
                                        onClick={handleSendEmailFromPreview}
                                        disabled={isSendingEmail}
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs flex items-center gap-1"
                                    >
                                        <span>{isSendingEmail ? 'Enviando...' : '✉️ Enviar Mail'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
                            <button
                                onClick={() => setPreviewModal(null)}
                                className="px-3 py-1.5 text-slate-600 font-bold hover:underline text-xs"
                            >
                                Cerrar
                            </button>

                            <div className="flex gap-2">
                                {previewModal.mode === 'INVOICE' && !previewModal.order.invoiced && (
                                    <button
                                        onClick={handleGenerateInvoiceFromPreview}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs uppercase shadow-xs"
                                    >
                                        🧾 Emitir Factura Electrónica
                                    </button>
                                )}

                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase shadow-xs flex items-center gap-1"
                                >
                                    <span>🖨️ Imprimir</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}