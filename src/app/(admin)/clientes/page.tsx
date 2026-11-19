'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { getClients, createClient, updateClient, deleteClient } from '@/actions/client-actions';
import { Pencil, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Search, UserPlus, ShieldCheck, Users, FileText, Eye, EyeOff, X, Plus } from 'lucide-react';

export default function ClientesYPersonalPage() {
    const [activeTab, setActiveTab] = useState<'clientes' | 'personal'>('clientes');

    const [records, setRecords] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('todos');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Ampliamos a 8 registros ya que hay más espacio libre

    const [isPending, startTransition] = useTransition();

    // Control de la Ventana Pop-up (Modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Detección del rol del usuario activo
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    // Campos del formulario en el modal
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [dniCuit, setDniCuit] = useState('');
    const [role, setRole] = useState('cliente_presencial');

    // Sub-campos de dirección (solo para clientes)
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [locality, setLocality] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const roleStored = localStorage.getItem('user_role') || '';
        setCurrentUserRole(roleStored.toUpperCase());
    }, []);

    const isAdmin = currentUserRole === 'ADMIN';

    const loadData = async () => {
        const data = await getClients(searchTerm, sortOrder, roleFilter, activeTab);
        setRecords(data);
    };

    useEffect(() => {
        loadData();
    }, [searchTerm, sortOrder, roleFilter, activeTab]);

    const handleTabChange = (tab: 'clientes' | 'personal') => {
        setActiveTab(tab);
        setRoleFilter('todos');
        setCurrentPage(1);
    };

    const handleOpenCreateModal = () => {
        setEditingId(null);
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setDniCuit('');
        setStreet('');
        setPostalCode('');
        setLocality('');
        setRole(activeTab === 'clientes' ? 'cliente_presencial' : 'CAJERO');
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const handleEdit = (item: any) => {
        if (!isAdmin) return;
        setEditingId(item.id);
        setName(item.name || '');
        setEmail(item.email || '');
        setPassword('');
        setPhone(item.phone || '');
        setDniCuit(item.dni_cuit || '');
        setRole(item.role || (activeTab === 'clientes' ? 'cliente_presencial' : 'CAJERO'));

        if (activeTab === 'clientes' && item.address && item.address !== 'S/D') {
            const parts = item.address.split(',').map((p: string) => p.trim());
            setStreet(parts[0] || '');
            setPostalCode(parts[1] || '');
            setLocality(parts[2] || '');
        }
        setError('');
        setSuccess('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!isAdmin) {
            setError('Acceso denegado.');
            return;
        }

        if (!name.trim() || !email.trim()) {
            setError('Nombre y correo electrónico son obligatorios.');
            return;
        }

        if (activeTab === 'personal' && !editingId && !password.trim()) {
            setError('La contraseña es obligatoria para el nuevo personal interno.');
            return;
        }

        const fullAddress = activeTab === 'clientes'
            ? [street.trim(), postalCode.trim(), locality.trim()].filter(Boolean).join(', ') || 'S/D'
            : 'PERSONAL INTERNO';

        startTransition(async () => {
            let res;
            const payload: any = { name, email, phone, address: fullAddress, dni_cuit: dniCuit, role };
            if (password.trim()) payload.password = password;

            if (editingId) {
                res = await updateClient(editingId, payload);
            } else {
                res = await createClient(payload);
            }

            if (res.error) {
                setError(res.error);
            } else {
                setSuccess(editingId ? '¡Registro actualizado con éxito!' : '¡Registro creado con éxito!');
                loadData();
                setTimeout(() => {
                    setIsModalOpen(false);
                    setSuccess('');
                }, 1200);
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) return;
        if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            const res = await deleteClient(id);
            if (res.error) {
                alert(res.error);
            } else {
                loadData();
            }
        }
    };

    const getBadge = (r: string) => {
        switch (r) {
            case 'ADMIN':
                return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-bold">👑 Admin</span>;
            case 'CAJERO':
                return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold">⚡ Cajero</span>;
            case 'OPERADOR':
                return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-bold">💻 Operador</span>;
            case 'DEPOSITO':
                return <span className="bg-orange-100 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded text-[9px] font-bold">📦 Depósito</span>;
            case 'cliente_web':
                return <span className="bg-sky-100 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded text-[9px] font-bold">Web 🌐</span>;
            case 'cliente_presencial':
                return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-bold">Presencial 🌿</span>;
            case 'cliente_pos':
                return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] font-bold">POS ⚡</span>;
            default:
                return <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">{r}</span>;
        }
    };

    const totalPages = Math.ceil(records.length / itemsPerPage) || 1;
    const paginatedRecords = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-slate-50/60 pb-6 font-sans text-slate-800 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 pt-3 space-y-3">

                {/* Encabezado, Pestañas y Botón de Nuevo Registro (Solo Admin) */}
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm">👥</span>
                        <div>
                            <h1 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                                {activeTab === 'clientes' ? 'Gestión de Clientes — Omnicanal' : 'Personal Interno & Accesos al Sistema'}
                            </h1>
                            <p className="text-[10px] text-slate-500">Módulo unificado ({isAdmin ? 'Modo Administrador - Control Total' : 'Modo Lectura'})</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Pestañas */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                            <button
                                onClick={() => handleTabChange('clientes')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'clientes' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <Users className="w-3.5 h-3.5" /> Clientes
                            </button>
                            <button
                                onClick={() => handleTabChange('personal')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'personal' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <ShieldCheck className="w-3.5 h-3.5" /> Personal Interno
                            </button>
                        </div>

                        {/* Botón Pop-up para Crear (Exclusivo Administrador) */}
                        {isAdmin && (
                            <button
                                onClick={handleOpenCreateModal}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                                <Plus className="w-4 h-4" /> Nuevo Registro
                            </button>
                        )}
                    </div>
                </div>

                {/* Listado en Ancho Completo */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-extrabold text-slate-900 uppercase">
                                {activeTab === 'clientes' ? 'Listado General de Clientes' : 'Equipo de Trabajo Autorizado'}
                            </h3>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value="todos">Todos los roles</option>
                                {activeTab === 'clientes' ? (
                                    <>
                                        <option value="cliente_presencial">🌿 Presenciales</option>
                                        <option value="cliente_web">🌐 Web</option>
                                        <option value="cliente_pos">⚡ POS</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="ADMIN">👑 Administradores</option>
                                        <option value="CAJERO">⚡ Cajeros</option>
                                        <option value="OPERADOR">💻 Operadores</option>
                                        <option value="DEPOSITO">📦 Depósito</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="relative w-full sm:w-72">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, mail, DNI..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                        </div>
                    </div>

                    {/* TABLA DE DATOS */}
                    <div className="overflow-x-auto min-h-[320px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-2.5 px-3 cursor-pointer hover:text-slate-700 w-1/3" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                                        <div className="flex items-center gap-1">
                                            Nombre / Correo <ArrowUpDown className="w-3 h-3" />
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3 w-32">Rol / Perfil</th>
                                    <th className="py-2.5 px-3 w-36">{activeTab === 'clientes' ? 'Teléfono / DNI' : 'Estado'}</th>
                                    <th className="py-2.5 px-3">{activeTab === 'clientes' ? 'Dirección' : 'Acceso'}</th>
                                    <th className="py-2.5 px-3 text-center w-28">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {paginatedRecords.length > 0 ? (
                                    paginatedRecords.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                            <td className="py-3 px-3">
                                                <div className="font-bold text-slate-800">{item.name}</div>
                                                <div className="text-[10px] text-slate-400">{item.email}</div>
                                            </td>
                                            <td className="py-3 px-3">
                                                {getBadge(item.role)}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600 text-[11px]">
                                                {activeTab === 'clientes' ? (
                                                    <>
                                                        <div>{item.phone || '-'}</div>
                                                        <div className="text-[9px] text-slate-400 font-mono">{item.dni_cuit}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold text-[10px]">Activo en Sistema</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600 text-[11px] truncate max-w-[200px]">
                                                {activeTab === 'clientes' ? (item.address || 'S/D') : 'Personal Interno'}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {activeTab === 'clientes' && (
                                                        <Link
                                                            href={`/clientes/${item.id}`}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                            title="Ver Estado de Cuenta y Movimientos"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </Link>
                                                    )}
                                                    {isAdmin ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                                title="Editar Registro"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                                title="Eliminar Registro"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Sólo lectura</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-slate-400 text-xs italic">
                                            No se encontraron registros con este filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginador */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <span>Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong></span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                disabled={currentPage >= totalPages}
                                className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ================================================= */}
                {/* VENTANA POP-UP / MODAL PARA CREAR O EDITAR REGISTROS */}
                {/* ================================================= */}
                {isModalOpen && isAdmin && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">

                            {/* Cabecera del Modal */}
                            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
                                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-emerald-600" />
                                    {editingId ? 'Editar Registro' : activeTab === 'clientes' ? 'Nuevo Cliente' : 'Nuevo Usuario Interno'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Alertas dentro del modal */}
                            {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-2.5 font-medium">{error}</div>}
                            {success && <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-2.5 font-medium">{success}</div>}

                            {/* Formulario */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                        {activeTab === 'clientes' ? 'Perfil / Tipo de Cliente *' : 'Rol del Empleado *'}
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    >
                                        {activeTab === 'clientes' ? (
                                            <>
                                                <option value="cliente_presencial">🌿 Cliente Presencial (Mostrador)</option>
                                                <option value="cliente_web">🌐 Cliente Tienda Web</option>
                                                <option value="cliente_pos">⚡ Cliente POS / Caja Rápida</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="ADMIN">👑 Administrador General</option>
                                                <option value="CAJERO">⚡ Cajero / POS</option>
                                                <option value="OPERADOR">💻 Operador / Gestión</option>
                                                <option value="DEPOSITO">📦 Personal de Depósito</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nombre y Apellido *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value.toUpperCase())}
                                        placeholder="EJ: JUAN PÉREZ"
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Correo Electrónico *</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="correo@ejemplo.com"
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                            {activeTab === 'clientes' ? 'DNI / CUIT' : 'Contraseña de Acceso'}
                                        </label>
                                        {activeTab === 'clientes' ? (
                                            <input
                                                type="text"
                                                value={dniCuit}
                                                onChange={(e) => setDniCuit(e.target.value.toUpperCase())}
                                                placeholder="20123456789"
                                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                            />
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder={editingId ? "Dejar en blanco para no cambiar" : "Mín. 6 caracteres"}
                                                    className="w-full pl-3.5 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {activeTab === 'clientes' && (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Teléfono / Celular</label>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="1123456789"
                                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Dirección / Envío</label>
                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-600">
                                                <input
                                                    type="text"
                                                    value={street}
                                                    onChange={(e) => setStreet(e.target.value.toUpperCase())}
                                                    placeholder="CALLE Y N°"
                                                    className="flex-1 min-w-0 px-3 py-2 bg-transparent text-xs uppercase focus:outline-none font-medium placeholder:text-slate-400"
                                                />
                                                <span className="text-slate-300 font-light px-0.5">/</span>
                                                <input
                                                    type="text"
                                                    value={postalCode}
                                                    onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                                                    placeholder="C.P."
                                                    className="w-16 px-1.5 py-2 bg-transparent text-xs uppercase focus:outline-none font-medium text-center placeholder:text-slate-400"
                                                />
                                                <span className="text-slate-300 font-light px-0.5">/</span>
                                                <input
                                                    type="text"
                                                    value={locality}
                                                    onChange={(e) => setLocality(e.target.value.toUpperCase())}
                                                    placeholder="LOCALIDAD"
                                                    className="w-28 px-2.5 py-2 bg-transparent text-xs uppercase focus:outline-none font-medium placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Botones del Modal */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                                    >
                                        {isPending ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Registrar en Sistema'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}