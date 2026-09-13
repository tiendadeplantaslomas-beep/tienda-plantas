'use client';
import { useState, useEffect } from 'react';
import { Tag, CheckCircle2 } from 'lucide-react';

export default function CustomerCouponsSection({ customerId }: { customerId: string }) {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (customerId) {
            fetchCustomerCoupons();
        }
    }, [customerId]);

    const fetchCustomerCoupons = async () => {
        try {
            const res = await fetch(`/api/tienda/customer/coupons?customerId=${customerId}`);
            const data = await res.json();
            if (res.ok) {
                setCoupons(data.coupons || data.promotions || []);
            }
        } catch (err) {
            console.error('Error al cargar cupones:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-xs text-stone-400">Cargando tu cuponera...</div>;
    }

    if (coupons.length === 0) {
        return (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Tag className="h-10 w-10 text-stone-300 mx-auto mb-2.5" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">No tenés cupones activos</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                    Canjeá promociones en la tienda para verlos reflejados en tu cuponera personal.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mis Cupones y Promociones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coupons.map((coupon: any, idx: number) => (
                    <div key={coupon.id || idx} className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4 space-y-2 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                                    {coupon.badge || 'Cupón'}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 mt-1.5">{coupon.titulo || coupon.title}</h4>
                            </div>
                            <Tag className="h-5 w-5 text-emerald-600 shrink-0" />
                        </div>
                        <p className="text-[11px] text-stone-600 line-clamp-2">{coupon.descripcion || coupon.description}</p>
                        <div className="border-t border-emerald-100 pt-2 flex items-center justify-between text-[10px] text-stone-500">
                            <span>Código: <strong className="text-slate-700">{coupon.code || String(coupon.id || '').slice(-6).toUpperCase()}</strong></span>
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Disponible
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}