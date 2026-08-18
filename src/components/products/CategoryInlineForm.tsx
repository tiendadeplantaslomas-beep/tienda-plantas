'use client';

import React, { useState } from 'react';
import { Category } from '@/types/product';
import { createCategory } from '@/actions/product-actions';

interface CategoryInlineFormProps {
    initialName?: string;
    onClose: () => void;
    onSuccess: (category: Category) => void;
}

export function CategoryInlineForm({
    initialName = '',
    onClose,
    onSuccess
}: CategoryInlineFormProps) {
    const [name, setName] = useState(initialName);
    const [defaultMargin, setDefaultMargin] = useState<number | ''>(100);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(null);
        const cleanName = name.trim().toUpperCase();

        if (!cleanName) {
            setError('El nombre de la categoría es obligatorio.');
            return;
        }

        try {
            setLoading(true);
            const res = await createCategory({
                name: cleanName,
                defaultMargin: Number(defaultMargin) || 100
            });

            if (res.error) {
                setError(res.error);
            } else if (res.category) {
                onSuccess(res.category as Category);
            }
        } catch {
            setError('Error al crear la categoría.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute top-7 left-0 w-80 z-50 bg-emerald-50 text-emerald-950 p-2.5 rounded-lg border border-emerald-300 space-y-2 shadow-xl animate-in fade-in">
            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 uppercase">
                <span>🏷️ Nueva Categoría Inline</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
                >
                    ✕
                </button>
            </div>
            <div className="flex gap-1.5 items-center">
                <input
                    type="text"
                    autoFocus
                    placeholder="NOMBRE"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    disabled={loading}
                    className="flex-1 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                    type="number"
                    placeholder="MARGEN %"
                    value={defaultMargin}
                    onChange={(e) => setDefaultMargin(e.target.value === '' ? '' : Number(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    disabled={loading}
                    className="w-20 bg-white border border-emerald-300 rounded px-1.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-2.5 py-1 text-xs font-bold rounded text-white shadow-sm shrink-0 cursor-pointer"
                >
                    {loading ? '...' : '✓'}
                </button>
            </div>
            {error && <p className="text-[10px] text-rose-600 font-bold">⚠️ {error}</p>}
        </div>
    );
}