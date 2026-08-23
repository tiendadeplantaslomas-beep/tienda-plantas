'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Key, User, Package, CreditCard, ShieldCheck, Mail, Phone, MapPin, Eye, EyeOff } from 'lucide-react';

// Función auxiliar para desglosar la dirección vieja de la DB en campos individuales
const parseInitialAddress = (addr = '') => {
    if (!addr) return { street: '', number: '', floorDept: '', postalCode: '', city: '' };

    const cleanAddr = addr.replace(/[()]/g, '');
    const parts = cleanAddr.split(',').map(p => p.trim());

    let streetNum = parts[0] || '';
    const match = streetNum.match(/^(.*?)\s+(\d+[\w\s-]*)$/);
    let street = streetNum;
    let number = '';
    if (match) {
        street = match[1].trim();
        number = match[2].trim();
    }

    let postalCode = '';
    let city = '';

    if (parts.length > 1) {
        if (/^\d{4,5}$/.test(parts[1])) {
            postalCode = parts[1];
            city = parts[2] || '';
        } else {
            city = parts[1] || '';
        }
    }
    if (parts.length > 2 && !city) {
        city = parts[2];
    }

    return { street, number, floorDept: '', postalCode, city };
};

export default function UserProfileClient({ initialCustomer }: { initialCustomer: any }) {
    const router = useRouter();
    const safeCustomer = initialCustomer || {};

    const [customer, setCustomer] = useState<any>(safeCustomer);
    const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'avatar' | 'security' | 'orders'>('profile');

    const [selectedGender, setSelectedGender] = useState(safeCustomer.gender || 'neutral');
    const [customImage, setCustomImage] = useState<string | null>(safeCustomer.image_url || null);

    const initialAddr = parseInitialAddress(safeCustomer.address);

    const [editForm, setEditForm] = useState({
        name: safeCustomer.name || '',
        phone: safeCustomer.phone || '',
        street: initialAddr.street,
        number: initialAddr.number,
        floorDept: initialAddr.floorDept,
        postalCode: initialAddr.postalCode,
        city: initialAddr.city,
        province: 'Buenos Aires',
        country: 'Argentina',
        preferredPaymentMethod: safeCustomer.preferred_payment_method || 'TRANSFERENCIA',
        paymentDetails: safeCustomer.payment_details || ''
    });

    const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Función auxiliar para mostrar mensajes y auto-ocultar los de éxito a los 4 segundos
    const showNotification = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        if (type === 'success') {
            setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 4000);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 250;
                    const MAX_HEIGHT = 250;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    setCustomImage(dataUrl);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveAvatar = async () => {
        setLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch('/api/tienda/customer/update-avatar', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: customer.id, gender: selectedGender, imageUrl: customImage })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar');

            setCustomer(data.customer);
            showNotification('Avatar actualizado con éxito en la base de datos', 'success');
            router.refresh();
        } catch (err: any) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        const fullAddress = `${editForm.street} ${editForm.number}${editForm.floorDept ? `, ${editForm.floorDept}` : ''} (${editForm.postalCode}), ${editForm.city}, ${editForm.province}, ${editForm.country}`;

        try {
            const res = await fetch('/api/tienda/customer/update-profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    name: editForm.name,
                    phone: editForm.phone,
                    address: fullAddress,
                    preferredPaymentMethod: editForm.preferredPaymentMethod,
                    paymentDetails: editForm.paymentDetails
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');

            setCustomer(data.customer);
            showNotification('Datos actualizados con éxito', 'success');
            router.refresh();
        } catch (err: any) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passForm.newPassword !== passForm.confirmPassword) {
            showNotification('Las nuevas contraseñas no coinciden.', 'error');
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch('/api/tienda/customer/change-password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    currentPassword: passForm.currentPassword,
                    newPassword: passForm.newPassword
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña');

            setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showNotification('Contraseña cambiada exitosamente.', 'success');
        } catch (err: any) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const avatarStyle = selectedGender === 'male' ? 'micah' : selectedGender === 'female' ? 'adventurer' : 'avataaars';
    const defaultAvatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${customer?.email || 'user'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    const displayImage = customImage || customer?.image_url || defaultAvatarUrl;

    return (
        <div className="bg-stone-100 rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6">
            <div className="max-w-6xl w-full mx-auto">

                {/* ESTRUCTURA GENERAL DE DOS COLUMNAS (LG) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* COLUMNA IZQUIERDA: Tarjeta / Resumen de Perfil (Span 4) */}
                    <div className="lg:col-span-4 bg-white/80 backdrop-blur-md rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col items-center text-center space-y-4 sticky top-6">
                        <div className="relative">
                            <img
                                src={displayImage}
                                alt="Avatar"
                                className="w-28 h-28 rounded-full border-4 border-emerald-600 shadow-md object-cover bg-white mx-auto"
                            />
                            <span className="absolute bottom-1 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                        </div>

                        <div className="space-y-1 w-full">
                            <h2 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase">
                                {customer?.name}
                            </h2>
                            <div className="pt-1">
                                <span className="inline-flex items-center justify-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Cuenta Verificada
                                </span>
                            </div>
                        </div>

                        <div className="w-full border-t border-slate-100 pt-4 space-y-2.5 text-left text-xs text-slate-500">
                            <div className="flex items-center gap-2.5 truncate">
                                <Mail className="h-4 w-4 text-stone-400 shrink-0" />
                                <span className="truncate">{customer?.email}</span>
                            </div>
                            <div className="flex items-center gap-2.5 truncate">
                                <Phone className="h-4 w-4 text-stone-400 shrink-0" />
                                <span>{customer?.phone || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{customer?.address || 'Sin dirección registrada'}</span>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Solapas y Formularios (Span 8) */}
                    <div className="lg:col-span-8 bg-white/95 backdrop-blur-xs rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                        {/* Barra de solapas horizontales */}
                        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/90 p-2 gap-1.5">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'profile' ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <User className="h-4 w-4" /> Datos Personales
                            </button>
                            <button
                                onClick={() => setActiveTab('payment')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'payment' ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <CreditCard className="h-4 w-4" /> Métodos de Pago
                            </button>
                            <button
                                onClick={() => setActiveTab('avatar')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'avatar' ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <Camera className="h-4 w-4" /> Avatar
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'security' ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <Key className="h-4 w-4" /> Seguridad
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'orders' ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <Package className="h-4 w-4" /> Compras
                            </button>
                        </div>

                        {/* Contenido Dinámico de las solapas */}
                        <div className="p-6">

                            {message.text && (
                                <div className={`mb-4 p-3 rounded-lg text-xs font-medium transition-all ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Solapa 1: Datos Personales */}
                            {activeTab === 'profile' && (
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre y Apellido</label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg uppercase bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                                            <input
                                                type="email"
                                                value={customer?.email || ''}
                                                disabled
                                                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-100 text-stone-400 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teléfono / Celular</label>
                                            <input
                                                type="text"
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                        </div>

                                        {/* Dirección Estructurada */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Calle</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Perón"
                                                value={editForm.street}
                                                onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg uppercase bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Número / Altura</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: 2026"
                                                value={editForm.number}
                                                onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg uppercase bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Piso / Depto (Opcional)</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: 3° B"
                                                value={editForm.floorDept}
                                                onChange={(e) => setEditForm({ ...editForm, floorDept: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg uppercase bg-slate-50 focus:bg-white transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Código Postal</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: 1824"
                                                value={editForm.postalCode}
                                                onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Localidad / Partido</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Lanús"
                                                value={editForm.city}
                                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Provincia / País</label>
                                            <input
                                                type="text"
                                                value={`${editForm.province}, ${editForm.country}`}
                                                disabled
                                                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-100 text-stone-500 cursor-not-allowed font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition shadow-2xs cursor-pointer"
                                        >
                                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Solapa 2: Métodos de Pago */}
                            {activeTab === 'payment' && (
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Método de Pago Preferido</label>
                                        <select
                                            value={editForm.preferredPaymentMethod}
                                            onChange={(e) => setEditForm({ ...editForm, preferredPaymentMethod: e.target.value })}
                                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                        >
                                            <option value="TRANSFERENCIA">Transferencia Bancaria (CBU / Alias)</option>
                                            <option value="MERCADOPAGO">Mercado Pago / CVU</option>
                                            <option value="EFECTIVO">Efectivo al retirar / Contra entrega</option>
                                            <option value="TARJETA">Tarjeta de Crédito / Débito</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Datos o Referencia de Pago (Alias / CBU opcional)</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: ALIAS.MERCADOPAGO o Banco Provincia..."
                                            value={editForm.paymentDetails}
                                            onChange={(e) => setEditForm({ ...editForm, paymentDetails: e.target.value })}
                                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                        />
                                        <span className="block mt-1.5 text-[11px] text-stone-400">Esta información ayuda a agilizar la validación de tus pagos en las compras.</span>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition shadow-2xs cursor-pointer"
                                        >
                                            {loading ? 'Guardando...' : 'Guardar Preferencias de Pago'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Solapa 3: Avatar */}
                            {activeTab === 'avatar' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <img src={displayImage} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-emerald-500 object-cover shadow-2xs bg-white" />
                                        <p className="text-xs text-stone-500">Seleccioná un estilo de avatar predeterminado o cargá una foto desde tu dispositivo.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Estilo Automático</label>
                                            <select
                                                value={selectedGender}
                                                onChange={(e) => { setSelectedGender(e.target.value); setCustomImage(null); }}
                                                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                                            >
                                                <option value="neutral">Neutral</option>
                                                <option value="male">Masculino</option>
                                                <option value="female">Femenino</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Subir Imagen</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            onClick={handleSaveAvatar}
                                            disabled={loading}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition shadow-2xs cursor-pointer"
                                        >
                                            {loading ? 'Guardando...' : 'Actualizar Avatar'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Solapa 4: Seguridad */}
                            {activeTab === 'security' && (
                                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Contraseña Actual</label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={passForm.currentPassword}
                                                onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                                                className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
                                            >
                                                {showCurrentPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={passForm.newPassword}
                                                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                                                className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
                                            >
                                                {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirmar Nueva Contraseña</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={passForm.confirmPassword}
                                                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                                                className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white transition"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
                                            >
                                                {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition shadow-2xs cursor-pointer"
                                        >
                                            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Solapa 5: Historial de Compras */}
                            {activeTab === 'orders' && (
                                <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                    <Package className="h-10 w-10 text-stone-300 mx-auto mb-2.5" />
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Sin compras registradas</h3>
                                    <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">Tus pedidos realizados aparecerán detallados en este sector con su respectivo estado de seguimiento.</p>
                                    <Link
                                        href="/tienda"
                                        className="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition shadow-2xs"
                                    >
                                        Ir a Comprar Productos
                                    </Link>
                                </div>
                            )}

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}