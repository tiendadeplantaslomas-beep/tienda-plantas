'use client';

import { useState, useEffect } from 'react';

interface CompanySettings {
    tradeName: string;
    legalName: string;
    cuit: string;
    vatCondition: string;
    grossIncome: string;
    activityStart: string;
    address: string;
    phone: string;
    email: string;
    invoicePoint: number;
    receiptLegend: string;
    defaultInvoiceC: boolean;
}

export default function ConfiguracionPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CompanySettings>({
        tradeName: 'TIENDA DE PLANTAS',
        legalName: 'DANIEL ALBERTO URRACA',
        cuit: '20-XXXXXXXX-X',
        vatCondition: 'MONOTRIBUTO',
        grossIncome: '20-XXXXXXXX-X',
        activityStart: '01/01/2024',
        address: 'LOMAS DE ZAMORA, BUENOS AIRES',
        phone: '11-XXXX-XXXX',
        email: 'contacto@tiendadeplantas.com',
        invoicePoint: 1,
        receiptLegend: 'DOCUMENTO NO VÁLIDO COMO FACTURA',
        defaultInvoiceC: true
    });

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) setForm(data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (field: keyof CompanySettings, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('¡Configuración guardada exitosamente!');
            } else {
                alert('Error al guardar configuración.');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 font-bold">Cargando configuración...</div>;
    }

    return (
        <div className="p-6 bg-slate-100 min-h-screen font-sans text-slate-800">
            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">Configuración de Comprobantes</h1>
                        <p className="text-xs text-slate-500">Parámetros del negocio, datos fiscales de AFIP y leyendas impresas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* FORMULARIO */}
                    <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                        <h2 className="text-sm font-black uppercase text-emerald-800 border-b pb-2">1. Datos Identificatorios y Fiscales</h2>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="col-span-2">
                                <label className="block font-bold text-slate-600 mb-1">Nombre Fantasía (Membrete) *</label>
                                <input
                                    type="text"
                                    value={form.tradeName}
                                    onChange={e => handleChange('tradeName', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 font-bold uppercase bg-slate-50 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Razón Social / Titular *</label>
                                <input
                                    type="text"
                                    value={form.legalName}
                                    onChange={e => handleChange('legalName', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 uppercase bg-slate-50 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">CUIT *</label>
                                <input
                                    type="text"
                                    value={form.cuit}
                                    onChange={e => handleChange('cuit', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 font-mono bg-slate-50 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Condición IVA *</label>
                                <select
                                    value={form.vatCondition}
                                    onChange={e => handleChange('vatCondition', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 font-bold bg-slate-50 outline-none"
                                >
                                    <option value="MONOTRIBUTO">Monotributo</option>
                                    <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                                    <option value="EXENTO">Exento</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Punto de Venta (AFIP) *</label>
                                <input
                                    type="number"
                                    value={form.invoicePoint}
                                    onChange={e => handleChange('invoicePoint', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 font-mono font-bold bg-slate-50 outline-none"
                                    required
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block font-bold text-slate-600 mb-1">Dirección Comercial *</label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={e => handleChange('address', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 uppercase bg-slate-50 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={e => handleChange('phone', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 font-mono bg-slate-50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">E-mail de Contacto</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 lowercase bg-slate-50 outline-none"
                                />
                            </div>
                        </div>

                        <h2 className="text-sm font-black uppercase text-emerald-800 border-b pb-2 pt-2">2. Parámetros de Impresión y Leyendas</h2>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-600 mb-1">Leyenda para Comprobante No Fiscal *</label>
                                <input
                                    type="text"
                                    value={form.receiptLegend}
                                    onChange={e => handleChange('receiptLegend', e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 uppercase font-mono bg-slate-50 outline-none"
                                    required
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={form.defaultInvoiceC}
                                    onChange={e => handleChange('defaultInvoiceC', e.target.checked)}
                                    className="rounded accent-slate-900 w-4 h-4"
                                />
                                <span className="font-bold text-slate-700">Predeterminar Factura C (Consumidor Final)</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white rounded-lg font-bold text-xs uppercase transition-all shadow-md cursor-pointer mt-4"
                        >
                            {saving ? 'Guardando...' : '💾 Guardar Configuración Fiscal'}
                        </button>
                    </form>

                    {/* PREVISUALIZACIÓN DINÁMICA */}
                    <div className="lg:col-span-5 space-y-3">
                        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Vista Previa Comprobante Impreso</h2>

                        <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-md space-y-4 font-mono text-xs text-slate-800">

                            {/* Cabecera dinámica */}
                            <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                                <div>
                                    <h3 className="font-extrabold text-lg leading-tight uppercase text-slate-900">{form.tradeName || 'TIENDA DE PLANTAS'}</h3>
                                    <p className="text-[10px] text-slate-500">{form.legalName}</p>
                                    <p className="text-[10px] text-slate-500">{form.address}</p>
                                    <p className="text-[10px] text-slate-500">CUIT: {form.cuit} ({form.vatCondition})</p>

                                    <div className="mt-2 inline-block bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-700 tracking-wider uppercase">
                                        {form.receiptLegend}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="w-10 h-10 border-2 border-slate-900 font-black text-xl flex items-center justify-center rounded ml-auto text-slate-900">
                                        {form.defaultInvoiceC ? 'C' : 'X'}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-800 mt-1">
                                        P.V. N° {String(form.invoicePoint).padStart(4, '0')}
                                    </p>
                                </div>
                            </div>

                            <div className="text-[10px] space-y-1 text-slate-500 border-b border-slate-200 pb-2">
                                <div><strong>CLIENTE:</strong> CONSUMIDOR FINAL</div>
                                <div><strong>CONDICIÓN:</strong> IVA RESPONSABLE INSC. / MONOTRIBUTO</div>
                            </div>

                            <div className="py-2 text-center text-slate-400 italic text-[10px]">
                                [ Detalle de Productos ]
                            </div>

                            <div className="border-t border-slate-300 pt-2 flex justify-between items-center font-bold text-sm">
                                <span>TOTAL:</span>
                                <span>$ 10.000,00</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}