'use client';

import { useState, useEffect } from 'react';
import { getProducts, createSupplier } from '../actions/product-actions';
import { createPurchase, getSuppliersForSelect, getCategoriesForSelect, PurchaseItemInput } from '../actions/purchase-actions';

interface ProductSelectOption {
    id: string;
    code: string;
    name: string;
    cost: number;
    margin: number;
    categoryId: string;
}

interface SupplierOption {
    id: string;
    name: string;
}

interface CategoryOption {
    id: string;
    name: string;
    defaultMargin: number;
}

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [existingProducts, setExistingProducts] = useState<ProductSelectOption[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    // Form Datos Generales del Comprobante
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [docType, setDocType] = useState<'FACTURA' | 'REMITO' | 'PRESUPUESTO'>('FACTURA');
    const [docNumber, setDocNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [otherCostsTotal, setOtherCostsTotal] = useState<number | ''>('');
    const [notes, setNotes] = useState('');

    // Estado Formulario Pop-over Inline Proveedor
    const [showInlineSupplier, setShowInlineSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierPhone, setNewSupplierPhone] = useState('');
    const [isSavingSupplier, setIsSavingSupplier] = useState(false);

    // Grilla de ítems agregados
    const [items, setItems] = useState<PurchaseItemInput[]>([]);

    // Form Renglón Actual
    const [selectedProductId, setSelectedProductId] = useState('');
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemCategoryId, setItemCategoryId] = useState('');
    const [itemQty, setItemQty] = useState<number | ''>('');
    const [itemCost, setItemCost] = useState<number | ''>('');
    const [itemMargin, setItemMargin] = useState<number>(100);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setPageLoading(true);
        try {
            const [sups, cats, prods] = await Promise.all([
                getSuppliersForSelect(),
                getCategoriesForSelect(),
                getProducts()
            ]);
            setSuppliers(sups);
            setCategories(cats);
            setExistingProducts(prods as any);
            if (cats && cats.length > 0) setItemCategoryId(cats[0].id);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setMessage({ type: 'error', text: 'Error al cargar opciones de la base de datos.' });
        } finally {
            setPageLoading(false);
        }
    };

    const handleSelectProduct = (productId: string) => {
        setSelectedProductId(productId);
        const prod = existingProducts.find(p => p.id === productId);
        if (prod) {
            setItemCode(prod.code.toUpperCase());
            setItemName(prod.name.toUpperCase());
            setItemCost(prod.cost);
            setItemMargin(prod.margin);
            setItemCategoryId(prod.categoryId);
        } else {
            setItemCode('');
            setItemName('');
            setItemCost('');
        }
    };

    const handleCreateSupplierInline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;

        setIsSavingSupplier(true);

        const upperName = newSupplierName.trim().toUpperCase();
        const upperPhone = newSupplierPhone.trim().toUpperCase();

        const res = await createSupplier({
            name: upperName,
            phone: upperPhone,
        });

        if (res.success && res.supplier) {
            setSuppliers((prev) => [...prev, { id: res.supplier.id, name: res.supplier.name }]);
            setSelectedSupplierId(res.supplier.id);
            setNewSupplierName('');
            setNewSupplierPhone('');
            setShowInlineSupplier(false);
            setMessage({ type: 'success', text: 'PROVEEDOR CREADO Y SELECCIONADO CORRECTAMENTE.' });
        } else {
            setMessage({ type: 'error', text: res.error || 'No se pudo crear el proveedor.' });
        }

        setIsSavingSupplier(false);
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemCode || !itemName || !itemQty || Number(itemQty) <= 0 || itemCost === '') {
            setMessage({ type: 'error', text: 'COMPLETÁ CÓDIGO, NOMBRE, CANTIDAD Y COSTO UNITARIO.' });
            return;
        }

        const newItem: PurchaseItemInput = {
            productId: selectedProductId || undefined,
            code: itemCode.trim().toUpperCase(),
            name: itemName.trim().toUpperCase(),
            categoryId: itemCategoryId,
            quantity: Number(itemQty),
            unitCost: Number(itemCost),
            margin: Number(itemMargin) || 100,
        };

        setItems([...items, newItem]);

        setSelectedProductId('');
        setItemCode('');
        setItemName('');
        setItemQty('');
        setItemCost('');
        setMessage(null);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const totalUnits = items.reduce((acc, item) => acc + item.quantity, 0);
    const fletePerUnit = totalUnits > 0 && otherCostsTotal ? Math.round(Number(otherCostsTotal) / totalUnits) : 0;
    const totalFinal = subtotal + (Number(otherCostsTotal) || 0);

    const resetWholeForm = () => {
        setItems([]);
        setSelectedSupplierId('');
        setDocNumber('');
        setOtherCostsTotal('');
        setNotes('');
        setSelectedProductId('');
        setItemCode('');
        setItemName('');
        setItemQty('');
        setItemCost('');
    };

    const handleSubmitPurchase = async () => {
        if (items.length === 0) {
            setMessage({ type: 'error', text: 'INGRESÁ AL MENOS UN PRODUCTO A LA COMPRA.' });
            return;
        }

        const selectedSupObj = suppliers.find(s => s.id === selectedSupplierId);
        if (!selectedSupplierId || !selectedSupObj) {
            setMessage({ type: 'error', text: 'SELECCIONÁ UN PROVEEDOR VÁLIDO O CREÁ UNO NUEVO.' });
            return;
        }

        setLoading(true);
        const res = await createPurchase({
            supplierId: selectedSupplierId,
            supplierName: selectedSupObj.name.toUpperCase(),
            docType,
            docNumber: docNumber.trim().toUpperCase(),
            date: purchaseDate,
            otherCostsTotal: Number(otherCostsTotal) || 0,
            notes: notes.trim().toUpperCase(),
            items
        });

        setLoading(false);

        if (res.error) {
            setMessage({ type: 'error', text: res.error });
        } else {
            setMessage({ type: 'success', text: 'COMPROBANTE REGISTRADO CON ÉXITO. STOCK Y COSTOS ACTUALIZADOS.' });
            resetWholeForm();
            loadData();
        }
    };

    if (pageLoading) {
        return (
            <div className="flex justify-center items-center h-screen text-slate-500 font-medium text-xs">
                Cargando módulo de compras...
            </div>
        );
    }

    return (
        <div className="h-screen max-h-screen overflow-hidden bg-slate-50 p-3 md:p-5 flex flex-col space-y-3 max-w-7xl mx-auto text-slate-800">

            {/* ENCABEZADO */}
            <div className="flex-none border-b pb-2 border-slate-200">
                <h1 className="text-xl font-bold text-slate-800 uppercase">Ingreso de Compras / Recepción de Mercadería</h1>
                <p className="text-xs text-slate-500">Carga de facturas, remitos y presupuestos con prorrateo de flete y actualización de costos.</p>
            </div>

            {/* ALERTAS */}
            {message && (
                <div className={`flex-none p-2.5 rounded-lg text-xs font-medium flex justify-between ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold text-slate-400">✕</button>
                </div>
            )}

            {/* DATOS GENERALES COMPROBANTE */}
            <div className="flex-none bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">

                    {/* Proveedor con Inline Form */}
                    <div className="sm:col-span-1 relative">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                            Proveedor <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-1">
                            <select
                                value={selectedSupplierId}
                                onChange={(e) => {
                                    if (e.target.value === 'NEW') {
                                        setShowInlineSupplier(true);
                                    } else {
                                        setSelectedSupplierId(e.target.value);
                                    }
                                }}
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white font-medium uppercase"
                            >
                                <option value="">-- SELECCIONAR PROVEEDOR --</option>
                                <option value="NEW" className="font-bold text-blue-600">+ NUEVO PROVEEDOR...</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowInlineSupplier(!showInlineSupplier)}
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-lg text-xs"
                                title="Agregar nuevo proveedor"
                            >
                                +
                            </button>
                        </div>

                        {/* POPOVER NUEVO PROVEEDOR */}
                        {showInlineSupplier && (
                            <div className="absolute top-12 left-0 z-50 bg-[#1e293b] p-3 rounded-xl shadow-2xl border border-slate-700 w-72 text-white">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-200 mb-2">NUEVO PROVEEDOR</h3>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="NOMBRE"
                                        value={newSupplierName}
                                        onChange={(e) => setNewSupplierName(e.target.value.toUpperCase())}
                                        className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-xs text-white placeholder-slate-400 uppercase"
                                    />
                                    <input
                                        type="text"
                                        placeholder="TELÉFONO"
                                        value={newSupplierPhone}
                                        onChange={(e) => setNewSupplierPhone(e.target.value.toUpperCase())}
                                        className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-xs text-white placeholder-slate-400 uppercase"
                                    />
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowInlineSupplier(false)}
                                            className="bg-slate-700 hover:bg-slate-600 text-[10px] px-2.5 py-1.5 rounded text-slate-200 font-medium"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateSupplierInline}
                                            disabled={isSavingSupplier || !newSupplierName.trim()}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-[10px] px-3 py-1.5 rounded text-white font-bold disabled:opacity-50 uppercase"
                                        >
                                            {isSavingSupplier ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Comprobante */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Tipo Comprobante</label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold bg-white"
                        >
                            <option value="FACTURA">📄 FACTURA</option>
                            <option value="REMITO">📦 REMITO</option>
                            <option value="PRESUPUESTO">📝 PRESUPUESTO</option>
                        </select>
                    </div>

                    {/* N° Comprobante */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">N° Comprobante / Remito</label>
                        <input
                            type="text"
                            placeholder="EJ. 0001-00004582"
                            value={docNumber}
                            onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs uppercase"
                        />
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Fecha de Emisión/Carga</label>
                        <input
                            type="date"
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                        />
                    </div>

                </div>
            </div>

            {/* FORMULARIO DE RENGLÓN */}
            <form onSubmit={handleAddItem} className="flex-none bg-slate-100 p-2.5 rounded-xl border border-slate-300 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Añadir Producto al Comprobante</span>
                    {selectedProductId && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">PRODUCTO CARGADO DESDE CATÁLOGO</span>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">

                    {/* Búsqueda Catálogo */}
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Buscar Existente</label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => handleSelectProduct(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white uppercase"
                        >
                            <option value="">-- BUSCAR EN CATÁLOGO O CREAR NUEVO ABAJO --</option>
                            {existingProducts.map(p => (
                                <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Código */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Código <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="CÓD."
                            value={itemCode}
                            onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold uppercase"
                        />
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Descripción <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="NOMBRE..."
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value.toUpperCase())}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs uppercase"
                        />
                    </div>

                    {/* Cantidad */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Cantidad <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            min="1"
                            placeholder="0"
                            value={itemQty}
                            onChange={(e) => setItemQty(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold"
                        />
                    </div>

                    {/* Costo Base */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Costo Unit. ($) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="$ 0"
                            value={itemCost}
                            onChange={(e) => setItemCost(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-emerald-800"
                        />
                    </div>

                </div>

                <div className="flex justify-end pt-1">
                    <button type="submit" className="px-4 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 uppercase">
                        ➕ Agregar Ítem
                    </button>
                </div>
            </form>

            {/* GRILLA DE PRODUCTOS */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-[10px] uppercase text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2 text-center">Cant.</th>
                                <th className="px-3 py-2 text-right">Costo Unit. Base</th>
                                <th className="px-3 py-2 text-right">Flete/Unid. ($)</th>
                                <th className="px-3 py-2 text-right">Costo Final Unid.</th>
                                <th className="px-3 py-2 text-right">Subtotal Base</th>
                                <th className="px-3 py-2 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-6 text-slate-400 italic">No hay productos agregados al comprobante.</td>
                                </tr>
                            ) : (
                                items.map((item, idx) => {
                                    const finalUnit = item.unitCost + fletePerUnit;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-3 py-1.5 font-mono font-bold text-slate-700">{item.code}</td>
                                            <td className="px-3 py-1.5 font-bold text-slate-800 uppercase">{item.name}</td>
                                            <td className="px-3 py-1.5 text-center font-bold">{item.quantity} u.</td>
                                            <td className="px-3 py-1.5 text-right font-mono">$ {item.unitCost.toLocaleString()}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-amber-700">+ $ {fletePerUnit.toLocaleString()}</td>
                                            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-800">$ {finalUnit.toLocaleString()}</td>
                                            <td className="px-3 py-1.5 text-right font-mono font-bold">$ {(item.quantity * item.unitCost).toLocaleString()}</td>
                                            <td className="px-3 py-1.5 text-center">
                                                <button onClick={() => handleRemoveItem(idx)} className="text-rose-600 hover:text-rose-800 font-bold">
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PIE Y TOTALES */}
            <div className="flex-none bg-slate-900 text-white p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400">Flete / Gastos Varios ($)</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="$ 0"
                            value={otherCostsTotal}
                            onChange={(e) => setOtherCostsTotal(e.target.value === '' ? '' : Number(e.target.value))}
                            className="border border-slate-700 bg-slate-800 text-white rounded-lg px-2 py-1 text-xs font-bold w-36 text-amber-400"
                        />
                    </div>
                    {totalUnits > 0 && otherCostsTotal !== '' && (
                        <div className="text-xs text-slate-300">
                            Prorrateo: <span className="font-bold text-amber-400">+ $ {fletePerUnit.toLocaleString()}</span> por unidad ({totalUnits} u. en total)
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                        <div className="text-[10px] uppercase text-slate-400">Total Comprobante</div>
                        <div className="text-lg font-bold text-emerald-400">$ {totalFinal.toLocaleString()}</div>
                    </div>

                    <button
                        onClick={handleSubmitPurchase}
                        disabled={loading || items.length === 0}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-md transition-all uppercase"
                    >
                        {loading ? 'Guardando...' : '💾 Registrar Comprobante'}
                    </button>
                </div>
            </div>

        </div>
    );
}