'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Camera } from 'lucide-react';
import { getCurrentUserProfile, updateCurrentUserProfile } from '@/actions/client-actions';

export default function AdminPerfilPage() {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [rol, setRol] = useState('PERSONAL');
    const [imagenUrl, setImagenUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchPerfil() {
            try {
                // Obtenemos el perfil directamente desde TiDB usando Prisma a través de la Server Action
                const user = await getCurrentUserProfile();
                if (user) {
                    setNombre(user.name || '');
                    setEmail(user.email || '');
                    setRol(user.role ? user.role.toUpperCase() : 'PERSONAL');
                    setImagenUrl(user.image || '');
                } else {
                    setError('No se pudo encontrar la sesión activa del usuario.');
                }
            } catch (err) {
                console.error('Error al cargar perfil:', err);
                setError('Error al conectar con la base de datos.');
            } finally {
                setLoading(false);
            }
        }
        fetchPerfil();
    }, []);

    // Manejador para cargar la imagen localmente y convertirla a base64 para guardarla en TiDB
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagenUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMensaje('');
        setError('');

        startTransition(async () => {
            const res = await updateCurrentUserProfile({
                name: nombre,
                email: email,
                image: imagenUrl
            });

            if (res.error) {
                setError(res.error);
            } else {
                setMensaje('¡Cambios guardados correctamente en TiDB!');
                setTimeout(() => setMensaje(''), 4000);
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-100 p-6 flex items-center justify-center text-xs text-stone-500 font-bold uppercase">
                Cargando perfil desde la base de datos...
            </div>
        );
    }

    const iniciales = nombre ? nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';

    return (
        <div className="space-y-4 font-sans text-stone-800 min-h-screen bg-stone-100 p-4 md:p-6 max-w-4xl mx-auto">
            {/* Cabecera */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl transition text-stone-600">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-extrabold text-stone-900 uppercase">Editar Perfil de {rol}</h1>
                        <p className="text-[10px] text-stone-500">Modifica tus datos personales y credenciales de acceso online</p>
                    </div>
                </div>
                <Link href="/dashboard" className="text-xs font-bold text-stone-600 hover:text-stone-900">
                    Cancelar
                </Link>
            </div>

            {/* Mensaje de éxito / error */}
            {mensaje && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-3 font-medium text-center shadow-xs">
                    {mensaje}
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-2xl p-3 font-medium text-center shadow-xs">
                    {error}
                </div>
            )}

            {/* Formulario de Edición */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">

                {/* Sección de Carga de Foto de Perfil */}
                <div className="flex items-center gap-4 border-b border-stone-100 pb-6">
                    <div className="relative group shrink-0">
                        {imagenUrl ? (
                            <img src={imagenUrl} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 bg-emerald-700 text-white rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-sm">
                                {iniciales}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Fotografía de Perfil</label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-stone-200 shadow-2xs">
                                <Camera className="w-3.5 h-3.5 text-emerald-700" /> Seleccionar Imagen
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                            {imagenUrl && (
                                <button
                                    type="button"
                                    onClick={() => setImagenUrl('')}
                                    className="text-xs text-rose-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                                >
                                    Quitar foto
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-stone-400">Formatos admitidos: JPG, PNG. Se almacena de forma persistente en TiDB.</p>
                    </div>
                </div>

                {/* Campos Editables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Nombre Completo</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value.toUpperCase())}
                            required
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Sucursal / Ubicación</span>
                        <span className="font-bold text-stone-700">Lomas de Zamora, Buenos Aires</span>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Rol y Legajo Interno</span>
                        <span className="font-bold text-emerald-700 uppercase">{rol} &bull; Sistema Activo</span>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                    <Link href="/dashboard" className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition">
                        Volver
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" /> {isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}