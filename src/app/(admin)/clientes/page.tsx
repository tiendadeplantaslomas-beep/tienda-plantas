'use client';

import { useState, useEffect, useTransition } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '@/actions/client-actions';
import { Pencil, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Search, UserPlus, ShieldCheck, Users } from 'lucide-react';

export default function ClientesYPersonalPage() {
    // Estado para alternar entre pestañas: 'clientes' o 'personal'
    const [activeTab, setActiveTab] = useState<'clientes' | 'personal'>('clientes');

    const [records, setRecords] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('todos');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isPending, startTransition] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null);

    // Campos del formulario
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); // Específico para personal interno
    const [phone, setPhone] = useState('');
    const [dniCuit, setDniCuit] = useState('');
    const [role, setRole] = useState('cliente_presencial');

    // Sub-campos de dirección (solo para clientes)
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [locality, setLocality] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadData = async () => {
        // Si estamos en la pestaña de clientes, filtramos roles de clientes. Si estamos en personal, roles internos.
        const data = await getClients(searchTerm, sortOrder, roleFilter);
        setRecords(data);
    };

    useEffect(() => {
        loadData();
    }, [searchTerm, sortOrder, roleFilter, activeTab]);

    const handleTabChange = (tab: 'clientes' | 'personal') => {
        setActiveTab(tab);
        setEditingId(null);
        setError('');
        setSuccess('');
        setRoleFilter('todos');
        // Valores por defecto según la pestaña
        setRole(tab === 'clientes' ? 'cliente_presencial' : 'CAJERO');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim() || !email.trim()) {
            setError('Nombre y correo electrónico son obligatorios.');
            return;
        }

        if (activeTab === 'personal' && !editingId && !password.trim()) {
            setError('La contraseña es obligatoria para el personal interno.');
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
                setName('');
                setEmail('');
                setPassword('');
                setPhone('');
                setDniCuit('');
                setStreet('');
                setPostalCode('');
                setLocality('');
                setRole(activeTab === 'clientes' ? 'cliente_presencial' : 'CAJERO');
                setEditingId(null);
                loadData();
                setTimeout(() => setSuccess(''), 3000);
            }
        });
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setName(item.name || '');
        setEmail(item.email || '');
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
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setDniCuit('');
        setStreet('');
        setPostalCode('');
        setLocality('');
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            const res = await deleteClient(id);
            if (res.error) {
                setError(res.error);
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
        <div className="bg-slate-50/60 pb-3 font-sans text-slate-800 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 pt-2 space-y-2">

                {/* Encabezado y Pestañas */}
                <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs">👥</span>
                        <div>
                            <h1 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                                {activeTab === 'clientes' ? 'Gestión de Clientes — Omnicanal' : 'Personal Interno & Accesos al Sistema'}
                            </h1>
                            <p className="text-[10px] text-slate-500">Módulo unificado de perfiles y usuarios</p>
                        </div>
                    </div>

                    {/* Botones de Pestañas */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => handleTabChange('clientes')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'clientes'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Users className="w-3.5 h-3.5" /> Clientes
                        </button>
                        <button
                            onClick={() => handleTabChange('personal')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'personal'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" /> Personal Interno
                        </button>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-2 font-medium">{error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-2 font-medium">{success}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

                    {/* Formulario Dinámico (Izquierda) */}
                    <div className="lg:col-span-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <h2 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                                <UserPlus className="w-4 h-4 text-emerald-600" />
                                {editingId ? 'Editar Registro' : activeTab === 'clientes' ? 'Nuevo Cliente' : 'Nuevo Usuario Interno'}
                            </h2>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                    {activeTab === 'clientes' ? 'Perfil / Tipo de Cliente *' : 'Rol del Empleado *'}
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Nombre y Apellido *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value.toUpperCase())}
                                    placeholder="EJ: JUAN PÉREZ"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Correo Electrónico *</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                        {activeTab === 'clientes' ? 'DNI / CUIT' : 'Contraseña de Acceso *'}
                                    </label>
                                    {activeTab === 'clientes' ? (
                                        <input
                                            type="text"
                                            value={dniCuit}
                                            onChange={(e) => setDniCuit(e.target.value.toUpperCase())}
                                            placeholder="20123456789"
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                    ) : (
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                    )}
                                </div>
                            </div>

                            {activeTab === 'clientes' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Teléfono / Celular</label>
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="1123456789"
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Dirección / Envío</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-600">
                                            <input
                                                type="text"
                                                value={street}
                                                onChange={(e) => setStreet(e.target.value.toUpperCase())}
                                                placeholder="CALLE Y N°"
                                                className="flex-1 min-w-0 px-2.5 py-1.5 bg-transparent text-xs uppercase focus:outline-none font-medium placeholder:text-slate-400"
                                            />
                                            <span className="text-slate-300 font-light px-0.5">/</span>
                                            <input
                                                type="text"
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                                                placeholder="C.P."
                                                className="w-14 px-1 py-1.5 bg-transparent text-xs uppercase focus:outline-none font-medium text-center placeholder:text-slate-400"
                                            />
                                            <span className="text-slate-300 font-light px-0.5">/</span>
                                            <input
                                                type="text"
                                                value={locality}
                                                onChange={(e) => setLocality(e.target.value.toUpperCase())}
                                                placeholder="LOCALIDAD"
                                                className="w-24 px-2 py-1.5 bg-transparent text-xs uppercase focus:outline-none font-medium placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                                {isPending ? 'Guardando...' : editingId ? 'Actualizar Registro' : 'Registrar en el Sistema'}
                            </button>
                        </form>
                    </div>

                    {/* Listado y Filtros (Derecha) */}
                    <div className="lg:col-span-8 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-extrabold text-slate-900 uppercase">
                                    {activeTab === 'clientes' ? 'Listado de Clientes' : 'Equipo de Trabajo'}
                                </h3>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                                >
                                    <option value="todos">Todos</option>
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

                            <div className="relative w-full sm:w-60">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, mail..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[300px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <th className="py-1.5 px-2 cursor-pointer hover:text-slate-700" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                                            <div className="flex items-center gap-1">
                                                Nombre / Correo <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th className="py-1.5 px-2">Rol / Perfil</th>
                                        <th className="py-1.5 px-2">{activeTab === 'clientes' ? 'Teléfono / DNI' : 'Estado'}</th>
                                        <th className="py-1.5 px-2">{activeTab === 'clientes' ? 'Dirección' : 'Acceso'}</th>
                                        <th className="py-1.5 px-2 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {paginatedRecords.length > 0 ? (
                                        paginatedRecords.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                                <td className="py-2 px-2">
                                                    <div className="font-bold text-slate-800">{item.name}</div>
                                                    <div className="text-[10px] text-slate-400">{item.email}</div>
                                                </td>
                                                <td className="py-2 px-2">
                                                    {getBadge(item.role)}
                                                </td>
                                                <td className="py-2 px-2 text-slate-600 text-[11px]">
                                                    {activeTab === 'clientes' ? (
                                                        <>
                                                            <div>{item.phone || '-'}</div>
                                                            <div className="text-[9px] text-slate-400 font-mono">{item.dni_cuit}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-emerald-600 font-bold text-[10px]">Activo en Sistema</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2 text-slate-600 truncate max-w-xs">
                                                    {activeTab === 'clientes' ? (item.address || '-') : <span className="font-mono text-[10px] text-slate-400">Credenciales OK</span>}
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                                                No se encontraron registros con este filtro.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginador */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <span>Página {currentPage} de {totalPages || 1}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage >= totalPages}
                                    className="p-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}