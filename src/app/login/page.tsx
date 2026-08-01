"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const router = useRouter();

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        // LÓGICA DE ROLES
        if (email === 'admin@vivero.com' && password === 'admin123') {
            localStorage.setItem('user_role', 'ADMIN');
            // Cambiamos '/admin' por '/dashboard' (donde movimos tu page.tsx)
            router.push('/dashboard');
        } else if (email === 'cliente@vivero.com' && password === 'user123') {
            localStorage.setItem('user_role', 'CLIENTE');
            // Cambiamos '/tienda' por '/' (la raíz pública)
            router.push('/');
        } else {
            setError('Credenciales incorrectas. Probá con admin@vivero.com / admin123 o cliente@vivero.com / user123');
        }
    };

    return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 text-stone-800">
            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xl max-w-md w-full space-y-6">

                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 bg-emerald-700 rounded-2xl text-white shadow-md">
                        <Leaf className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900">Sistema Vivero</h1>
                    <p className="text-xs text-stone-500 font-medium">CRM / ERP de Gestión Comercial</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="h-4 w-4 absolute left-3 top-3 text-stone-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                placeholder="usuario@vivero.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="h-4 w-4 absolute left-3 top-3 text-stone-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-md cursor-pointer"
                    >
                        Ingresar al Sistema
                    </button>
                </form>
            </div>
        </div>
    );
}