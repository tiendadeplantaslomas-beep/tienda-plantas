"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Plus, Edit2, Trash2, Leaf, DollarSign, Package, AlertTriangle,
    X, FileText, Tag, Download, Upload, ShoppingCart, CheckCircle,
    Trash, Search, User, UserPlus, Mail, MapPin, Phone, Truck, History
} from 'lucide-react';

const INITIAL_PRODUCTS = [
    {
        id: 1,
        codigo: 'ART-001',
        nombre: 'FICUS LYRATA M18',
        descripcion: 'Planta de interior con hojas grandes en forma de lira.',
        valor_unitario: 11983, // Precio de venta neto
        impuesto: 21,
        categoria: 'INTERIOR',
        cantidad_actual: 8,
        cantidad_ideal: 15,
        cantidad_advertencia: 4,
        proveedor: 'NURSERY MAYORISTA SUR',
        nota: 'Revisar riego antes de entregar.',
        ultimo_costo_neto: 7489
    },
    {
        id: 2,
        codigo: 'ART-002',
        nombre: 'ALOCASIA POLLY',
        descripcion: 'Oreja de elefante enana.',
        valor_unitario: 8099,
        impuesto: 21,
        categoria: 'INTERIOR',
        cantidad_actual: 12,
        cantidad_ideal: 10,
        cantidad_advertencia: 3,
        proveedor: 'CULTIVOS VERDES S.A.',
        nota: 'Mantener en ambiente húmedo.',
        ultimo_costo_neto: 5061
    }
];

const INITIAL_PROVEEDORES = [
    'NURSERY MAYORISTA SUR',
    'CULTIVOS VERDES S.A.',
    'PARTICULAR'
];

interface Cliente {
    id: string;
    nombre: string;
    cuit_dni: string;
    email: string;
    celular?: string;
    direccion?: string;
    localidad?: string;
}

const INITIAL_CLIENTES: Cliente[] = [
    { id: 'cli-1', nombre: 'CONSUMIDOR FINAL', cuit_dni: '00-00000000-0', email: 'vivero@ejemplo.com' },
    { id: 'cli-2', nombre: 'CARMEN URRACA', cuit_dni: '27-14234567-8', email: 'carmen.urraca@ejemplo.com', celular: '1122334455', direccion: 'Av. Hipólito Yrigoyen 5500', localidad: 'Lomas de Zamora' }
];

interface CarritoItem {
    productoId: number;
    codigo: string;
    nombre: string;
    cantidad: number;
    valor_unitario: number;
    impuesto: number;
    stockDisponible: number;
}

interface CompraHistorial {
    id: string;
    fecha: string;
    proveedor: string;
    productoNombre: string;
    cantidadComprada: number;
    costoUnitarioNeto: number;
    nuevoPrecioVentaNeto: number;
    nuevoPrecioVentaFinal: number;
    ivaPorcentaje: number;
    totalCompra: number;
}

export default function AdminDashboard() {
    const [productos, setProductos] = useState(INITIAL_PRODUCTS);
    const [proveedores, setProveedores] = useState<string[]>(INITIAL_PROVEEDORES);
    const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);
    const [activeTab, setActiveTab] = useState<'general' | 'inventario' | 'compras' | 'pos'>('compras');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado dinámico para los márgenes de ganancia por categoría
    const [categoriasMargenes, setCategoriasMargenes] = useState<Record<string, number>>({
        'INTERIOR': 1.60,
        'EXTERIOR': 1.50,
        'INSUMOS': 1.40
    });

    // Sub-estado para la creación rápida de una nueva categoría inline
    const [mostrarNuevaCatInput, setMostrarNuevaCatInput] = useState(false);
    const [inputNuevaCatNombre, setInputNuevaCatNombre] = useState('');
    const [inputNuevaCatMargen, setInputNuevaCatMargen] = useState('50');

    // Estados del Carrito de Ventas
    const [carrito, setCarrito] = useState<CarritoItem[]>([]);
    const [cantidadVenta, setCantidadVenta] = useState<number | ''>(1);

    // Buscadores y Sugerencias
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState<typeof INITIAL_PRODUCTS[0] | null>(null);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const sugerenciasRef = useRef<HTMLDivElement>(null);

    // Formulario Inline Express para Nuevo Producto en POS (Punto de Venta)
    const [mostrarMiniFormProducto, setMostrarMiniFormProducto] = useState(false);
    const [nuevoProdNombrePOS, setNuevoProdNombrePOS] = useState('');
    const [nuevoProdPrecioVentaPOS, setNuevoProdPrecioVentaPOS] = useState('');
    const [nuevoProdCategoriaPOS, setNuevoProdCategoriaPOS] = useState('INTERIOR');

    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(INITIAL_CLIENTES[0]);
    const [mostrarSugerenciasClientes, setMostrarSugerenciasClientes] = useState(false);
    const [mostrarMiniFormCliente, setMostrarMiniFormCliente] = useState(false);
    const sugerenciasClientesRef = useRef<HTMLDivElement>(null);

    // Formulario Cliente Express
    const [nuevoCliNombre, setNuevoCliNombre] = useState('');
    const [nuevoCliCuitDni, setNuevoCliCuitDni] = useState('');
    const [nuevoCliEmail, setNuevoCliEmail] = useState('');
    const [nuevoCliCelular, setNuevoCliCelular] = useState('');
    const [nuevoCliDireccion, setNuevoCliDireccion] = useState('');
    const [nuevoCliLocalidad, setNuevoCliLocalidad] = useState('');

    // Estados de Compras y Abastecimiento
    const [historialCompras, setHistorialCompras] = useState<CompraHistorial[]>([]);
    const [compraProductoId, setCompraProductoId] = useState<string>('');
    const [compraCantidad, setCompraCantidad] = useState<number | ''>(1);

    // Estos estados ahora son dinámicos: actúan como inputs si es NUEVO, o reflejan los valores existentes si se selecciona un producto del catálogo
    const [compraCostoUnitario, setCompraCostoUnitario] = useState<string>('');
    const [compraImpuesto, setCompraImpuesto] = useState<string>('21');

    // Sub-formulario dinámico para cuando el artículo es NUEVO en la compra
    const [nuevoProdNombre, setNuevoProdNombre] = useState('');
    const [nuevoProdCategoria, setNuevoProdCategoria] = useState('INTERIOR');
    const [nuevoProdProveedor, setNuevoProdProveedor] = useState('');

    // Sub-estados para el nuevo formulario inline de Proveedor Express
    const [mostrarNuevoProveedorInput, setMostrarNuevoProveedorInput] = useState(false);
    const [inputProvNombre, setInputProvNombre] = useState('');
    const [inputProvDireccion, setInputProvDireccion] = useState('');
    const [inputProvTelefono, setInputProvTelefono] = useState('');

    // Efecto para auto-completar los datos si el producto ya existe en el catálogo
    useEffect(() => {
        if (compraProductoId && compraProductoId !== 'NEW') {
            const encontrado = productos.find(p => p.id === Number(compraProductoId));
            if (encontrado) {
                setCompraCostoUnitario(encontrado.ultimo_costo_neto ? encontrado.ultimo_costo_neto.toString() : '');
                setCompraImpuesto(encontrado.impuesto.toString());
            }
        } else {
            // Limpieza si vuelve a seleccionar vacío o "Nuevo"
            setCompraCostoUnitario('');
            setCompraImpuesto('21');
        }
    }, [compraProductoId, productos]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target as Node)) {
                setMostrarSugerencias(false);
            }
            if (sugerenciasClientesRef.current && !sugerenciasClientesRef.current.contains(event.target as Node)) {
                setMostrarSugerenciasClientes(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const obtenerMaxNumeroCodigo = (lista: typeof productos) => {
        if (lista.length === 0) return 0;
        const numeros = lista.map(p => {
            const match = p.codigo.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
        });
        return Math.max(...numeros, 0);
    };

    const generarProximoCodigo = (listaProductos: typeof productos) => {
        const maxNumero = obtenerMaxNumeroCodigo(listaProductos);
        return `ART-${(maxNumero + 1).toString().padStart(3, '0')}`;
    };

    // Métricas
    const totalProductos = productos.length;
    const valorInventarioNeto = productos.reduce((acc, p) => acc + (p.valor_unitario * p.cantidad_actual), 0);
    const totalImpuestosEstimados = productos.reduce((acc, p) => acc + ((p.valor_unitario * p.impuesto / 100) * p.cantidad_actual), 0);
    const productosEnAdvertencia = productos.filter(p => p.cantidad_actual <= p.cantidad_advertencia).length;

    const productosFiltrados = productos.filter(p => {
        const termino = busquedaProducto.toLowerCase();
        return p.nombre.toLowerCase().includes(termino) || p.codigo.toLowerCase().includes(termino);
    });

    const clientesFiltrados = useMemo(() => {
        const termino = busquedaCliente.toLowerCase();
        return clientes.filter(c =>
            c.nombre.toLowerCase().includes(termino) ||
            c.cuit_dni.includes(termino)
        );
    }, [clientes, busquedaCliente]);

    // Alta Express de Artículo desde el panel de Ventas (POS)
    const handleCrearProductoExpressPOS = (e: React.MouseEvent) => {
        e.preventDefault();
        const nombre = nuevoProdNombrePOS.trim().toUpperCase();
        const precioNeto = Number(nuevoProdPrecioVentaPOS);
        const unidadesAVender = Number(cantidadVenta) || 1;

        if (!nombre || isNaN(precioNeto) || precioNeto <= 0) {
            alert('Por favor, complete el nombre y un precio de venta neto válido.');
            return;
        }

        const nuevoCodigo = generarProximoCodigo(productos);
        const margenCategoria = categoriasMargenes[nuevoProdCategoriaPOS] || 1.5;

        const nuevoArticulo = {
            id: Date.now(),
            codigo: nuevoCodigo,
            nombre: nombre,
            descripcion: 'ALTA RÁPIDA INLINE DESDE PUNTO DE VENTA.',
            valor_unitario: precioNeto,
            impuesto: 21, // Alícuota estándar por defecto
            categoria: nuevoProdCategoriaPOS,
            cantidad_actual: unidadesAVender, // Inicializa con el stock que se va a vender
            cantidad_ideal: 10,
            cantidad_advertencia: 2,
            proveedor: 'PARTICULAR',
            nota: 'Ingresado de urgencia en caja.',
            ultimo_costo_neto: Math.round(precioNeto / margenCategoria)
        };

        // 1. Agregar al catálogo general
        setProductos([nuevoArticulo, ...productos]);

        // 2. Incorporar inmediatamente al ticket activo
        setCarrito([...carrito, {
            productoId: nuevoArticulo.id,
            codigo: nuevoArticulo.codigo,
            nombre: nuevoArticulo.nombre,
            cantidad: unidadesAVender,
            valor_unitario: nuevoArticulo.valor_unitario,
            impuesto: nuevoArticulo.impuesto,
            stockDisponible: unidadesAVender
        }]);

        // Limpieza y reseteo
        setMostrarMiniFormProducto(false);
        setBusquedaProducto('');
        setProductoSeleccionado(null);
        setCantidadVenta(1);
        setNuevoProdNombrePOS('');
        setNuevoProdPrecioVentaPOS('');
    };

    // Carrito y Ventas
    const handleAgregarAlCarrito = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productoSeleccionado) return;
        const unidadesAVender = Number(cantidadVenta) || 1;

        if (productoSeleccionado.cantidad_actual === 0) {
            alert('Este artículo no cuenta con stock disponible.');
            return;
        }

        const itemExistente = carrito.find(item => item.productoId === productoSeleccionado.id);
        const cantidadTotalSujeta = itemExistente ? itemExistente.cantidad + unidadesAVender : unidadesAVender;

        if (cantidadTotalSujeta > productoSeleccionado.cantidad_actual) {
            alert(`Acción rechazada. El stock real en góndola es de ${productoSeleccionado.cantidad_actual} unidades.`);
            return;
        }

        if (itemExistente) {
            setCarrito(carrito.map(item => item.productoId === productoSeleccionado.id ? { ...item, cantidad: cantidadTotalSujeta } : item));
        } else {
            setCarrito([...carrito, {
                productoId: productoSeleccionado.id,
                codigo: productoSeleccionado.codigo,
                nombre: productoSeleccionado.nombre,
                cantidad: unidadesAVender,
                valor_unitario: productoSeleccionado.valor_unitario,
                impuesto: productoSeleccionado.impuesto,
                stockDisponible: productoSeleccionado.cantidad_actual
            }]);
        }
        setProductoSeleccionado(null); setBusquedaProducto(''); setCantidadVenta(1);
    };

    const handleEliminarDelCarrito = (productoId: number) => {
        setCarrito(carrito.filter(item => item.productoId !== productoId));
    };

    const carritoNeto = carrito.reduce((acc, item) => acc + (item.valor_unitario * item.cantidad), 0);
    const carritoIVA = carrito.reduce((acc, item) => acc + ((item.valor_unitario * item.impuesto / 100) * item.cantidad), 0);
    const carritoTotal = carritoNeto + carritoIVA;

    const handleProcesarVenta = () => {
        if (carrito.length === 0) return;
        const productosActualizados = productos.map(p => {
            const itemVendido = carrito.find(item => item.productoId === p.id);
            return itemVendido ? { ...p, cantidad_actual: Math.max(0, p.cantidad_actual - itemVendido.cantidad) } : p;
        });

        setProductos(productosActualizados);
        setCarrito([]);
        setClienteSeleccionado(INITIAL_CLIENTES[0]);
        setBusquedaCliente('');
        alert(`¡Venta procesada exitosamente por un total de $${carritoTotal.toLocaleString('es-AR')}!`);
    };

    // Agregar Nueva Categoría dinámicamente
    const handleCrearCategoria = (e: React.MouseEvent) => {
        e.preventDefault();
        const nombreCat = inputNuevaCatNombre.trim().toUpperCase();
        const porcentaje = Number(inputNuevaCatMargen);

        if (!nombreCat) {
            alert('Por favor, ingresá un nombre válido para la categoría.');
            return;
        }
        if (isNaN(porcentaje) || porcentaje < 0) {
            alert('Por favor, ingresá un margen válido.');
            return;
        }

        const factorCalculado = 1 + (porcentaje / 100);

        setCategoriasMargenes(prev => ({
            ...prev,
            [nombreCat]: factorCalculado
        }));

        setNuevoProdCategoria(nombreCat);
        setMostrarNuevaCatInput(false);
        setInputNuevaCatNombre('');
        setInputNuevaCatMargen('50');
    };

    // Agregar Nuevo Proveedor dinámicamente (Formulario Inline Express)
    const handleCrearProveedorExpress = (e: React.MouseEvent) => {
        e.preventDefault();
        const nombreProv = inputProvNombre.trim().toUpperCase();

        if (!nombreProv) {
            alert('El nombre del proveedor es un campo obligatorio.');
            return;
        }

        // Si ya existe no lo duplicamos
        if (!proveedores.includes(nombreProv)) {
            setProveedores([...proveedores, nombreProv]);
        }

        setNuevoProdProveedor(nombreProv);
        setMostrarNuevoProveedorInput(false);

        // Limpieza de campos del mini-form
        setInputProvNombre('');
        setInputProvDireccion('');
        setInputProvTelefono('');
    };

    // REGISTRO DE ABASTECIMIENTO INTEGRADO
    const handleRegistrarCompra = (e: React.FormEvent) => {
        e.preventDefault();
        if (!compraProductoId || !compraCantidad || !compraCostoUnitario) return;

        const cantidadIngresada = Number(compraCantidad);
        const costoNetoIngresado = Number(compraCostoUnitario);
        const ivaSeleccionado = Number(compraImpuesto);

        let proveedorFinal = '';
        let productoNombreFinal = '';
        let categoriaProducto = 'INTERIOR';
        let listaProductosActualizada = [...productos];

        // Resolver Proveedor e Info General en MAYÚSCULAS
        if (compraProductoId === 'NEW') {
            proveedorFinal = nuevoProdProveedor.toUpperCase() || 'PARTICULAR';
            productoNombreFinal = nuevoProdNombre.trim().toUpperCase() || 'ARTÍCULO NUEVO';
            categoriaProducto = nuevoProdCategoria.toUpperCase();
        } else {
            const prodExistente = productos.find(p => p.id === Number(compraProductoId));
            if (!prodExistente) return;
            productoNombreFinal = prodExistente.nombre;
            proveedorFinal = prodExistente.proveedor;
            categoriaProducto = prodExistente.categoria;
        }

        // Cálculo bajo reglas de margen de ganancia y costo real
        const factorMargen = categoriasMargenes[categoriaProducto] || 1.50;
        const nuevoPrecioVentaNeto = Math.round(costoNetoIngresado * factorMargen);
        const nuevoPrecioVentaFinal = Math.round(nuevoPrecioVentaNeto * (1 + ivaSeleccionado / 100));
        const totalCompradoConIva = (costoNetoIngresado * (1 + ivaSeleccionado / 100)) * cantidadIngresada;

        if (compraProductoId === 'NEW') {
            const nuevoCodigo = generarProximoCodigo(productos);
            const nuevoProducto = {
                id: Date.now(),
                codigo: nuevoCodigo,
                nombre: productoNombreFinal,
                descripcion: 'INGRESADO AUTOMÁTICAMENTE DESDE COMPRAS.',
                valor_unitario: nuevoPrecioVentaNeto,
                impuesto: ivaSeleccionado,
                categoria: categoriaProducto,
                cantidad_actual: cantidadIngresada,
                cantidad_ideal: 15,
                cantidad_advertencia: 4,
                proveedor: proveedorFinal,
                nota: '',
                ultimo_costo_neto: costoNetoIngresado
            };
            listaProductosActualizada = [nuevoProducto, ...productos];
        } else {
            listaProductosActualizada = productos.map(p => {
                if (p.id === Number(compraProductoId)) {
                    return {
                        ...p,
                        cantidad_actual: p.cantidad_actual + cantidadIngresada,
                        valor_unitario: nuevoPrecioVentaNeto,
                        impuesto: ivaSeleccionado,
                        ultimo_costo_neto: costoNetoIngresado
                    };
                }
                return p;
            });
        }

        setProductos(listaProductosActualizada);

        // Registrar en Auditoría Remito Procesado
        const nuevoRegistro: CompraHistorial = {
            id: `CMP-${Date.now().toString().slice(-5)}`,
            fecha: new Date().toLocaleString('es-AR'),
            proveedor: proveedorFinal,
            productoNombre: productoNombreFinal,
            cantidadComprada: cantidadIngresada,
            costoUnitarioNeto: costoNetoIngresado,
            nuevoPrecioVentaNeto: nuevoPrecioVentaNeto,
            nuevoPrecioVentaFinal: nuevoPrecioVentaFinal,
            ivaPorcentaje: ivaSeleccionado,
            totalCompra: totalCompradoConIva
        };

        setHistorialCompras([nuevoRegistro, ...historialCompras]);

        // Limpieza de estados
        setCompraProductoId(''); setCompraCantidad(1); setCompraCostoUnitario('');
        setNuevoProdNombre(''); setNuevoProdProveedor('');

        alert(`¡Abastecimiento Completo!\n"${productoNombreFinal}" procesado correctamente en MAYÚSCULAS.\nPrecio de venta sugerido neto: $${nuevoPrecioVentaNeto.toLocaleString('es-AR')} (Final público con IVA: $${nuevoPrecioVentaFinal.toLocaleString('es-AR')}).`);
    };

    // CSV e Importaciones
    const handleExportarCSV = () => {
        const headers = ['Codigo', 'Nombre', 'Descripcion', 'Categoria', 'Valor Unitario', 'Impuesto', 'Cantidad Actual', 'Cantidad Ideal', 'Cantidad Advertencia', 'Proveedor', 'Nota'];
        const rows = productos.map(p => [p.codigo, `"${p.nombre}"`, `"${p.descripcion}"`, p.categoria, p.valor_unitario, p.impuesto, p.cantidad_actual, p.cantidad_ideal, p.cantidad_advertencia, `"${p.proveedor}"`, `"${p.nota}"`]);
        const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url); link.setAttribute('download', `inventario_${Date.now()}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleImportarCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n').map(line => line.trim()).filter(l => l.length > 0).slice(1);
            let numeroCorrelativoActual = obtenerMaxNumeroCodigo(productos);

            const importados = lines.map((line, idx) => {
                const col = line.split(';');
                numeroCorrelativoActual++;
                return {
                    id: Date.now() + idx,
                    codigo: `ART-${numeroCorrelativoActual.toString().padStart(3, '0')}`,
                    nombre: (col[1]?.replace(/"/g, '') || 'IMPORTADO').toUpperCase(),
                    descripcion: col[2]?.replace(/"/g, '') || '',
                    categoria: (col[3] || 'INTERIOR').toUpperCase(),
                    valor_unitario: Number(col[4]) || 0,
                    impuesto: Number(col[5]) || 21,
                    cantidad_actual: Number(col[6]) || 0,
                    cantidad_ideal: Number(col[7]) || 10,
                    cantidad_advertencia: Number(col[8]) || 3,
                    proveedor: (col[9]?.replace(/"/g, '') || 'PARTICULAR').toUpperCase(),
                    nota: col[10] || '',
                    ultimo_costo_neto: Math.round((Number(col[4]) || 0) / 1.5)
                };
            });
            setProductos([...importados, ...productos]);
        };
        reader.readAsText(file, 'UTF-8');
    };

    return (
        <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Cabecera Principal */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-200 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-700 rounded-xl text-white shadow-sm">
                            <Leaf className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Control de Gestión de Stock</h1>
                            <p className="text-sm text-stone-500">Módulo de facturación, compras con margen automatizado y POS</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportarCSV} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 transition cursor-pointer">
                            <Upload className="h-4 w-4 text-stone-500" /> Importar Lista
                        </button>
                        <button onClick={handleExportarCSV} className="flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 transition cursor-pointer">
                            <Download className="h-4 w-4 text-stone-500" /> Exportar CSV
                        </button>
                    </div>
                </div>

                {/* Reportes Financieros */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-stone-100 rounded-lg text-stone-600"><Package className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-medium text-stone-500 uppercase">Items Registrados</p>
                            <p className="text-xl font-bold text-stone-900">{totalProductos}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700"><DollarSign className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-medium text-stone-500 uppercase">Valor Neto Stock (Venta)</p>
                            <p className="text-xl font-bold text-stone-900">${valorInventarioNeto.toLocaleString('es-AR')}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-700"><FileText className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-medium text-stone-500 uppercase">Impuestos Implícitos</p>
                            <p className="text-xl font-bold text-stone-900">${totalImpuestosEstimados.toLocaleString('es-AR')}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${productosEnAdvertencia > 0 ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600'}`}><AlertTriangle className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs font-medium text-stone-500 uppercase">Alertas Reposición</p>
                            <p className={`text-xl font-bold ${productosEnAdvertencia > 0 ? 'text-amber-600' : 'text-stone-900'}`}>{productosEnAdvertencia} items</p>
                        </div>
                    </div>
                </div>

                {/* Selector de Pestañas */}
                <div className="flex border-b border-stone-200 gap-6">
                    <button onClick={() => setActiveTab('compras')} className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition flex items-center gap-2 ${activeTab === 'compras' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>
                        <Truck className="h-4 w-4" /> Compras y Abastecimiento
                    </button>
                    <button onClick={() => setActiveTab('pos')} className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition flex items-center gap-2 ${activeTab === 'pos' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>
                        <ShoppingCart className="h-4 w-4" /> Simular Venta (POS)
                    </button>
                    <button onClick={() => setActiveTab('general')} className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition ${activeTab === 'general' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>
                        Precios e Impuestos (Catálogo)
                    </button>
                </div>

                {/* VISTA 1: COMPRAS Y ABASTECIMIENTO AUTOMÁTICO */}
                {activeTab === 'compras' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Formulario Izquierda */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-stone-200 shadow-sm h-fit space-y-4">
                            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                <Truck className="h-5 w-5 text-emerald-700" /> Registrar Remito / Stock
                            </h3>
                            <form onSubmit={handleRegistrarCompra} className="space-y-4">
                                <div className="grid grid-cols-3 gap-2 items-end">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-stone-600 mb-1">Artículo del Catálogo</label>
                                        <select
                                            required
                                            value={compraProductoId}
                                            onChange={(e) => setCompraProductoId(e.target.value)}
                                            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none transition text-stone-800 font-medium"
                                        >
                                            <option value="">-- Elija una opción --</option>
                                            <option value="NEW" className="text-emerald-700 font-bold">+ [PRODUCTO NUEVO NO EXISTENTE]</option>
                                            {productos.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.codigo} - {p.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-stone-600 mb-1">Cant.</label>
                                        <input
                                            type="number" required min="1" placeholder="15"
                                            value={compraCantidad}
                                            onChange={(e) => setCompraCantidad(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
                                            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-2 py-2 text-sm focus:border-emerald-600 focus:bg-white transition font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                {/* FICHA EXPRÉS DE NUEVO ARTÍCULO */}
                                {compraProductoId === 'NEW' ? (
                                    <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60 space-y-3 animate-fadeIn">
                                        <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Ficha Exprés de Nuevo Artículo</p>

                                        {/* Nombre del Producto */}
                                        <div>
                                            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Nombre Comercial del Producto *</label>
                                            <input
                                                type="text" required placeholder="Ej: MONSTERA DELICIOSA M14"
                                                value={nuevoProdNombre} onChange={(e) => setNuevoProdNombre(e.target.value)}
                                                className="w-full bg-white border border-stone-300 rounded px-2.5 py-1 text-xs focus:outline-emerald-700"
                                            />
                                        </div>

                                        {/* Fila: Categoría y Proveedor */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Columna Categoría */}
                                            <div>
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <label className="block text-[10px] font-semibold text-stone-600">Categoría *</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMostrarNuevaCatInput(!mostrarNuevaCatInput)}
                                                        className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        {mostrarNuevaCatInput ? 'Volver' : '+ Nueva'}
                                                    </button>
                                                </div>

                                                {!mostrarNuevaCatInput ? (
                                                    <select
                                                        value={nuevoProdZGia} onChange={(e) => setNuevoProdCategoria(e.target.value)}
                                                        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs select-uppercase"
                                                    >
                                                        {Object.keys(categoriasMargenes).map(catKey => (
                                                            <option key={catKey} value={catKey}>
                                                                {catKey} ({Math.round((categoriasMargenes[catKey] - 1) * 100)}%)
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="p-2 bg-white rounded border border-emerald-300 space-y-2 text-left animate-fadeIn">
                                                        <input
                                                            type="text"
                                                            placeholder="Nombre Cat."
                                                            value={inputNuevaCatNombre}
                                                            onChange={(e) => setInputNuevaCatNombre(e.target.value)}
                                                            className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-emerald-600"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                placeholder="Ganancia %"
                                                                value={inputNuevaCatMargen}
                                                                onChange={(e) => setInputNuevaCatMargen(e.target.value)}
                                                                className="w-16 bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-[11px] font-mono"
                                                            />
                                                            <span className="text-[10px] text-stone-500">%</span>
                                                            <button
                                                                type="button"
                                                                onClick={handleCrearCategoria}
                                                                className="ml-auto bg-emerald-700 text-white rounded px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-800"
                                                            >
                                                                OK
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Columna Proveedor */}
                                            <div>
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <label className="block text-[10px] font-semibold text-stone-600">Proveedor *</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMostrarNuevoProveedorInput(!mostrarNuevoProveedorInput)}
                                                        className="text-[10px] text-emerald-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        {mostrarNuevoProveedorInput ? 'Volver' : '+ Nuevo'}
                                                    </button>
                                                </div>

                                                {!mostrarNuevoProveedorInput ? (
                                                    <select
                                                        value={nuevoProdProveedor}
                                                        onChange={(e) => setNuevoProdProveedor(e.target.value)}
                                                        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs select-uppercase"
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        {proveedores.map((prov, i) => (
                                                            <option key={i} value={prov}>{prov}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    /* NUEVO SUB-FORMULARIO INLINE DE PROVEEDOR EXPRESS */
                                                    <div className="p-2 bg-white rounded border border-emerald-300 space-y-1.5 text-left animate-fadeIn">
                                                        <input
                                                            type="text"
                                                            placeholder="Razón Social / Nombre *"
                                                            value={inputProvNombre}
                                                            onChange={(e) => setInputProvNombre(e.target.value)}
                                                            className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-emerald-600 uppercase font-medium"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Dirección (Opcional)"
                                                            value={inputProvDireccion}
                                                            onChange={(e) => setInputProvDireccion(e.target.value)}
                                                            className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Teléfono (Opcional)"
                                                                value={inputProvTelefono}
                                                                onChange={(e) => setInputProvTelefono(e.target.value)}
                                                                className="w-full bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleCrearProveedorExpress}
                                                                className="bg-emerald-700 text-white rounded px-2 py-0.5 text-[10px] font-bold hover:bg-emerald-800"
                                                            >
                                                                OK
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Costo Neto e Impuesto agrupados dentro de la Ficha si el Producto es Nuevo */}
                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Costo Neto Inicial *</label>
                                                <input
                                                    type="number" required min="0" step="0.01" placeholder="Base $"
                                                    value={compraCostoUnitario}
                                                    onChange={(e) => setCompraCostoUnitario(e.target.value)}
                                                    className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs font-mono font-bold text-emerald-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Impuesto Alícuota *</label>
                                                <select
                                                    value={compraImpuesto}
                                                    onChange={(e) => setCompraImpuesto(e.target.value)}
                                                    className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs font-mono font-bold text-stone-800"
                                                >
                                                    <option value="21">21%</option>
                                                    <option value="10.5">10.5%</option>
                                                    <option value="0">0%</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : compraProductoId ? (
                                    /* MUESTRA DE VALORES POR DEFECTO AUTOMATIZADOS */
                                    <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 space-y-1.5">
                                        <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">Valores Automatizados por Catálogo</p>
                                        <div className="grid grid-cols-2 text-xs text-stone-600 font-medium">
                                            <div>Último Costo Neto: <span className="font-mono font-bold text-stone-900">${compraCostoUnitario}</span></div>
                                            <div>Impuesto Relacionado: <span className="font-mono font-bold text-stone-900">{compraImpuesto}%</span></div>
                                        </div>
                                        <p className="text-[10px] text-stone-400 italic">Los valores se toman automáticamente del registro previo para resguardar la consistencia.</p>
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={!compraProductoId}
                                    className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer disabled:opacity-50"
                                >
                                    Ingresar Stock y Calcular Precios
                                </button>
                            </form>
                        </div>

                        {/* Historial y Auditoría */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[380px]">
                            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                                <span className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                                    <History className="h-4 w-4 text-stone-500" /> Remitos Procesados y Automatización de Precios
                                </span>
                            </div>

                            {historialCompras.length === 0 ? (
                                <div className="p-12 text-center text-stone-400 text-sm flex flex-col items-center justify-center gap-2 my-auto">
                                    <Truck className="h-8 w-8 text-stone-300" />
                                    No se registraron movimientos en esta sesión.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-stone-200 bg-stone-50/60 font-semibold uppercase text-stone-500 whitespace-nowrap">
                                                <th className="px-3 py-2.5">ID / Fecha</th>
                                                <th className="px-3 py-2.5">Artículo / Proveedor</th>
                                                <th className="px-3 py-2.5 text-center">Cant.</th>
                                                <th className="px-3 py-2.5">Costo Neto</th>
                                                <th className="px-3 py-2.5 text-center">IVA</th>
                                                <th className="px-3 py-2.5">Venta Neto</th>
                                                <th className="px-3 py-2.5">Púb. (+IVA)</th>
                                                <th className="px-3 py-2.5">Total Remito</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 font-medium">
                                            {historialCompras.map((c) => (
                                                <tr key={c.id} className="hover:bg-stone-50/50">
                                                    <td className="px-3 py-3 font-mono text-stone-500">
                                                        <div>{c.id}</div>
                                                        <div className="text-[9px] text-stone-400 font-normal">{c.fecha.split(' ')[0]}</div>
                                                    </td>
                                                    <td className="px-3 py-3 font-bold text-stone-900 max-w-[140px] truncate">
                                                        {c.productoNombre}
                                                        <div className="text-[9px] text-emerald-800 font-medium truncate">P: {c.proveedor}</div>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-bold text-emerald-800">+{c.cantidadComprada}</td>
                                                    <td className="px-3 py-3 font-mono text-stone-600">${c.costoUnitarioNeto.toLocaleString('es-AR')}</td>
                                                    <td className="px-3 py-3 text-center font-mono text-stone-500">{c.ivaPorcentaje}%</td>
                                                    <td className="px-3 py-3 font-mono font-bold text-stone-700">${c.nuevoPrecioVentaNeto.toLocaleString('es-AR')}</td>
                                                    <td className="px-3 py-3 font-mono font-bold text-emerald-700 bg-emerald-50/30">${c.nuevoPrecioVentaFinal.toLocaleString('es-AR')}</td>
                                                    <td className="px-3 py-3 font-mono font-bold text-stone-900">${c.totalCompra.toLocaleString('es-AR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA 2: FACTURACIÓN / CATALOGO GENERAL */}
                {activeTab === 'general' && (
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase text-stone-500 tracking-wider">
                                        <th className="px-6 py-3.5">Código</th>
                                        <th className="px-6 py-3.5">Detalle / Descripción</th>
                                        <th className="px-6 py-3.5">Categoría</th>
                                        <th className="px-6 py-3.5">Proveedor</th>
                                        <th className="px-6 py-3.5">Stock Real</th>
                                        <th className="px-6 py-3.5">Costo Neto Base</th>
                                        <th className="px-6 py-3.5">Valor Unitario (Neto Venta)</th>
                                        <th className="px-6 py-3.5">Precio Final (+IVA)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {productos.map((p) => {
                                        const precioFinal = p.valor_unitario * (1 + p.impuesto / 100);
                                        return (
                                            <tr key={p.id} className="hover:bg-stone-50/50 transition">
                                                <td className="px-6 py-4 font-mono text-xs text-stone-500 font-bold">{p.codigo}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-stone-900">{p.nombre}</div>
                                                </td>
                                                <td className="px-6 py-4"><span className="inline-flex rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">{p.categoria}</span></td>
                                                <td className="px-6 py-4 text-stone-600 font-medium">{p.proveedor}</td>
                                                <td className="px-6 py-4 font-bold font-mono">{p.cantidad_actual} u.</td>
                                                <td className="px-6 py-4 font-mono text-stone-500">${p.ultimo_costo_neto?.toLocaleString('es-AR') || '0'}</td>
                                                <td className="px-6 py-4 font-bold text-stone-900 font-mono">${p.valor_unitario.toLocaleString('es-AR')}</td>
                                                <td className="px-6 py-4 font-bold text-emerald-800 font-mono">${Math.round(precioFinal).toLocaleString('es-AR')} <span className="text-[10px] text-stone-400 font-normal">({p.impuesto}%)</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VISTA 3: PUNTO DE VENTA (POS) */}
                {activeTab === 'pos' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Selector Izquierda */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-stone-200 shadow-sm h-fit space-y-4">
                            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-emerald-700" /> Cargar Ítem a la Venta
                            </h3>

                            {!mostrarMiniFormProducto ? (
                                /* MODO BUSCADOR STANDARD */
                                <form onSubmit={handleAgregarAlCarrito} className="space-y-4">
                                    <div className="relative" ref={sugerenciasRef}>
                                        <label className="block text-xs font-semibold text-stone-600 mb-1">Buscar Producto</label>
                                        <div className="relative">
                                            <input
                                                type="text" placeholder='Buscar por "ficus", "ART-002"...'
                                                value={productoSeleccionado ? `${productoSeleccionado.codigo} - ${productoSeleccionado.nombre}` : busquedaProducto}
                                                onChange={(e) => { setBusquedaProducto(e.target.value); setProductoSeleccionado(null); setMostrarSugerencias(true); }}
                                                onFocus={() => setMostrarSugerencias(true)}
                                                className="w-full rounded-lg border border-stone-300 bg-stone-50 pl-9 pr-3 py-2 text-sm focus:border-emerald-600 focus:outline-none font-medium text-stone-800"
                                            />
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                                        </div>
                                        {mostrarSugerencias && busquedaProducto.trim().length > 0 && !productoSeleccionado && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-stone-100">
                                                {productosFiltrados.map(p => (
                                                    <button
                                                        key={p.id} type="button" disabled={p.cantidad_actual <= 0}
                                                        onMouseDown={(e) => { e.preventDefault(); setProductoSeleccionado(p); setMostrarSugerencias(false); }}
                                                        className="w-full text-left p-3 text-xs hover:bg-stone-50 transition flex justify-between items-center"
                                                    >
                                                        <div><span className="font-mono font-bold text-emerald-800 mr-2">{p.codigo}</span>{p.nombre}</div>
                                                        <span className="text-[10px] font-bold">{p.cantidad_actual} u.</span>
                                                    </button>
                                                ))}

                                                {/* TRIGGER FORM INLINE EXPRESS PARA ARTÍCULO EN SOLAPA POS */}
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setNuevoProdNombrePOS(busquedaProducto.toUpperCase());
                                                        setMostrarMiniFormProducto(true);
                                                        setMostrarSugerencias(false);
                                                    }}
                                                    className="w-full text-left p-3 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5"
                                                >
                                                    <Plus className="h-4 w-4" /> ¿El producto no existe? Crearlo como: "{busquedaProducto.toUpperCase()}"
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-600 mb-1">Cantidad</label>
                                        <input type="number" required min="1" value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))} className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-mono font-bold" />
                                    </div>
                                    <button type="submit" disabled={!productoSeleccionado} className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer">Agregar al Detalle</button>
                                </form>
                            ) : (
                                /* FORMULARIO INLINE EXPRESS DE ARTÍCULO NUEVO */
                                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-3 text-left animate-fadeIn">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1">✨ Alta de Artículo Express</span>
                                        <button type="button" onClick={() => setMostrarMiniFormProducto(false)} className="text-stone-400 hover:text-stone-600"><X className="h-4 w-4" /></button>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Nombre Comercial del Artículo *</label>
                                        <input type="text" required value={nuevoProdNombrePOS} onChange={(e) => setNuevoProdNombrePOS(e.target.value)} className="w-full bg-white border border-stone-300 rounded px-2.5 py-1 text-xs uppercase focus:outline-emerald-700 font-medium" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Precio Neto Venta *</label>
                                            <input type="number" required min="1" placeholder="$ Neto" value={nuevoProdPrecioVentaPOS} onChange={(e) => setNuevoProdPrecioVentaPOS(e.target.value)} className="w-full bg-white border border-stone-300 rounded px-2.5 py-1 text-xs font-mono font-bold text-emerald-950 focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Categoría *</label>
                                            <select value={nuevoProdCategoriaPOS} onChange={(e) => setNuevoProdCategoriaPOS(e.target.value)} className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs text-stone-800 font-medium focus:outline-none">
                                                {Object.keys(categoriasMargenes).map(catKey => <option key={catKey} value={catKey}>{catKey}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Cantidad Inicial a Vender</label>
                                        <input type="number" required min="1" value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))} className="w-full bg-white border border-stone-300 rounded px-2.5 py-1 text-xs font-mono font-bold focus:outline-none" />
                                    </div>
                                    <button type="button" onClick={handleCrearProductoExpressPOS} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg py-2 text-xs transition shadow-sm cursor-pointer">
                                        Crear e Incorporar al Carrito
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Detalle Ticket Derecha */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between min-h-[420px]">
                            <div>
                                <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                                    <span className="text-sm font-bold text-stone-800">Detalle del Ticket de Venta</span>
                                </div>
                                {carrito.length === 0 ? (
                                    <div className="p-12 text-center text-stone-400 text-sm flex flex-col items-center justify-center gap-2">
                                        <ShoppingCart className="h-8 w-8 text-stone-300" /> Ticket vacío.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-505">
                                                    <th className="px-4 py-2.5">Código</th>
                                                    <th className="px-4 py-2.5">Descripción</th>
                                                    <th className="px-4 py-2.5 text-center">Cant.</th>
                                                    <th className="px-4 py-2.5">Valor U. Neto</th>
                                                    <th className="px-4 py-2.5">Total Línea (+IVA)</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {carrito.map((item) => {
                                                    const totalLinea = (item.valor_unitario * (1 + item.impuesto / 100)) * item.cantidad;
                                                    return (
                                                        <tr key={item.productoId}>
                                                            <td className="px-4 py-3 font-mono text-xs">{item.codigo}</td>
                                                            <td className="px-4 py-3 font-medium">{item.nombre}</td>
                                                            <td className="px-4 py-3 text-center font-bold">{item.cantidad}</td>
                                                            <td className="px-4 py-3">${item.valor_unitario.toLocaleString('es-AR')}</td>
                                                            <td className="px-4 py-3 font-bold">${Math.round(totalLinea).toLocaleString('es-AR')}</td>
                                                            <td className="px-4 py-3"><button onClick={() => handleEliminarDelCarrito(item.productoId)} className="text-stone-400 hover:text-red-600"><Trash className="h-4 w-4" /></button></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Cierre Venta */}
                            {carrito.length > 0 && (
                                <div className="border-t border-stone-200 bg-stone-50/70 p-4 space-y-4">
                                    <div className="p-4 bg-white border border-stone-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        <div className="md:col-span-2 space-y-1">
                                            <div className="flex justify-between text-base font-bold text-emerald-900">
                                                <span>TOTAL FACTURADO:</span>
                                                <span className="font-mono">${Math.round(carritoTotal).toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                        <button onClick={handleProcesarVenta} className="w-full bg-emerald-700 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:bg-emerald-800 transition cursor-pointer">Finalizar Venta</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}