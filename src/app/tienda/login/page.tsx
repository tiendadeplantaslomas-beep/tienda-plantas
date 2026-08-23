'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Tag, Truck, RefreshCw, CheckCircle2, Cookie, AlertTriangle, ArrowLeft, Mail, Lock } from 'lucide-react';
import { authenticateCustomer } from './actions';

export default function LoginPage() {
    const router = useRouter();
    const [savedUser, setSavedUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
    const [showCookieBanner, setShowCookieBanner] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteEmail, setDeleteEmail] = useState('');
    const [deleteSuccess, setDeleteSuccess] = useState(false);

    // Estados para el flujo de login por Email / Contraseña
    const [emailLoginMode, setEmailLoginMode] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [timerCount, setTimerCount] = useState<number | null>(null);
    const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const storedCustomer = localStorage.getItem('customer');
        if (storedCustomer) {
            try {
                const parsed = JSON.parse(storedCustomer);
                setSavedUser({
                    name: parsed.name || 'Cliente Vivero',
                    email: parsed.email || 'cliente@vivero.com',
                    avatar: parsed.avatar
                });
            } catch (e) { }
        }

        const cookieConsent = localStorage.getItem('cookie_consent');
        if (!cookieConsent) {
            setShowCookieBanner(true);
        }
    }, []);

    // Temporizador para el aviso de mail inexistente
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (timerCount !== null && timerCount > 0) {
            timer = setTimeout(() => setTimerCount(timerCount - 1), 1000);
        } else if (timerCount === 0) {
            setLoginError('');
            setTimerCount(null);
            setShowRegisterPrompt(false);
        }
        return () => clearTimeout(timer);
    }, [timerCount]);

    const handleAcceptCookies = () => {
        localStorage.setItem('cookie_consent', 'true');
        setShowCookieBanner(false);
    };

    const handleContinueSavedUser = () => {
        router.push('/tienda');
    };

    const handleSwitchAccount = () => {
        localStorage.removeItem('customer');
        setSavedUser(null);
    };

    // Validación conectada a la Base de Datos (Prisma)
    const handleEmailLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setShowRegisterPrompt(false);
        setIsLoading(true);

        try {
            const result = await authenticateCustomer(emailInput, passwordInput);

            if (result.success && result.customer) {
                // Guardamos en localStorage opcionalmente para refrescar la UI instantánea
                localStorage.setItem('customer', JSON.stringify({
                    name: result.customer.name || 'Cliente Vivero',
                    email: result.customer.email
                }));
                router.push('/tienda');
            } else {
                // Mail no encontrado en la tabla Customer de Prisma -> Muestra el aviso con timer
                setLoginError(result.error || 'El correo electrónico no se encuentra registrado.');
                setTimerCount(10);
                if (result.showRegister) {
                    setShowRegisterPrompt(true);
                }
            }
        } catch (error) {
            setLoginError('Error de conexión con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    const maskEmail = (email: string) => {
        const [user, domain] = email.split('@');
        if (!domain) return email;
        const visibleStart = user.slice(0, 3);
        return `${visibleStart}***@${domain}`;
    };

    return (
        <div className="w-full flex-1 overflow-y-auto flex flex-col justify-center items-center p-3 sm:p-4 relative">
            <div className="max-w-3xl w-full mx-auto space-y-4 my-auto">

                {/* ENCABEZADO Y SEGURIDAD */}
                <div className="text-center space-y-1">
                    <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                        Iniciar sesión
                    </h1>
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/80 px-3 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Todos los datos están protegidos y encriptados</span>
                    </div>
                </div>

                {/* BARRA DE BENEFICIOS / CONFIANZA */}
                <div className="bg-white/70 backdrop-blur-md rounded-xl p-2.5 shadow-xs border border-slate-300/60 grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                    <div className="flex flex-col items-center p-1.5 border-r last:border-0 border-slate-200/60">
                        <Tag className="h-4 w-4 text-emerald-600 mb-0.5" />
                        <span className="text-[11px] font-bold text-slate-800">Promociones</span>
                        <span className="text-[10px] text-slate-500">Beneficios exclusivos</span>
                    </div>
                    <div className="flex flex-col items-center p-1.5 border-r last:border-0 border-slate-200/60">
                        <Truck className="h-4 w-4 text-emerald-600 mb-0.5" />
                        <span className="text-[11px] font-bold text-slate-800">Envío a domicilio</span>
                        <span className="text-[10px] text-slate-500">Cobertura zonal</span>
                    </div>
                    <div className="flex flex-col items-center p-1.5 border-r last:border-0 border-slate-200/60">
                        <RefreshCw className="h-4 w-4 text-emerald-600 mb-0.5" />
                        <span className="text-[11px] font-bold text-slate-800">Asesoramiento</span>
                        <span className="text-[10px] text-slate-500">Plantas garantizadas</span>
                    </div>
                    <div className="flex flex-col items-center p-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mb-0.5" />
                        <span className="text-[11px] font-bold text-slate-800">Compra segura</span>
                        <span className="text-[10px] text-slate-500">Soporte directo</span>
                    </div>
                </div>

                {/* TARJETA PRINCIPAL CONTENIDA */}
                <div className="bg-white/90 backdrop-blur-md rounded-xl p-5 sm:p-6 shadow-md border border-slate-300/60">

                    {emailLoginMode ? (
                        /* VISTA 2: INICIO DE SESIÓN CON MAIL Y CONTRASEÑA */
                        <div className="space-y-4 max-w-md mx-auto">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => { setEmailLoginMode(false); setLoginError(''); setTimerCount(null); }}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Volver a opciones
                                </button>
                                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Acceso con Credenciales</h3>
                            </div>

                            {loginError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center justify-between text-red-700 font-bold">
                                        <span className="flex items-center gap-1.5">⚠️ {loginError}</span>
                                        {timerCount !== null && (
                                            <span className="bg-red-200 text-red-900 px-2 py-0.5 rounded-full text-[10px]">
                                                {timerCount}s
                                            </span>
                                        )}
                                    </div>
                                    {showRegisterPrompt && (
                                        <div className="pt-2 border-t border-red-200/60 flex items-center justify-between">
                                            <span className="text-slate-700 text-[11px] font-medium">¿Aún no tenés cuenta?</span>
                                            <Link
                                                href="/tienda/register"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition shadow-2xs"
                                            >
                                                Registrarse ahora
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleEmailLoginSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Correo electrónico</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Mail className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            placeholder="tu@email.com"
                                            className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Contraseña</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="password"
                                            value={passwordInput}
                                            onChange={(e) => setPasswordInput(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                                >
                                    {isLoading ? 'Verificando en Base de Datos...' : 'Continuar e Iniciar Sesión'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* VISTA 1: OPCIONES PRINCIPALES */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">

                            {/* COLUMNA IZQUIERDA: Sesión guardada o Invitación a registrarse */}
                            {savedUser ? (
                                <div className="space-y-3 text-center">
                                    <p className="text-xs font-semibold text-slate-600">
                                        Inicia sesión con una cuenta utilizada anteriormente
                                    </p>
                                    <div className="flex flex-col items-center space-y-1.5 py-1">
                                        <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-800 font-bold text-lg shadow-inner overflow-hidden">
                                            {savedUser.avatar ? (
                                                <img src={savedUser.avatar} alt={savedUser.name} className="w-full h-full object-cover" />
                                            ) : (
                                                savedUser.name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-extrabold text-slate-900">{savedUser.name}</h3>
                                            <p className="text-[11px] text-slate-500">{maskEmail(savedUser.email)}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleContinueSavedUser}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition text-xs uppercase tracking-wider cursor-pointer"
                                    >
                                        Continuar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSwitchAccount}
                                        className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold py-2.5 px-4 rounded-xl shadow-2xs transition text-xs cursor-pointer"
                                    >
                                        Utiliza otra cuenta
                                    </button>

                                    <div className="flex justify-between items-center pt-1 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteModal(true)}
                                            className="text-red-600 hover:underline font-medium cursor-pointer"
                                        >
                                            Eliminar cuenta
                                        </button>
                                        <Link href="/tienda/ayuda" className="text-slate-500 hover:underline">
                                            ¿Problemas?
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 text-center md:text-left">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">¿Nuevo en la tienda?</h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Registrate para acceder a promociones exclusivas, control de tus pedidos y asesoramiento personalizado para tus plantas.
                                    </p>
                                    <div className="pt-1">
                                        <Link
                                            href="/tienda/register"
                                            className="inline-block w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl border border-slate-300 text-center text-xs transition shadow-2xs"
                                        >
                                            Crear una cuenta nueva
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* SEPARADOR CENTRAL */}
                            <div className="relative flex items-center justify-center md:absolute md:inset-y-0 md:left-1/2 md:-translate-x-1/2">
                                <div className="absolute inset-0 flex items-center md:hidden">
                                    <div className="w-full border-t border-slate-300"></div>
                                </div>
                                <span className="relative bg-white px-2.5 py-0.5 rounded-full text-[11px] font-bold text-slate-500 border border-slate-300/60 shadow-2xs">
                                    O
                                </span>
                            </div>

                            {/* COLUMNA DERECHA: Botones de acceso */}
                            <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-slate-600 text-center md:text-left pb-0.5">
                                    Iniciar sesión o registrarse
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setEmailLoginMode(true)}
                                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-emerald-300 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-900 text-xs font-bold transition shadow-2xs cursor-pointer"
                                >
                                    <Mail className="h-4 w-4 text-emerald-700" />
                                    Continuar con Email (Login)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => alert('Próximamente integración con Google')}
                                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                                >
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    Continuar con Google
                                </button>

                                <button
                                    type="button"
                                    onClick={() => alert('Próximamente integración con Facebook')}
                                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                                >
                                    <svg className="h-4 w-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    Continuar con Facebook
                                </button>
                            </div>

                        </div>
                    )}

                    {/* ENLACES INFERIORES */}
                    <div className="mt-5 pt-3 border-t border-slate-200/60 text-center">
                        <p className="text-[11px] text-slate-500">
                            Al continuar, aceptas nuestros{' '}
                            <Link href="/terminos" className="text-slate-700 underline hover:text-emerald-600">Términos de uso</Link>{' '}
                            y{' '}
                            <Link href="/privacidad" className="text-slate-700 underline hover:text-emerald-600">Política de privacidad</Link>.
                        </p>
                    </div>

                </div>

            </div>

            {/* MODAL DE ELIMINACIÓN DE CUENTA */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2.5 text-red-600">
                            <div className="p-2 bg-red-50 rounded-xl">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-900">Eliminar cuenta</h3>
                        </div>

                        {deleteSuccess ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5">
                                <p className="text-xs font-bold text-emerald-800">¡Solicitud enviada!</p>
                                <p className="text-[11px] text-emerald-700 leading-relaxed">
                                    Cuenta suspendida por 90 días. Si no iniciás sesión, será borrada definitivamente.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!deleteEmail.trim()) return;
                                setDeleteSuccess(true);
                                setTimeout(() => {
                                    setShowDeleteModal(false);
                                    setDeleteSuccess(false);
                                    setDeleteEmail('');
                                    localStorage.removeItem('customer');
                                    setSavedUser(null);
                                }, 3000);
                            }} className="space-y-3">
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    Ingresá tu correo. Quedará suspendida por 90 días antes de su eliminación definitiva.
                                </p>
                                <div>
                                    <input
                                        type="email"
                                        value={deleteEmail}
                                        onChange={(e) => setDeleteEmail(e.target.value)}
                                        placeholder="tucorreo@email.com"
                                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteModal(false)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* BANNER DE COOKIES */}
            {showCookieBanner && (
                <div className="fixed bottom-3 left-3 right-3 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 z-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Cookie className="h-5 w-5 text-emerald-400 shrink-0" />
                        <p className="text-[11px] text-slate-300 leading-snug">
                            Utilizamos cookies esenciales para mantener tu sesión activa.
                        </p>
                    </div>
                    <button
                        onClick={handleAcceptCookies}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                        Aceptar
                    </button>
                </div>
            )}
        </div>
    );
}