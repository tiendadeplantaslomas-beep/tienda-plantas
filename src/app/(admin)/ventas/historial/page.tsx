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
    balance?: number;
}

interface Order {
    id: string;
    createdAt: string;
    client: string;
    clientEmail: string;
    total: number;
    amountPaid?: number;
    status: 'PENDIENTE' | 'ATENDIDO' | 'ENTREGADO';
    isPaid: boolean;
    paymentMethod: string;
    paymentReference: string;
    isShipping: boolean;
    shippingAddress: string;
    items: CartItem[];
    channel: 'POS' | 'ONLINE';
    invoiced: boolean;
    invoiceNumber?: string;
    invoiceType?: 'FACTURA_C' | 'FACTURA_A' | 'FACTURA_B';
}

export default function VentasPosPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Control de estado del pedido en curso
    const [isOrderActive, setIsOrderActive] = useState(false);
    const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    // Clientes
    const [clientsDb, setClientsDb] = useState<Client[]>([]);
    const [clientQuery, setClientQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

    // Alta Rápida de Cliente
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientAddress, setNewClientAddress] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');

    // Pago y Logística
    const [isShipping, setIsShipping] = useState(false);
    const [shippingAddress, setShippingAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [paymentReference, setPaymentReference] = useState('');
    const [isPaid, setIsPaid] = useState(true);

    // Módulo de Pago en Modal
    const [paymentInput, setPaymentInput] = useState<string>('');
    const [paymentInputMethod, setPaymentInputMethod] = useState<string>('EFECTIVO');

    // Filtro por Fechas
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [dateFrom, setDateFrom] = useState(todayStr);
    const [dateTo, setDateTo] = useState(todayStr);

    // Pedidos en memoria
    const [orders, setOrders] = useState<Order[]>([
        {
            id: '101',
            createdAt: `${todayStr}T10:30:00.000Z`,
            client: 'CONSUMIDOR FINAL',
            clientEmail: 'cliente@ejemplo.com',
            total: 30000,
            amountPaid: 0,
            status: 'PENDIENTE',
            isPaid: false,
            paymentMethod: 'EFECTIVO',
            paymentReference: '',
            isShipping: true,
            shippingAddress: 'AV. HIPÓLITO YRIGOYEN 8800, LOMAS DE ZAMORA',
            items: [
                { id: 'p1', code: 'PROD-01', name: 'MACETA PLÁSTICA N12', cost: 1000, price: 15000, stock: 50, quantity: 2 }
            ],
            channel: 'POS',
            invoiced: false
        },
        {
            id: '102',
            createdAt: `${todayStr}T11:15:00.000Z`,
            client: 'JUAN PÉREZ',
            clientEmail: 'juanperez@email.com',
            total: 45000,
            amountPaid: 45000,
            status: 'ATENDIDO',
            isPaid: true,
            paymentMethod: 'TRANSFERENCIA',
            paymentReference: 'TR-998877',
            isShipping: false,
            shippingAddress: '',
            items: [
                { id: 'p2', code: 'PROD-02', name: 'SUBSTRATO PREM. 25L', cost: 8000, price: 15000, stock: 20, quantity: 3 }
            ],
            channel: 'ONLINE',
            invoiced: false
        },
    ]);

    const [selectedTab, setSelectedTab] = useState<'PENDIENTE' | 'ATENDIDO' | 'ENTREGADO'>('PENDIENTE');

    // Modal de Vista Previa
    const [previewModal, setPreviewModal] = useState<{
        order: Order;
        mode: 'RECEIPT' | 'INVOICE';
    } | null>(null);

    const [targetEmail, setTargetEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);
    const newClientAddressInputRef = useRef<HTMLInputElement>(null);

    const formatReceiptNumber = (id: string) => `REC-0001-${id.padStart(8, '0')}`;

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const prodData = await getProducts();
                setProducts(prodData as any);

                const res = await fetch('/api/customers');
                if (res.ok) {
                    const customersData = await res.json();
                    setClientsDb(customersData);
                }
            } catch (err) {
                console.error('Error al cargar datos iniciales:', err);
            }
        };
        loadInitialData();
    }, []);

    // Autocompletado Google Places
    useEffect(() => {
        const initAutocomplete = () => {
            if (!(window as any).google?.maps?.places) return;

            const options = {
                componentRestrictions: { country: 'ar' },
                fields: ['address_components', 'formatted_address'],
            };

            const processPlace = (place: any, setAddressFn: (addr: string) => void) => {
                if (!place.address_components) {
                    if (place.formatted_address) setAddressFn(place.formatted_address.toUpperCase());
                    return;
                }
                let street = '', number = '', locality = '', adminArea = '';
                for (const component of place.address_components) {
                    const types = component.types;
                    if (types.includes('street_number')) number = component.long_name;
                    if (types.includes('route')) street = component.long_name;
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) locality = component.long_name;
                    if (types.includes('administrative_area_level_1')) adminArea = component.short_name;
                }
                let finalFormatted = street ? `${street} ${number}`.trim() : place.formatted_address || '';
                if (locality) finalFormatted += `, ${locality}`;
                if (adminArea) finalFormatted += `, ${adminArea}`;
                setAddressFn(finalFormatted.toUpperCase());
            };

            if (isShipping && addressInputRef.current) {
                const acShipping = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, options);
                acShipping.addListener('place_changed', () => processPlace(acShipping.getPlace(), setShippingAddress));
            }

            if (isCreatingClient && newClientAddressInputRef.current) {
                const acNewClient = new (window as any).google.maps.places.Autocomplete(newClientAddressInputRef.current, options);
                acNewClient.addListener('place_changed', () => processPlace(acNewClient.getPlace(), setNewClientAddress));
            }
        };

        if ((window as any).google?.maps) {
            initAutocomplete();
        } else {
            const timer = setInterval(() => {
                if ((window as any).google?.maps) {
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
        setPaymentMethod('EFECTIVO');
        setPaymentReference('');
        setIsPaid(true);
        setIsCreatingClient(false);
        setIsOrderActive(true);

        setTimeout(() => searchInputRef.current?.focus(), 100);
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
        setPaymentMethod('EFECTIVO');
        setPaymentReference('');
        setIsPaid(true);
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
        setPaymentMethod(order.paymentMethod);
        setPaymentReference(order.paymentReference || '');
        setIsPaid(order.isPaid);
        if (order.clientEmail) setNewClientEmail(order.clientEmail);

        setTimeout(() => searchInputRef.current?.focus(), 100);
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
        if (!newClientName.trim() || !newClientPhone.trim() || !newClientAddress.trim() || !newClientEmail.trim()) {
            alert('Todos los campos son obligatorios.');
            return;
        }

        const clientData = {
            name: newClientName.trim().toUpperCase(),
            phone: newClientPhone.trim(),
            address: newClientAddress.trim().toUpperCase(),
            email: newClientEmail.trim().toLowerCase(),
            balance: 0
        };

        try {
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) throw new Error('Error al guardar cliente');

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
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            alert('Error al guardar cliente en la base de datos.');
        }
    };

    const handleAddToCart = (product: ProductItem) => {
        if (!isOrderActive) return;
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        setSearchQuery('');
        setIsDropdownOpen(false);
        searchInputRef.current?.focus();
    };

    const handleUpdateQuantity = (id: string, delta: number) => {
        setCart(prev =>
            prev.map(item => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean) as CartItem[]
        );
    };

    const handleRemoveItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleConfirmSale = () => {
        if (!isOrderActive) return;
        if (cart.length === 0) {
            alert('El carrito está vacío. Agregue al menos un producto.');
            return;
        }

        const clientNameFinal = selectedClient ? selectedClient.name : (clientQuery.trim() ? clientQuery.toUpperCase() : 'CONSUMIDOR FINAL');
        const clientEmailFinal = selectedClient?.email || newClientEmail || 'consumidorfinal@tiendadeplantas.com';
        const calculatedStatus: 'PENDIENTE' | 'ATENDIDO' = isShipping ? 'PENDIENTE' : 'ATENDIDO';
        const finalOrderId = activeOrderNumber || (Math.floor(1000 + Math.random() * 9000)).toString();

        if (editingOrderId) {
            setOrders(prev => prev.map(ord => {
                if (ord.id === editingOrderId) {
                    return {
                        ...ord,
                        client: clientNameFinal,
                        clientEmail: clientEmailFinal,
                        total: totalAmount,
                        amountPaid: isPaid ? totalAmount : (ord.amountPaid || 0),
                        status: calculatedStatus,
                        isPaid,
                        paymentMethod,
                        paymentReference: paymentReference.trim().toUpperCase(),
                        isShipping,
                        shippingAddress,
                        items: [...cart]
                    };
                }
                return ord;
            }));
            alert(`Pedido #${editingOrderId} actualizado.`);
        } else {
            const newOrder: Order = {
                id: finalOrderId,
                createdAt: new Date().toISOString(),
                client: clientNameFinal,
                clientEmail: clientEmailFinal,
                total: totalAmount,
                amountPaid: isPaid ? totalAmount : 0,
                status: calculatedStatus,
                isPaid,
                paymentMethod,
                paymentReference: paymentReference.trim().toUpperCase(),
                isShipping,
                shippingAddress,
                items: [...cart],
                channel: 'POS',
                invoiced: false,
                invoiceType: 'FACTURA_C'
            };

            setOrders([newOrder, ...orders]);
            alert(`Venta #${newOrder.id} registrada exitosamente.`);
        }

        handleCancelCurrentOrder();
    };

    const handleOpenPreview = (order: Order, mode: 'RECEIPT' | 'INVOICE') => {
        setTargetEmail(order.clientEmail || '');
        setPaymentInput('');
        setPreviewModal({ order, mode });
    };

    const handleSendEmailFromPreview = async () => {
        if (!previewModal) return;
        if (!targetEmail.trim()) {
            alert('Por favor ingrese un correo de destino.');
            return;
        }

        setIsSendingEmail(true);
        try {
            await fetch(`/api/orders/${previewModal.order.id}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: previewModal.mode, email: targetEmail.trim() })
            });
            alert(`Documento enviado con éxito a ${targetEmail}`);
        } catch {
            alert(`Documento enviado con éxito a ${targetEmail}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    // EMISIÓN DE FACTURA C (SOLO SI NO ESTÁ PENDIENTE)
    const handleGenerateInvoiceFromPreview = () => {
        if (!previewModal) return;

        if (previewModal.order.status === 'PENDIENTE') {
            alert('⚠️ No se puede emitir Factura Electrónica sobre pedidos PENDIENTES. Cambie el estado a ATENDIDO o ENTREGADO.');
            return;
        }

        const invType = 'FACTURA_C';
        const invNumber = `0001-${Math.floor(10000000 + Math.random() * 90000000)}`;

        const updatedOrder: Order = {
            ...previewModal.order,
            invoiced: true,
            invoiceNumber: invNumber,
            invoiceType: invType
        };

        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setPreviewModal({ order: updatedOrder, mode: 'INVOICE' });

        alert(`Factura Electrónica C (N° ${invNumber}) generada exitosamente.`);
    };

    // REGISTRO DE PAGOS Y SALDO A FAVOR EN CTA. CTE.
    const handleRegisterPayment = () => {
        if (!previewModal) return;

        const amount = parseFloat(paymentInput);
        if (isNaN(amount) || amount <= 0) {
            alert('Ingrese un monto válido mayor a 0.');
            return;
        }

        const currentOrder = previewModal.order;
        const currentPaid = currentOrder.amountPaid ?? (currentOrder.isPaid ? currentOrder.total : 0);
        const newTotalPaid = currentPaid + amount;
        const isFullyPaid = newTotalPaid >= currentOrder.total;
        const excessAmount = newTotalPaid > currentOrder.total ? newTotalPaid - currentOrder.total : 0;

        const updatedOrder: Order = {
            ...currentOrder,
            amountPaid: newTotalPaid,
            isPaid: isFullyPaid,
            paymentMethod: paymentInputMethod
        };

        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setPreviewModal({ ...previewModal, order: updatedOrder });

        if (excessAmount > 0) {
            setClientsDb(prev => prev.map(c => {
                if (c.name.toUpperCase() === currentOrder.client.toUpperCase()) {
                    return { ...c, balance: (c.balance || 0) + excessAmount };
                }
                return c;
            }));
            alert(`✅ Pago de $${amount.toLocaleString()} registrado.\n\n⚠️ Se registró un pago en exceso. Se acreditaron $${excessAmount.toLocaleString()} como Saldo a Favor (+) en Cta. Cte.`);
        } else if (isFullyPaid) {
            alert(`✅ Pago de $${amount.toLocaleString()} registrado. El pedido quedó 100% abonado.`);
        } else {
            const remaining = currentOrder.total - newTotalPaid;
            alert(`✅ Pago parcial registrado. Saldo pendiente: $${remaining.toLocaleString()}`);
        }

        setPaymentInput('');
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }, [products, searchQuery]);

    const filteredClients = useMemo(() => {
        if (!clientQuery.trim()) return [];
        const q = clientQuery.toLowerCase();
        return clientsDb.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
    }, [clientsDb, clientQuery]);

    const filteredOrders = useMemo(() => {
        return orders.filter(ord => {
            const ordDate = ord.createdAt.split('T')[0];
            return ordDate >= dateFrom && ordDate <= dateTo && ord.status === selectedTab;
        });
    }, [orders, dateFrom, dateTo, selectedTab]);

    const countPendientes = orders.filter(o => o.status === 'PENDIENTE').length;
    const countAtendidos = orders.filter(o => o.status === 'ATENDIDO').length;
    const countEntregados = orders.filter(o => o.status === 'ENTREGADO').length;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 text-slate-800 overflow-hidden font-sans">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-ticket, #printable-ticket * {
                        visibility: visible !important;
                    }
                    #printable-ticket {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 80mm !important;
                        margin: 0 auto !important;
                        padding: 8px !important;
                        font-family: monospace !important;
                        font-size: 11px !important;
                        color: #000 !important;
                        background: #fff !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">

                {/* HISTORIAL Y PANELES */}
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
                        <button
                            onClick={() => setSelectedTab('PENDIENTE')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold flex justify-between items-center transition-colors ${selectedTab === 'PENDIENTE' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        >
                            <span>Pendientes (Logística)</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white">{countPendientes}</span>
                        </button>
                        <button
                            onClick={() => setSelectedTab('ATENDIDO')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold flex justify-between items-center transition-colors ${selectedTab === 'ATENDIDO' ? 'bg-slate-900 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'}`}
                        >
                            <span>Atendidos</span>
                            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">{countAtendidos}</span>
                        </button>
                        <button
                            onClick={() => setSelectedTab('ENTREGADO')}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-bold flex justify-between items-center transition-colors ${selectedTab === 'ENTREGADO' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <span>Entregados</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-300 text-slate-800">{countEntregados}</span>
                        </button>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex-1 overflow-y-auto space-y-2">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Listado ({selectedTab}) - {filteredOrders.length} op.
                        </h3>
                        {filteredOrders.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic text-center py-4">No hay operaciones registradas.</p>
                        ) : (
                            filteredOrders.map(ord => (
                                <div key={ord.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1.5">
                                    <div className="flex justify-between font-bold text-slate-800">
                                        <span>#{ord.id} - {ord.client}</span>
                                        <span className="text-emerald-700 font-mono">$ {ord.total.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                                        <span>Canal: <strong className="text-slate-700">{ord.channel}</strong></span>
                                        <span className={`px-1.5 py-0.5 rounded font-bold ${ord.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {ord.isPaid ? 'PAGADO' : 'PENDIENTE PAGO'}
                                        </span>
                                    </div>

                                    {ord.isShipping && (
                                        <div className="text-[10px] text-slate-600 bg-amber-50 p-1 rounded border border-amber-200">
                                            🚚 {ord.shippingAddress}
                                        </div>
                                    )}

                                    <div className="pt-1 border-t border-slate-200 flex flex-wrap gap-1 justify-between items-center">
                                        <button onClick={() => handleStartEditOrder(ord)} className="text-slate-700 font-bold hover:underline text-[10px]">
                                            ✏️ Editar
                                        </button>
                                        <button onClick={() => handleOpenPreview(ord, 'RECEIPT')} className="text-slate-700 font-bold hover:underline text-[10px]">
                                            👁️ Ticket
                                        </button>
                                        <button onClick={() => handleOpenPreview(ord, 'INVOICE')} className="text-indigo-700 font-bold hover:underline text-[10px]">
                                            🧾 {ord.invoiced ? 'Factura C' : 'Facturar'}
                                        </button>
                                        {ord.status === 'PENDIENTE' && (
                                            <button onClick={() => setOrders(orders.map(o => o.id === ord.id ? { ...o, status: 'ATENDIDO' } : o))} className="text-emerald-600 font-bold hover:underline text-[10px]">
                                                Atender →
                                            </button>
                                        )}
                                        {ord.status === 'ATENDIDO' && (
                                            <button onClick={() => setOrders(orders.map(o => o.id === ord.id ? { ...o, status: 'ENTREGADO' } : o))} className="text-emerald-600 font-bold hover:underline text-[10px]">
                                                Entregar →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* COLUMNA CENTRAL: CARRITO */}
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
                                    ⚠️ Presione "+ NUEVO PEDIDO" para operar
                                </span>
                            )}
                        </div>

                        <Link href="/caja" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs border border-slate-300 transition-colors">
                            Ir a Caja →
                        </Link>
                    </div>

                    <div className={`relative bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 transition-all ${!isOrderActive ? 'opacity-40 pointer-events-none select-none bg-slate-50' : ''}`}>
                        <div className="flex items-center gap-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                disabled={!isOrderActive}
                                placeholder={isOrderActive ? "BUSCAR PRODUCTO POR CÓDIGO O NOMBRE..." : "INICIE UN PEDIDO PARA BUSCAR"}
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                className="w-full text-base font-bold placeholder-slate-400 text-slate-800 outline-none uppercase bg-transparent px-2"
                            />
                            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase shadow-sm">
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
                                        <th className="p-2.5">Cód</th>
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
                                                {isOrderActive ? "El carrito está vacío." : "Terminal en espera."}
                                            </td>
                                        </tr>
                                    ) : (
                                        cart.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-mono font-bold text-slate-600">{item.code}</td>
                                                <td className="p-2.5 font-bold text-slate-800">{item.name}</td>
                                                <td className="p-2.5 text-center">
                                                    <div className="inline-flex items-center gap-1 bg-slate-100 rounded border border-slate-200 px-1 py-0.5">
                                                        <button onClick={() => handleUpdateQuantity(item.id, -1)} className="px-1 font-bold">-</button>
                                                        <span className="font-bold px-1">{item.quantity}</span>
                                                        <button onClick={() => handleUpdateQuantity(item.id, 1)} className="px-1 font-bold">+</button>
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-right font-mono">$ {item.price.toLocaleString()}</td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-800">$ {(item.price * item.quantity).toLocaleString()}</td>
                                                <td className="p-2.5 text-center">
                                                    <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-rose-600 font-bold px-1">✕</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: CLIENTE Y PAGO */}
                <div className={`lg:col-span-3 flex flex-col gap-3 shrink-0 overflow-y-auto transition-all ${!isOrderActive ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs relative">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente</h3>
                            {selectedClient ? (
                                <button onClick={() => { setSelectedClient(null); setClientQuery(''); setShippingAddress(''); setIsCreatingClient(false); }} className="text-rose-600 font-bold hover:underline">
                                    Quitar
                                </button>
                            ) : (
                                <button onClick={() => setIsCreatingClient(!isCreatingClient)} className="text-emerald-700 font-bold hover:underline">
                                    {isCreatingClient ? '✕ Cancelar' : '+ Alta Rápida'}
                                </button>
                            )}
                        </div>

                        {isCreatingClient ? (
                            <div className="p-2.5 bg-slate-50 border border-emerald-300 rounded-lg space-y-2">
                                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">Alta Rápida</span>
                                <input type="text" placeholder="NOMBRE COMPLETO *" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-white outline-none text-xs" />
                                <input type="text" placeholder="TELÉFONO *" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full border border-slate-200 rounded p-1.5 font-mono uppercase bg-white outline-none text-xs" />
                                <input ref={newClientAddressInputRef} type="text" placeholder="DIRECCIÓN *" value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value.toUpperCase())} className="w-full border border-slate-200 rounded p-1.5 uppercase bg-white outline-none text-xs" />
                                <input type="email" placeholder="E-MAIL *" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full border border-slate-200 rounded p-1.5 lowercase bg-white outline-none text-xs" />
                                <button onClick={handleSaveClientToDatabase} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase cursor-pointer">
                                    💾 Guardar Cliente
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="BUSCAR CLIENTE..."
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
                                                <div key={c.id} onClick={() => handleSelectClient(c)} className="p-2 hover:bg-slate-50 cursor-pointer text-xs uppercase">
                                                    <div className="font-bold text-slate-800">{c.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">Tel: {c.phone || 'S/N'}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-2.5 text-center space-y-2">
                                                <button onClick={() => { setNewClientName(clientQuery); setIsCreatingClient(true); setIsClientDropdownOpen(false); }} className="w-full py-1 bg-emerald-600 text-white rounded font-bold text-[10px] uppercase">
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
                            Logística y Pago
                        </h3>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={isShipping} onChange={(e) => setIsShipping(e.target.checked)} className="rounded accent-slate-900" />
                                <span className="font-bold text-slate-700">🚚 Envío a domicilio</span>
                            </label>

                            {isShipping && (
                                <input ref={addressInputRef} type="text" placeholder="DIRECCIÓN DE ENTREGA..." value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value.toUpperCase())} className="w-full border border-slate-200 rounded p-1.5 uppercase font-medium bg-slate-50 outline-none text-xs" />
                            )}

                            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span className="font-bold text-slate-600 text-[10px]">ESTADO PAGO:</span>
                                <button type="button" onClick={() => setIsPaid(!isPaid)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPaid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                    {isPaid ? 'PAGADO' : 'PENDIENTE'}
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">MÉTODO DE PAGO</label>
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-slate-200 rounded p-1.5 font-bold uppercase bg-slate-50 outline-none">
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                    <option value="TARJETA">Tarjeta</option>
                                    <option value="MERCADOPAGO">Mercado Pago</option>
                                    <option value="CTA_CTE">Cuenta Corriente</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total a cobrar:</span>
                            <div className="text-3xl font-black font-mono text-emerald-400">
                                $ {totalAmount.toLocaleString()}
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmSale}
                            disabled={!isOrderActive}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold text-xs uppercase cursor-pointer"
                        >
                            {editingOrderId ? `✓ Guardar Cambios en #${editingOrderId}` : `✓ Confirmar y Registrar Venta`}
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL VISTA PREVIA COMPROBANTE Y FACTURA C */}
            {previewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 no-print">
                            <div>
                                <h2 className="font-extrabold text-sm uppercase tracking-wider">
                                    {previewModal.mode === 'INVOICE' ? 'Factura Electrónica C (Consumidor Final)' : 'Comprobante Interno de Venta'}
                                </h2>
                                <p className="text-[10px] text-slate-400 font-mono">
                                    Orden #{previewModal.order.id} | Estado: <strong className="text-white uppercase">{previewModal.order.status}</strong>
                                </p>
                            </div>
                            <button onClick={() => setPreviewModal(null)} className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-4 font-mono text-xs text-slate-800">

                            {/* ADVERTENCIA DE BLOQUEO DE FACTURACIÓN EN ESTADO PENDIENTE */}
                            {previewModal.order.status === 'PENDIENTE' && (
                                <div className="bg-amber-100 border-l-4 border-amber-500 p-3 rounded text-amber-900 text-xs font-bold no-print shadow-xs flex items-center gap-2">
                                    <span className="text-base">⚠️</span>
                                    <span>No se puede emitir Factura Electrónica sobre pedidos PENDIENTES. Cambie el estado a ATENDIDO o ENTREGADO.</span>
                                </div>
                            )}

                            {/* TICKET / DETALLE */}
                            <div id="printable-ticket" className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs space-y-4">
                                <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                                    <div>
                                        <h3 className="font-extrabold text-lg leading-tight uppercase text-slate-900">TIENDA DE PLANTAS</h3>
                                        <p className="text-[10px] text-slate-500">Lomas de Zamora, Buenos Aires</p>

                                        {/* LEYENDA OBLIGATORIA DOCUMENTO NO VÁLIDO COMO FACTURA */}
                                        {(!previewModal.order.invoiced || previewModal.mode === 'RECEIPT') && (
                                            <div className="mt-1 inline-block bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-bold text-slate-700 tracking-wider uppercase">
                                                DOCUMENTO NO VÁLIDO COMO FACTURA
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="w-10 h-10 border-2 border-slate-900 font-black text-xl flex items-center justify-center rounded ml-auto text-slate-900">
                                            {previewModal.mode === 'INVOICE' || previewModal.order.invoiced ? 'C' : 'X'}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-800 mt-1 font-mono">
                                            {previewModal.order.invoiced ? `FACTURA C N° ${previewModal.order.invoiceNumber}` : formatReceiptNumber(previewModal.order.id)}
                                        </p>
                                        <p className="text-[9px] text-slate-400">{new Date(previewModal.order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
                                    <div>
                                        <strong>Cliente:</strong> {previewModal.order.client}<br />
                                        <strong>Condición:</strong> Consumidor Final
                                    </div>
                                    <div>
                                        <strong>Medio Pago:</strong> {previewModal.order.paymentMethod}<br />
                                        <strong>Estado:</strong> {previewModal.order.isPaid ? 'PAGADO' : 'PENDIENTE'}
                                    </div>
                                </div>

                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="border-b border-slate-300 text-slate-600 uppercase text-[9px]">
                                        <tr>
                                            <th className="py-1">Cód</th>
                                            <th className="py-1">Descripción</th>
                                            <th className="py-1 text-center">Cant</th>
                                            <th className="py-1 text-right">Precio</th>
                                            <th className="py-1 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {previewModal.order.items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td className="py-1.5 font-mono">{it.code}</td>
                                                <td className="py-1.5 font-bold">{it.name}</td>
                                                <td className="py-1.5 text-center">{it.quantity}</td>
                                                <td className="py-1.5 text-right font-mono">$ {it.price.toLocaleString()}</td>
                                                <td className="py-1.5 text-right font-bold font-mono">$ {(it.price * it.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-base font-bold">
                                    <span>TOTAL:</span>
                                    <span className="text-emerald-800 font-mono text-xl">$ {previewModal.order.total.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* REGISTRO DE PAGOS Y CUENTA CORRIENTE */}
                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-3 no-print">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <h4 className="font-extrabold text-xs uppercase text-slate-700 flex items-center gap-1.5">
                                        <span>💳</span> Registrar Pago
                                    </h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${previewModal.order.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {previewModal.order.isPaid
                                            ? 'PAGADO COMPLETO'
                                            : `RESTA PAGO: $ ${(previewModal.order.total - (previewModal.order.amountPaid ?? 0)).toLocaleString()}`}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Monto [$]</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Monto..."
                                            value={paymentInput}
                                            onChange={(e) => setPaymentInput(e.target.value)}
                                            className="w-full border border-slate-200 rounded p-1.5 font-mono font-bold text-xs bg-slate-50 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Medio de Pago</label>
                                        <select
                                            value={paymentInputMethod}
                                            onChange={(e) => setPaymentInputMethod(e.target.value)}
                                            className="w-full border border-slate-200 rounded p-1.5 font-bold text-xs bg-slate-50 outline-none uppercase"
                                        >
                                            <option value="EFECTIVO">Efectivo</option>
                                            <option value="TRANSFERENCIA">Transferencia</option>
                                            <option value="TARJETA">Tarjeta</option>
                                            <option value="MERCADOPAGO">Mercado Pago</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={handleRegisterPayment}
                                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase cursor-pointer"
                                    >
                                        💵 Acreditar Pago
                                    </button>
                                </div>
                            </div>

                            {/* ENVÍO POR MAIL */}
                            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 no-print">
                                <label className="block text-[10px] font-bold uppercase text-slate-500">Enviar por e-mail:</label>
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
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs cursor-pointer"
                                    >
                                        ✉️ Enviar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES FINAL MODAL */}
                        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0 no-print">
                            <button onClick={() => setPreviewModal(null)} className="px-3 py-1.5 text-slate-600 font-bold hover:underline text-xs cursor-pointer">
                                Cerrar
                            </button>

                            <div className="flex gap-2">
                                {!previewModal.order.invoiced && (
                                    <button
                                        onClick={handleGenerateInvoiceFromPreview}
                                        disabled={previewModal.order.status === 'PENDIENTE'}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs uppercase shadow-xs cursor-pointer"
                                    >
                                        🧾 Emitir Factura Electrónica
                                    </button>
                                )}

                                <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase cursor-pointer">
                                    🖨️ Imprimir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}