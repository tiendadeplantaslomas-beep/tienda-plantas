'use client';
import Link from 'next/link';

export default function TiendaLandingPage() {
    return (
        <div className="w-full h-full flex flex-col p-3 overflow-y-auto">
            <div className="max-w-3xl w-full mx-auto space-y-4 my-auto">

                {/* TARJETA / LANDING DE BIENVENIDA */}
                <div className="bg-white/60 backdrop-blur-md rounded-xl p-8 md:p-12 shadow-md border border-slate-300/60 text-center space-y-6">
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                        Bienvenidos a nuestro vivero
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Encontrá las mejores plantas y accesorios para tu hogar
                    </h1>
                    <p className="text-slate-600 text-base max-w-xl mx-auto">
                        Explorá nuestro catálogo, registrate para gestionar tus compras y llevá la naturaleza directo a tu espacio.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <Link
                            href="/tienda/register"
                            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-sm hover:bg-emerald-700 transition text-center text-xs"
                        >
                            Crear una cuenta
                        </Link>
                        <Link
                            href="/tienda/login"
                            className="px-6 py-3 bg-white/80 text-slate-700 font-medium rounded-xl hover:bg-white border border-slate-300 transition text-center shadow-2xs text-xs"
                        >
                            Ya tengo cuenta
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}