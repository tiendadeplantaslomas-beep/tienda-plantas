'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Leaf, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setCargando(true);

        try {
            const res = await signIn('credentials', {
                email: email.trim().toLowerCase(),
                password: password,
                redirect: false,
            });

            if (res?.error) {
                setError('El correo o la contraseña no coinciden con nuestros registros del vivero.');
                setCargando(false);
            } else {
                // ¡Login exitoso! Redirigimos directo a la raíz del sitio
                router.push('/vivero');
                router.refresh();
            }
        } catch (err) {
            setError('Ocurrió un error inesperado en el servidor. Intentá de nuevo.');
            setCargando(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-stone-50">
            <div className="w-full max-w-md space-y-8 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">

                {/* Encabezado del Formulario */}
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mb-4">
                        <Leaf className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-stone-900">
                        Ingresá a tu cuenta
                    </h2>
                    <p className="mt-2 text-sm text-stone-500">
                        Gestioná tus compras o administrá el stock del vivero
                    </p>
                </div>

                {/* Alerta de Error */}
                {error && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-800 border border-red-200">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Formulario */}
                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>

                    {/* Campo: Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
                            Correo Electrónico
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                                <Mail className="h-4 w-4" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={cargando}
                                className="block w-full rounded-lg border border-stone-300 bg-stone-50 py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-60 transition"
                                placeholder="ejemplo@vivero.com"
                            />
                        </div>
                    </div>

                    {/* Campo: Contraseña */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">
                            Contraseña
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                                <Lock className="h-4 w-4" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={cargando}
                                className="block w-full rounded-lg border border-stone-300 bg-stone-50 py-2.5 pl-10 pr-3 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-60 transition"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* Botón de Enviar */}
                    <button
                        type="submit"
                        disabled={cargando}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-70 transition cursor-pointer"
                    >
                        {cargando ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Validando credenciales...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>

                </form>
            </div>
        </div>
    );
}