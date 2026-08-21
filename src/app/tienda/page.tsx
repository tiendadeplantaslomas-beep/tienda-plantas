import Link from 'next/link';

export default function TiendaLandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
            {/* Navbar de la Tienda */}
            <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center max-w-7xl mx-auto w-full rounded-b-2xl shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🌱</span>
                    <span className="font-bold text-lg text-slate-900">Vivero Tienda Online</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/tienda/login"
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-emerald-600 transition"
                    >
                        Iniciar Sesión
                    </Link>
                    <Link
                        href="/tienda/register"
                        className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 transition"
                    >
                        Registrarse
                    </Link>
                </div>
            </header>

            {/* Sección Central / Hero */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-3xl text-center bg-white p-8 md:p-12 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
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
                            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-sm hover:bg-emerald-700 transition text-center"
                        >
                            Crear una cuenta
                        </Link>
                        <Link
                            href="/tienda/login"
                            className="px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition text-center"
                        >
                            Ya tengo cuenta
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
                Sistema de Gestión de Vivero &bull; Todos los derechos reservados
            </footer>
        </div>
    );
}