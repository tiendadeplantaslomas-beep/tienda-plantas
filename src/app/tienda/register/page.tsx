'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        countryCode: '+54',
        areaCode: '',
        phoneNumber: '',
        address: '',
        dni_cuit: '',
        gender: 'neutral'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'email') {
            setForm({ ...form, [name]: value.toLowerCase().trim() });
        } else if (name === 'password' || name === 'gender') {
            setForm({ ...form, [name]: value });
        } else {
            setForm({ ...form, [name]: value.toUpperCase() });
        }
    };

    const validatePassword = (pass: string) => {
        if (pass.length < 8 || pass.length >= 15) {
            return 'La contraseña debe tener entre 8 y 14 caracteres.';
        }
        if (!/[A-Z]/.test(pass)) {
            return 'Debe contener al menos una letra mayúscula.';
        }
        if (!/[0-9]/.test(pass)) {
            return 'Debe contener al menos un número.';
        }
        if (!/[!@#$%^&*(),.?":{}|<>\-_]/.test(pass)) {
            return 'Debe contener al menos un carácter especial (ej: @, #, $, etc.).';
        }
        return null;
    };

    const validateAddress = (addr: string) => {
        if (addr.length < 10) {
            return 'La dirección es demasiado corta.';
        }
        if (!addr.includes(',')) {
            return 'Para envíos a domicilio, formateá la dirección separando con comas (Ej: AV. YRIGOYEN 8500, 1832, LOMAS DE ZAMORA).';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!form.name || !form.email || !form.password || !form.countryCode || !form.areaCode || !form.phoneNumber || !form.address || !form.dni_cuit) {
            setError('Todos los campos marcados con * son obligatorios.');
            return;
        }

        const passwordError = validatePassword(form.password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        const addressError = validateAddress(form.address);
        if (addressError) {
            setError(addressError);
            return;
        }

        setLoading(true);

        const fullPhone = `${form.countryCode} ${form.areaCode} ${form.phoneNumber}`.trim();

        const payload = {
            name: form.name.trim(),
            email: form.email,
            password: form.password,
            phone: fullPhone,
            address: form.address.trim(),
            dni_cuit: form.dni_cuit.trim(),
            gender: form.gender
        };

        try {
            const res = await fetch('/api/tienda/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrarse');
            }

            setSuccessMessage('¡Registro exitoso! Te enviamos un correo electrónico para verificar tu cuenta.');
            setTimeout(() => {
                router.push('/tienda/login');
            }, 4000);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="text-center text-2xl font-extrabold text-slate-900">
                    Creá tu cuenta en la Tienda
                </h2>
                <p className="mt-2 text-center text-xs text-slate-600">
                    ¿Ya tenés cuenta?{' '}
                    <Link href="/tienda/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                        Iniciá sesión aquí
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
                <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200/80 sm:px-10">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">
                            {successMessage}
                        </div>
                    )}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Nombre y Apellido *
                            </label>
                            <input
                                name="name"
                                type="text"
                                placeholder="EJ: JUAN PÉREZ"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Correo Electrónico * <span className="text-stone-400 font-normal lowercase">(minúsculas)</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 lowercase"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Contraseña *
                            </label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-[11px] text-stone-500">
                                De 8 a 14 caracteres, al menos una mayúscula, un número y un carácter especial.
                            </p>
                        </div>

                        {/* Teléfono Estructurado */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Teléfono / Celular *
                            </label>
                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-3">
                                    <span className="block text-[10px] text-stone-400 mb-0.5">País</span>
                                    <input
                                        name="countryCode"
                                        type="text"
                                        value={form.countryCode}
                                        onChange={handleChange}
                                        className="w-full px-2 py-2 text-sm text-center border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <span className="block text-[10px] text-stone-400 mb-0.5">Cód. Área *</span>
                                    <input
                                        name="areaCode"
                                        type="text"
                                        placeholder="11"
                                        value={form.areaCode}
                                        onChange={handleChange}
                                        className="w-full px-2 py-2 text-sm text-center border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="col-span-5">
                                    <span className="block text-[10px] text-stone-400 mb-0.5">Número *</span>
                                    <input
                                        name="phoneNumber"
                                        type="text"
                                        placeholder="12345678"
                                        value={form.phoneNumber}
                                        onChange={handleChange}
                                        className="w-full px-2 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    DNI / CUIT *
                                </label>
                                <input
                                    name="dni_cuit"
                                    type="text"
                                    placeholder="20123456789"
                                    value={form.dni_cuit}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Dirección de Envío *
                                </label>
                                <input
                                    name="address"
                                    type="text"
                                    placeholder="CALLE Y N° , C.P. , LOCALIDAD"
                                    value={form.address}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                                />
                            </div>
                        </div>

                        {/* Selector de Avatar / Estilo de Perfil */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Estilo de Avatar *
                            </label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                                <option value="neutral">Estándar / Neutral</option>
                                <option value="male">Estilo Masculino</option>
                                <option value="female">Estilo Femenino</option>
                            </select>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition"
                            >
                                {loading ? 'Registrando...' : 'Completar Registro'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}