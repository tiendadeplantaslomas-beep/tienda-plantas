'use client';

import { useState, useTransition } from 'react';
import { Tag, CheckCircle2, AlertCircle, Package } from 'lucide-react';

interface PromotionCardProps {
    promotion: {
        id: number;
        titulo: string;
        descripcion?: string;
        badge?: string;
        imagenUrl?: string;
        stock: number;
    };
    customerId: string; // ID del cliente logueado actual
    onClaimSuccess?: () => void;
}

export default function PromotionCard({ promotion, customerId, onClaimSuccess }: PromotionCardProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleClaim = () => {
        if (!customerId) {
            setMessage({ text: 'Debes iniciar sesión para reclamar esta promoción.', type: 'error' });
            return;
        }

        startTransition(async () => {
            try {
                const res = await fetch('/api/promotions/claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerId,
                        promotionId: promotion.id,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    setMessage({ text: data.message || '¡Promoción reclamada con éxito!', type: 'success' });
                    if (onClaimSuccess) onClaimSuccess();
                } else {
                    setMessage({ text: data.error || 'No se pudo reclamar la promoción.', type: 'error' });
                }
            } catch (err) {
                console.error('Error de red:', err);
                setMessage({ text: 'Error de red al intentar reclamar el beneficio.', type: 'error' });
            }
        });
    };

    const agotada = promotion.stock <= 0;

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
                {promotion.imagenUrl && (
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-100 bg-slate-900">
                        <img src={promotion.imagenUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="flex items-center justify-between gap-2">
                    <span className="bg-amber-100 text-stone-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        {promotion.badge || 'OFERTA'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-slate-400" /> Stock: {promotion.stock} un.
                    </span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 uppercase">{promotion.titulo}</h3>

                {promotion.descripcion && (
                    <p className="text-xs text-slate-600 font-medium">{promotion.descripcion}</p>
                )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
                {message.text && (
                    <div className={`p-2 rounded-xl text-xs font-medium ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleClaim}
                    disabled={isPending || agotada}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                    {isPending ? 'Procesando...' : agotada ? 'Sin Stock Disponible' : 'Reclamar Promoción'}
                </button>
            </div>
        </div>
    );
}