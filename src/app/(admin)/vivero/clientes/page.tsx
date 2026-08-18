'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getClients, createClient } from '@/actions/client-actions';

interface Client {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
}

type SortField = 'name' | 'phone';
type SortOrder = 'asc' | 'desc';

export default function ClientesModule() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados del formulario
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getClients();
            setClients(data);
        } catch {
            setMessage({ type: 'error', text: 'Error al cargar la agenda de clientes desde la base de datos.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) {
            setMessage({ type: 'error', text: 'El nombre y apellido del cliente son obligatorios.' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await createClient({
                name: cleanName,
                phone,
                address,
                notes
            });

            if (res.error) {
                setMessage({ type: 'error', text: res.error });
            } else {
                setMessage({ type: 'success', text: `Cliente "${cleanName}" guardado correctamente en la base de datos.` });
                setName('');
                setPhone('');
                setAddress('');
                setNotes('');
                loadData();
            }
        } catch {
            setMessage({ type: 'error', text: 'Ocurrió un error al registrar el cliente.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedClients = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();

        return clients
            .filter(c => {
                if (!query) return true;
                const matchName = c.name.toLowerCase().includes(query);
                const matchPhone = c.phone?.toLowerCase().includes(query) ?? false;
                const matchAddress = c.address?.toLowerCase().includes(query) ?? false;
                const matchNotes = c.notes?.toLowerCase().includes(query) ?? false;
                return matchName || matchPhone || matchAddress || matchNotes;
            })
            .sort((a, b) => {
                let valA = '';
                let valB = '';

                if (sortField === 'name') {
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                } else if (sortField === 'phone') {
                    valA = (a.phone || '').toLowerCase();
                    valB = (b.phone || '').toLowerCase();
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
    }, [clients, searchTerm, sortField, sortOrder]);

    const totalItems = filteredAndSortedClients.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedClients = filteredAndSortedClients.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col font-sans text-slate-800 max-w-7xl mx-auto p-2 gap-3">
            {message && (
                <div className={`p-2.5 rounded-md text-[11px] font-medium flex justify-between items-center transition-all shrink-0 ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs'
                        : 'bg-rose-50 text-rose-900 border border-rose-300 shadow-2xs'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <span className="font-semibold">{message.text}</span>
                    </div>
                    <button type="button" onClick={() => setMessage(null)} className="font-bold text-slate-500 hover:text-slate-800 px-1 cursor-pointer">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
                {/* FORMULARIO DE ALTA */}
                <div className="lg:col-span-4 bg-white p-4 rounded-md border border-slate-200/90 shadow-2xs space-y-3">
                    <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide border-b pb-2">
                        <span>👤</span> Nuevo Cliente
                    </h2>

                    <form onSubmit={handleRegisterClient} className="space-y-3">
                        <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Nombre y Apellido *</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Juan Pérez"
                                value={name}
                                onChange={(e) => setName(e.target.value.toUpperCase())}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Teléfono / Celular</label>
                            <input
                                type="text"
                                placeholder="Ej: 11-1234-5678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Dirección (Envío a domicilio)</label>
                            <input
                                type="text"
                                placeholder="Ej: Av. Hipólito Yrigoyen 8400, Lomas"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-extrabold text-slate-600 uppercase mb-1">Notas / Preferencias</label>
                            <textarea
                                rows={3}
                                placeholder="Detalles de interés, preferencias de plantas..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            <span>{submitting ? 'Guardando...' : 'Registrar Cliente'}</span>
                        </button>
                    </form>
                </div>

                {/* LISTADO / AGENDA DE CLIENTES */}
                <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-md shadow-2xs overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                            <span>📋</span> Agenda de Clientes Frecuentes ({clients.length})
                        </h2>

                        <div className="flex items-center gap-1.5">
                            <div className="relative flex-1 sm:w-56">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 text-[10px]">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Buscar cliente, dirección..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 pl-7 text-[10px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-2 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 border-b border-slate-200 text-[9px] font-extrabold text-slate-600 uppercase tracking-wider select-none">
                                    <th onClick={() => handleSort('name')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Nombre {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th onClick={() => handleSort('phone')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/50 transition-colors">
                                        Contacto {sortField === 'phone' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                    <th className="py-2.5 px-3">Dirección / Ruta</th>
                                    <th className="py-2.5 px-3">Notas / Preferencias</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-[11px]">
                                            Cargando agenda de clientes...
                                        </td>
                                    </tr>
                                ) : paginatedClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-[11px]">
                                            {searchTerm ? 'No se encontraron clientes con esa búsqueda.' : 'No hay clientes registrados en la base de datos.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-3 font-bold text-slate-900 uppercase">
                                                {client.name}
                                            </td>
                                            <td className="py-3 px-3 font-medium text-slate-600 font-mono text-[11px]">
                                                {client.phone || '-'}
                                            </td>
                                            <td className="py-3 px-3 text-slate-700 text-[11px]">
                                                {client.address ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span>{client.address}</span>
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline w-fit"
                                                        >
                                                            <span>📍 Ver ruta en Maps</span>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Sin dirección</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600 font-normal text-[11px]">
                                                {client.notes || <span className="text-slate-400 italic">Sin notas</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-2.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-600 shrink-0">
                        <div>
                            Mostrando del <span className="font-bold text-slate-700">{totalItems > 0 ? startIndex + 1 : 0}</span> al <span className="font-bold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="font-bold text-slate-700">{totalItems}</span> registros
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                            >
                                ◀ Anterior
                            </button>
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-md font-mono font-bold text-emerald-800 text-xs shadow-2xs">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
                            >
                                Siguiente ▶
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}