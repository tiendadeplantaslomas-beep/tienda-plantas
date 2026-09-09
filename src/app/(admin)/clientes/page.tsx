'use client';

import { useState, useEffect, useTransition } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '@/actions/client-actions';
import { Pencil, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react';

export default function ClientesPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isPending, startTransition] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Sub-campos internos del input unificado de dirección
    const [street, setStreet] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [locality, setLocality] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadClients = async (search = searchTerm, order = sortOrder) => {
        const data = await getClients(search, order);
        setClients(data);
    };

    useEffect(() => {
        loadClients();
    }, [searchTerm, sortOrder]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('El nombre es obligatorio.');
            return;
        }

        if (!email.trim()) {
            setError('El correo electrónico es obligatorio.');
            return;
        }

        // Unimos los fragmentos internos en un solo string estructurado para la base de datos
        const fullAddress = [
            street.trim(),
            postalCode.trim(),
            locality.trim()
        ].filter(Boolean).join(', ');

        startTransition(async () => {
            let res;
            if (editingId) {
                res = await updateClient(editingId, { name, email, phone, address: fullAddress });
            } else {
                res = await createClient({ name, email, phone, address: fullAddress });
            }

            if (res.error) {
                setError(res.error);
            } else {
                setSuccess(editingId ? '¡Cliente actualizado con éxito!' : '¡Cliente registrado con éxito!');
                setName('');
                setEmail('');
                setPhone('');
                setStreet('');
                setPostalCode('');
                setLocality('');
                setEditingId(null);
                loadClients();
                setTimeout(() => setSuccess(''), 3000);
            }
        });
    };

    const handleEdit = (client: any) => {
        setEditingId(client.id);
        setName(client.name || '');
        setEmail(client.email || '');
        setPhone(client.phone || '');

        // Separamos la dirección guardada para ubicarla en cada segmento del input
        if (client.address) {
            const parts = client.address.split(',').map((p: string) => p.trim());
            setStreet(parts[0] || '');
            setPostalCode(parts[1] || '');
            setLocality(parts[2] || '');
        } else {
            setStreet('');
            setPostalCode('');
            setLocality('');
        }

        setError('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setName('');
        setEmail('');
        setPhone('');
        setStreet('');
        setPostalCode('');
        setLocality('');
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
            const res = await deleteClient(id);
            if (res.error) {
                setError(res.error);
            } else {
                loadClients();
            }
        }
    };

    const toggleSort = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    // Paginación
    const totalPages = Math.ceil(clients.length / itemsPerPage) || 1;
    const paginatedClients = clients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-slate-50/60 pb-3 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto px-4 pt-2 space-y-2">
                {/* Título de la página */}
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs">👥</span>
                        <div>
                            <h1 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                                CLIENTES — BASE DE DATOS CRM
                            </h1>
                            <p className="text-[10px] text-slate-500 capitalize">Viernes, 28 de Agosto de 2026</p>
                        </div>
                    </div>
                </div>

                {/* Mensajes de feedback */}
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-2 font-medium">{error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-2 font-medium">{success}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                    {/* Formulario Compacto (Izquierda) */}
                    <div className="lg:col-span-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <h2 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                                <UserPlus className="w-4 h-4 text-emerald-600" />
                                {editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                            </h2>
                            {editingId && (
                                <button onClick={handleCancelEdit} className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer">
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-2">
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

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Correo Electrónico *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="EJ: cliente@email.com"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Teléfono / Celular</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="EJ: 1123456789"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                                />
                            </div>

                            {/* Input Multinivel Integrado para la Dirección */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Dirección (Maps) *</label>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-600 focus-within:bg-white transition">
                                    <input
                                        type="text"
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value.toUpperCase())}
                                        placeholder="CALLE Y N°"
                                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-transparent text-xs uppercase focus:outline-none font-medium placeholder:text-slate-400"
                                    />
                                    <span className="text-slate-300 font-light select-none px-0.5">/</span>
                                    <input
                                        type="text"
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                                        placeholder="C.P."
                                        className="w-16 px-2 py-1.5 bg-transparent text-xs uppercase focus:outline-none font-medium text-center placeholder:text-slate-400"
                                    />
                                    <span className="text-slate-300 font-light select-none px-0.5">/</span>
                                    <input
                                        type="text"
                                        value={locality}
                                        onChange={(e) => setLocality(e.target.value.toUpperCase())}
                                        placeholder="LOCALIDAD"
                                        className="w-28 px-2.5 py-1.5 bg-transparent text-xs uppercase focus:outline-none font-medium placeholder:text-slate-400"
                                    />
                                </div>
                                <p className="text-[9px] text-slate-400 mt-0.5">Ej: LAFINUR 28 / 1832 / LOMAS DE ZAMORA</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                                {isPending ? 'Guardando...' : editingId ? 'Actualizar Cliente' : 'Registrar Cliente'}
                            </button>
                        </form>
                    </div>

                    {/* Listado y Buscador (Derecha) */}
                    <div className="lg:col-span-8 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-100 pb-1.5">
                            <h3 className="text-xs font-extrabold text-slate-900 uppercase">Listado de Clientes Registrados</h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente, mail, dirección..."
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
                                        <th className="py-1.5 px-2 cursor-pointer hover:text-slate-700" onClick={toggleSort}>
                                            <div className="flex items-center gap-1">
                                                Nombre / Mail <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th className="py-1.5 px-2">Teléfono</th>
                                        <th className="py-1.5 px-2">Dirección (Maps)</th>
                                        <th className="py-1.5 px-2 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {paginatedClients.length > 0 ? (
                                        paginatedClients.map((client) => (
                                            <tr key={client.id} className="hover:bg-slate-50/50 transition">
                                                <td className="py-1.5 px-2">
                                                    <div className="font-bold text-slate-800">{client.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">{client.email}</div>
                                                </td>
                                                <td className="py-1.5 px-2 text-slate-600">{client.phone || '-'}</td>
                                                <td className="py-1.5 px-2 text-slate-600 truncate max-w-xs">{client.address || '-'}</td>
                                                <td className="py-1.5 px-2 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => handleEdit(client)}
                                                            title="Editar cliente"
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(client.id)}
                                                            title="Eliminar cliente"
                                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                                                No se encontraron clientes registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginador */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
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