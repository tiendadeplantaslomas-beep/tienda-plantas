'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle } from 'lucide-react';

export default function CartDrawer() {
    const { cart, updateQuantity, removeItem, clearCart, totalItems } = useCart();
    const [isOpen, setIsOpen] = useState(false);

    // Calcular el precio total del carrito
    const totalPrice = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

    // Función para armar el mensaje de WhatsApp y enviar el pedido
    const handleCheckoutWhatsApp = () => {
        if (cart.length === 0) return;

        let mensaje = 'Hola! Quiero realizar el siguiente pedido desde la web:\n\n';
        cart.forEach((item, index) => {
            mensaje += `${index + 1}. *${item.nombre}* x${item.quantity} - $${(item.precio * item.quantity).toLocaleString()}\n`;
        });
        mensaje += `\n*Total a pagar: $${totalPrice.toLocaleString()}*\n\n¡Espero confirmación para coordinar el pago y envío!`;

        // Reemplazá este número con tu WhatsApp de ventas si querés (ej: 54911...)
        const numeroWhatsApp = '541140782378';
        const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

        window.open(urlWhatsApp, '_blank');
    };

    return (
        <>
            {/* BOTÓN FLOTANTE DEL CARRITO (Abajo a la derecha) */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-5 right-5 z-50 bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-lg flex items-center gap-2 transition cursor-pointer font-bold"
                title="Ver Carrito"
            >
                <div className="relative">
                    <ShoppingBag className="w-6 h-6" />
                    {totalItems > 0 && (
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                            {totalItems}
                        </span>
                    )}
                </div>
                <span className="hidden md:inline text-xs">Carrito</span>
            </button>

            {/* PANEL LATERAL (DRAWER) DEL CARRITO */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Fondo oscuro transparente */}
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">

                            {/* Encabezado del Carrito */}
                            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
                                <h2 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4" /> Tu Carrito de Compras
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-200 hover:text-white transition cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Listado de Productos en el Carrito */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {cart.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 space-y-2">
                                        <ShoppingBag className="w-12 h-12 mx-auto opacity-30" />
                                        <p className="text-xs font-medium">Tu carrito está vacío.</p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                                            {item.imagenUrl ? (
                                                <img src={item.imagenUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">🌿</div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 text-xs truncate">{item.nombre}</h4>
                                                <p className="text-xs font-black text-emerald-700">${item.precio.toLocaleString()}</p>
                                            </div>

                                            {/* Controles de Cantidad */}
                                            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1 shrink-0">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Botón Eliminar */}
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer shrink-0"
                                                title="Eliminar producto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Pie del Carrito con Total y Botón de WhatsApp */}
                            {cart.length > 0 && (
                                <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                                        <span>Total estimado:</span>
                                        <span className="text-base font-black text-emerald-700">${totalPrice.toLocaleString()}</span>
                                    </div>

                                    <button
                                        onClick={handleCheckoutWhatsApp}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Completar pedido por WhatsApp
                                    </button>

                                    <button
                                        onClick={clearCart}
                                        className="w-full text-center text-[10px] text-slate-500 hover:text-rose-600 font-medium cursor-pointer"
                                    >
                                        Vaciar carrito
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}