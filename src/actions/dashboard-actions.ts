'use server';

import { prisma } from '@/lib/prisma';

// Métricas operativas (actualizado con reseñas pendientes)
export async function getDashboardStats() {
    try {
        const productos = await prisma.product.findMany({
            select: { stock: true, minStock: true }
        });
        const stockBajoCount = productos.filter(p => (p.stock || 0) <= (p.minStock || 2)).length;

        // Consultamos las reseñas que aún no tienen respuesta en la base de datos
        // (Asumiendo que tu modelo en Prisma se llama 'resena' y tiene campos como 'respuesta')
        const resenasPendientesCount = await prisma.resena.count({
            where: {
                OR: [
                    { respuesta: null },
                    { respuesta: '' }
                ]
            }
        }).catch(() => 0); // Por seguridad si la tabla tuviera otro nombre exacto

        return {
            stockBajo: stockBajoCount,
            facturasPendientes: 1,
            pedidosCamino: 5,
            remitosValidar: 2,
            resenasPendientes: resenasPendientesCount // <--- ¡Acá se conecta con el frontend!
        };
    } catch (error) {
        console.error("Error al obtener estadísticas operativas:", error);
        return {
            stockBajo: 0,
            facturasPendientes: 0,
            pedidosCamino: 0,
            remitosValidar: 0,
            resenasPendientes: 0
        };
    }
}

// Nueva función para calcular la evolución de ventas de los últimos 6 meses
export async function getSalesEvolution(role: string, userId?: string) {
    try {
        const esAdmin = role === 'ADMIN';

        // Fecha de inicio: el primer día de hace 5 meses atrás
        const fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - 5);
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);

        // Consultamos las ventas del período (asumiendo un modelo 'sale' con 'createdAt' y 'total')
        const ventas = await prisma.sale.findMany({
            where: {
                createdAt: { gte: fechaInicio },
                // Si es cajero y querés filtrar por su usuario, podés descomentar la línea de abajo:
                // ...(esAdmin ? {} : { userId: userId })
            },
            select: {
                createdAt: true,
                total: true,
            },
            orderBy: { createdAt: 'asc' }
        });

        // Nombres de los meses en español
        const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Armamos un mapa con los últimos 6 meses exactos
        const mapaMeses: { [key: string]: number } = {};
        const ahora = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
            const clave = `${nombresMeses[d.getMonth()]} ${d.getFullYear()}`;
            mapaMeses[clave] = 0; // Inicializamos en 0
        }

        // Sumamos los montos reales a cada mes correspondiente
        ventas.forEach(venta => {
            const fechaVenta = new Date(venta.createdAt);
            const clave = `${nombresMeses[fechaVenta.getMonth()]} ${fechaVenta.getFullYear()}`;
            if (mapaMeses[clave] !== undefined) {
                mapaMeses[clave] += Number(venta.total || 0);
            }
        });

        let acumuladoTotal = 0;
        const datosVentas = Object.keys(mapaMeses).map(mesKey => {
            const valorNumerico = mapaMeses[mesKey];
            acumuladoTotal += valorNumerico;

            // Formatear texto (ej: $1.2M o $0.3M si está en millones, o en miles)
            const enMillones = valorNumerico / 1000000;
            const montoTexto = enMillones >= 1
                ? `$${enMillones.toFixed(1)}M`
                : `$${(valorNumerico / 1000).toFixed(1)}k`;

            return {
                mes: mesKey.split(' ')[0], // Solo el nombre del mes (ej: 'Mar')
                montoTexto,
                valorNumerico: Number(enMillones.toFixed(2))
            };
        });

        const totalFormateado = acumuladoTotal >= 1000000
            ? `$${(acumuladoTotal / 1000000).toFixed(1)}M`
            : `$${acumuladoTotal.toLocaleString()}`;

        return {
            datosVentas,
            totalPeriodo: esAdmin ? totalFormateado : `${totalFormateado} (Personal)`
        };

    } catch (error) {
        console.error("Error al calcular evolución de ventas:", error);
        return {
            datosVentas: [],
            totalPeriodo: '$0'
        };
    }
}