'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Cargar carrito guardado previamente si existe
    useEffect(() => {
        const savedCart = localStorage.getItem('vivero_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error('Error al cargar el carrito', e);
            }
        }
    }, []);

    // Guardar cambios en el carrito automáticamente
    useEffect(() => {
        localStorage.setItem('vivero_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product: any) => {
        setCart((prevCart) => {
            const existingIndex = prevCart.findIndex((item) => item.id === product.id);
            if (existingIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingIndex].quantity += 1;
                return newCart;
            } else {
                return [
                    ...prevCart,
                    {
                        id: product.id,
                        name: product.name,
                        price: Number(product.price),
                        quantity: 1,
                        imageUrl: product.imageUrl,
                    },
                ];
            }
        });
        // Abrir el carrito automáticamente al agregar un producto
        setIsCartOpen(true);
    };

    const removeFromCart = (id: string) => {
        setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    };

    const clearCart = () => {
        setCart([]);
    };

    const toggleCart = () => {
        setIsCartOpen((prev) => !prev);
    };

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                clearCart,
                totalItems,
                totalPrice,
                isCartOpen,
                setIsCartOpen,
                toggleCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart debe ser usado dentro de un CartProvider');
    }
    return context;
}