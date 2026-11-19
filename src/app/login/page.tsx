"use client";

import React, { useState } from 'react';
import { Leaf, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { authenticateInternalUser } from '@/actions/client-actions';

export default function AppLoginPage() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await authenticateInternalUser(email, password);

            if (!res.success) {
                setError(res.error || 'Credenciales inválidas.');
                setLoading(false);
                return;
            }

            if (res.user) {
                localStorage.setItem('user_role', res.user.role);
                localStorage.setItem('user_name', res.user.name || '');
                localStorage.setItem('user_email', res.user.email);
            }

            // Forzamos recarga limpia de ventana para sincronizar cookies de servidor en localhost
            window.location.href = '/dashboard';
        } catch (err: any) {
            console.error('Error al iniciar sesión:', err);
            setError('Error de conexión con el servidor.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 text-slate-800 font-sans">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xl max-w-md w-full space-y-6">

                <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 bg-emerald-700 rounded-2xl text-white shadow-md">
                        <Leaf className="h-8 w-8" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                        TIENDA DE PLANTAS — ERP / CRM
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Acceso exclusivo para Personal Interno y Gestión
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold uppercase flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Correo Electrónico
                        </label>
                        <div className="relative">
                            <Mail className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                                className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                placeholder="tiendadeplantas.lomas@gmail.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Contraseña
                        </label>
                        <div className="relative">
                            <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 pl-9 pr-10 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {loading ? 'Validando Permisos...' : 'Ingresar al Sistema'}
                    </button>
                </form>

                <div className="pt-2 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                        Sistema de Gestión Interna • Control RBAC
                    </p>
                </div>
            </div>
        </div>
    );
}