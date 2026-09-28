import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const modulo = searchParams.get('modulo') || 'erp';
        const tipo = searchParams.get('tipo') || 'ventas';
        const desde = searchParams.get('desde') || '2026-09-01';
        const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0];

        const [desdeAnio, desdeMes, desdeDia] = desde.split('-').map(Number);
        const [hastaAnio, hastaMes, hastaDia] = hasta.split('-').map(Number);

        const fechaInicio = new Date(desdeAnio, desdeMes - 1, desdeDia, 0, 0, 0, 0);
        const fechaFin = new Date(hastaAnio, hastaMes - 1, hastaDia, 23, 59, 59, 999);

        // Modulo ERP
        if (modulo === 'erp') {
            if (tipo === 'ventas' || tipo === 'historial') {
                const sales = await prisma.sale.findMany({
                    where: { createdAt: { gte: fechaInicio, lte: fechaFin } },
                    include: { items: { include: { product: true } }, customer: true },
                    orderBy: { createdAt: 'desc' }
                });

                if (!sales || sales.length === 0) {
                    return NextResponse.json({
                        success: true, hasData: false,
                        titulo: 'Reporte de Ventas y Facturación',
                        metrics: [], chartTitle: 'Sin Ventas Registradas en este Rango', chartData: []
                    });
                }

                const totalVentas = sales.reduce((acc, s) => acc + s.total, 0);
                const totalTransacciones = sales.length;
                const ticketPromedio = totalTransacciones > 0 ? Math.round(totalVentas / totalTransacciones) : 0;

                const chartData = sales.slice(0, 5).map((s, i) => {
                    const divisor = totalVentas > 0 ? totalVentas : 1;
                    const pct = Math.min(100, Math.max(5, Math.round((s.total / divisor) * 100)));
                    return {
                        label: `Op #${s.id.slice(-4)}`,
                        pct,
                        val: `$${s.total.toLocaleString('es-AR')}`,
                        color: i % 2 === 0 ? 'bg-emerald-700' : 'bg-stone-800'
                    };
                });

                return NextResponse.json({
                    success: true, hasData: true,
                    titulo: tipo === 'ventas' ? 'Reporte de Ventas y Facturación' : 'Historial de Operaciones ERP',
                    metrics: [
                        { label: 'Facturación Total', val: `$${totalVentas.toLocaleString('es-AR')}`, var: 'Real', up: true },
                        { label: 'Transacciones', val: `${totalTransacciones} op.`, var: 'Registradas', up: true },
                        { label: 'Ticket Promedio', val: `$${ticketPromedio.toLocaleString('es-AR')}`, var: 'Promedio', up: true }
                    ],
                    chartTitle: 'Distribución de Ventas Recientes',
                    chartData
                });
            }

            if (tipo === 'cuenta_corriente') {
                const pendingSales = await prisma.sale.findMany({
                    where: { createdAt: { gte: fechaInicio, lte: fechaFin }, customerId: { not: null } },
                    include: { customer: true },
                    orderBy: { createdAt: 'desc' }
                });

                if (!pendingSales || pendingSales.length === 0) {
                    return NextResponse.json({
                        success: true, hasData: false,
                        titulo: 'Estado de Cuenta Corriente y Balance',
                        metrics: [], chartTitle: 'Sin Movimientos de Clientes en este Rango', chartData: []
                    });
                }

                const saldoTotalDeuda = pendingSales.reduce((acc, s) => acc + (s.pendingBalance > 0 ? s.pendingBalance : s.total), 0);
                const clientesUnicos = new Set(pendingSales.map(s => s.customerId).filter(Boolean)).size;

                const chartDataCC = pendingSales.slice(0, 4).map((s) => {
                    const montoRef = s.pendingBalance > 0 ? s.pendingBalance : s.total;
                    const divisor = saldoTotalDeuda > 0 ? saldoTotalDeuda : 1;
                    const pct = Math.min(100, Math.max(5, Math.round((montoRef / divisor) * 100)));
                    return {
                        label: s.customer?.name || `Op #${s.id.slice(-4)}`,
                        pct,
                        val: `$${montoRef.toLocaleString('es-AR')}`,
                        color: 'bg-amber-600'
                    };
                });

                return NextResponse.json({
                    success: true, hasData: true,
                    titulo: 'Estado de Cuenta Corriente y Balance',
                    metrics: [
                        { label: 'Monto Total Operaciones', val: `$${saldoTotalDeuda.toLocaleString('es-AR')}`, var: 'Registrado', up: false },
                        { label: 'Clientes con Movimientos', val: `${clientesUnicos} cl.`, var: 'Activos', up: false },
                        { label: 'Operaciones con Cliente', val: `${pendingSales.length} op.`, var: 'Vínculos', up: false }
                    ],
                    chartTitle: 'Movimientos de Cuenta por Operación',
                    chartData: chartDataCC
                });
            }

            if (tipo === 'stock' || tipo === 'costos' || tipo === 'rentabilidad') {
                const products = await prisma.product.findMany({ orderBy: { stock: 'desc' } });

                if (!products || products.length === 0) {
                    return NextResponse.json({
                        success: true, hasData: false,
                        titulo: 'Control de Stock e Inventario',
                        metrics: [], chartTitle: 'Sin Stock Registrado', chartData: []
                    });
                }

                const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
                const valorInventario = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
                const bajoStock = products.filter(p => p.stock <= p.minStock).length;

                const chartDataStock = products.slice(0, 5).map((p, i) => {
                    const divisor = totalItems > 0 ? totalItems : 1;
                    const pct = Math.min(100, Math.max(5, Math.round((p.stock / divisor) * 100)));
                    return {
                        label: p.name.length > 12 ? p.name.substring(0, 10) + '...' : p.name,
                        pct,
                        val: `${p.stock} u.`,
                        color: i % 2 === 0 ? 'bg-emerald-700' : 'bg-stone-800'
                    };
                });

                return NextResponse.json({
                    success: true, hasData: true,
                    titulo: tipo === 'stock' ? 'Control de Stock e Inventario Actual' : tipo === 'costos' ? 'Costos de Insumos y Valorización' : 'Rentabilidad Teórica por Producto',
                    metrics: [
                        { label: 'Unidades Totales', val: `${totalItems} u.`, var: 'Stock', up: true },
                        { label: 'Valor del Inventario', val: `$${valorInventario.toLocaleString('es-AR')}`, var: 'Estimado', up: true },
                        { label: 'Alertas Stock Bajo', val: `${bajoStock} ítems`, var: 'Atención', up: bajoStock === 0 }
                    ],
                    chartTitle: 'Distribución de Stock por Producto',
                    chartData: chartDataStock
                });
            }

            if (tipo === 'caja') {
                const sales = await prisma.sale.findMany({
                    where: { createdAt: { gte: fechaInicio, lte: fechaFin } }
                });
                const totalCaja = sales.reduce((acc, s) => acc + s.total, 0);

                return NextResponse.json({
                    success: true,
                    hasData: sales.length > 0,
                    titulo: 'Arqueos y Cierres de Turno',
                    metrics: [
                        { label: 'Total Ingresos en Caja', val: `$${totalCaja.toLocaleString('es-AR')}`, var: 'Operaciones', up: true },
                        { label: 'Transacciones del Turno', val: `${sales.length} op.`, var: 'Registradas', up: true }
                    ],
                    chartTitle: 'Ingresos por Operaciones de Caja',
                    chartData: sales.slice(0, 5).map((s, i) => ({
                        label: `Op #${s.id.slice(-4)}`,
                        pct: 100,
                        val: `$${s.total.toLocaleString('es-AR')}`,
                        color: i % 2 === 0 ? 'bg-emerald-700' : 'bg-stone-800'
                    }))
                });
            }
        }

        // Modulo CRM
        if (modulo === 'crm') {
            const salesWithCustomer = await prisma.sale.findMany({
                where: {
                    createdAt: { gte: fechaInicio, lte: fechaFin },
                    customerId: { not: null }
                },
                include: { customer: true },
                orderBy: { createdAt: 'desc' }
            });

            const allCustomers = await prisma.customer.findMany({
                orderBy: { name: 'asc' } // O podés dejarlo sin el objeto orderBy: prisma.customer.findMany()
            });

            const totalClientes = allCustomers.length;
            const customerSalesMap = new Map<string, { name: string; total: number; count: number }>();

            salesWithCustomer.forEach(s => {
                // Fallback seguro: si la relación de Prisma viene null, rescata el nombre del cliente o usa uno genérico
                const nombreCliente = s.customer?.name || (s as any).customerName || 'Cliente Registrado';
                const idCliente = s.customerId || 's/n';

                const existing = customerSalesMap.get(idCliente) || { name: nombreCliente, total: 0, count: 0 };
                existing.total += s.total || 0;
                existing.count += 1;
                customerSalesMap.set(idCliente, existing);
            });

            const rankedCustomers = Array.from(customerSalesMap.entries()).map(([id, data]) => ({
                id,
                name: data.name,
                total: data.total,
                count: data.count
            })).sort((a, b) => b.total - a.total);

            const clientesConCompras = rankedCustomers.length;
            const maxVal = rankedCustomers[0]?.total || 1;

            return NextResponse.json({
                success: true,
                hasData: rankedCustomers.length > 0, // 👈 Se ajusta para validar si hay registros procesados
                titulo: tipo === 'historial' ? 'Historial de Compras por Cliente' : tipo === 'embudo' ? 'Embudo de Ventas y Prospectos' : 'Productos Más Vendidos por Clientes',
                metrics: [
                    { label: 'Total Clientes en Base', val: `${totalClientes}`, var: 'CRM', up: true },
                    { label: 'Clientes con Compras', val: `${clientesConCompras}`, var: 'Activos en Rango', up: clientesConCompras > 0 },
                    { label: 'Sin Actividad en Rango', val: `${Math.max(0, totalClientes - clientesConCompras)}`, var: 'Inactivos', up: false }
                ],
                chartTitle: 'Top Clientes por Volumen de Compras (En Rango)',
                chartData: rankedCustomers.slice(0, 5).map((c, i) => {
                    const pct = Math.min(100, Math.max(15, Math.round((c.total / maxVal) * 100)));
                    return {
                        label: c.name.length > 12 ? c.name.substring(0, 10) + '...' : c.name,
                        pct,
                        val: `$${c.total.toLocaleString('es-AR')}`,
                        color: i % 2 === 0 ? 'bg-indigo-700' : 'bg-teal-700'
                    };
                })
            });
        }

        // Modulo Web
        if (modulo === 'web') {
            const products = await prisma.product.findMany({ take: 5, orderBy: { stock: 'asc' } });
            return NextResponse.json({
                success: true,
                hasData: products.length > 0,
                titulo: tipo === 'online_mas_vendidos' ? 'Productos Más Visitados Online' : 'Rendimiento de Stock Sincronizado',
                metrics: [
                    { label: 'Productos Sincronizados', val: `${products.length}`, var: 'Web', up: true },
                    { label: 'Estado Conexión', val: 'Online', var: 'Activo', up: true }
                ],
                chartTitle: 'Rotación de Artículos en Tienda Web',
                chartData: products.map((p, i) => ({
                    label: p.name.length > 12 ? p.name.substring(0, 10) + '...' : p.name,
                    pct: Math.min(100, Math.max(20, p.stock * 5)),
                    val: `${p.stock} u.`,
                    color: i % 2 === 0 ? 'bg-amber-700' : 'bg-emerald-800'
                }))
            });
        }

        return NextResponse.json({
            success: true,
            hasData: false,
            titulo: 'Reporte del Sistema',
            metrics: [],
            chartTitle: 'Sin Datos Registrados',
            chartData: []
        });

    } catch (error) {
        console.error('Error en API Reportes:', error);
        return NextResponse.json({ success: false, hasData: false, error: 'Error interno del servidor' }, { status: 500 });
    }
}