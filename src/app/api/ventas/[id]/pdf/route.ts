import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Consulta de la venta sobre el esquema Prisma
        const sale = await prisma.sale.findUnique({
            where: { id },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true
                    }
                },
                payments: true
            }
        });

        if (!sale) {
            return new NextResponse('Comprobante no encontrado', { status: 404 });
        }

        // Cálculos financieros
        const totalPagado = sale.payments?.reduce((acc: number, p: any) => acc + (p.amount || 0), 0) || sale.paidAmount || 0;
        const saldoPendiente = Math.max(0, sale.total - totalPagado);
        const estaPagado = sale.isPaid || sale.paymentStatus === 'PAGADO' || saldoPendiente === 0;

        const nombreCliente = sale.customerName || sale.customer?.name || 'CONSUMIDOR FINAL';
        const direccionCliente = sale.shippingAddress || sale.customer?.address || 'Lomas de Zamora, Buenos Aires';

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Factura C #${sale.id.slice(-6)} - Tienda de Plantas</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; padding: 30px; }
                    
                    /* HOJA ESTILO FACTURA CON BORDES DECORATIVOS VERDES */
                    .invoice-card {
                        max-width: 680px;
                        margin: 0 auto;
                        background: #ffffff;
                        padding: 40px;
                        position: relative;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                        border-top: 12px solid #1e3a1e;
                        border-bottom: 12px solid #1e3a1e;
                        overflow: hidden;
                    }

                    /* MARCO DECORATIVO INTERNO VERDE Y NEGRO */
                    .invoice-card::before {
                        content: "";
                        position: absolute;
                        top: 0; left: 0; right: 0;
                        height: 6px;
                        background: linear-gradient(90deg, #15803d 0%, #166534 50%, #052e16 100%);
                    }

                    /* CABECERA DE MARCA */
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .brand-info { display: flex; align-items: center; gap: 12px; }
                    .brand-info img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
                    .brand-text h2 { font-size: 18px; font-weight: 800; color: #1e3a1e; text-transform: uppercase; tracking-spacing: 0.5px; }
                    .brand-text p { font-size: 11px; color: #475569; margin-top: 2px; }

                    /* LETRA C CENTRAL */
                    .box-c-container { text-align: center; border: 2px solid #15803d; padding: 4px 12px; border-radius: 6px; background: #f0fdf4; }
                    .box-c { font-size: 22px; font-weight: 900; color: #15803d; }
                    .box-c-sub { font-size: 8px; font-weight: 800; color: #166534; text-transform: uppercase; }

                    /* ESTADO STAMP (PAGADO / PENDIENTE) */
                    .status-stamp {
                        text-align: center;
                        font-size: 26px;
                        font-weight: 800;
                        margin: 15px 0;
                        color: ${estaPagado ? '#e11d48' : '#d97706'};
                        letter-spacing: 0.5px;
                    }

                    /* DATOS COMPROBANTE Y CLIENTE */
                    .doc-title { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
                    .meta-grid { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 25px; line-height: 1.6; }
                    .meta-label { color: #64748b; font-weight: 600; }
                    .meta-val { color: #0f172a; font-weight: 700; }

                    /* TABLA VERDE HOJA INSTITUCIONAL */
                    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
                    thead { background-color: #3b633b; color: #ffffff; }
                    th { padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 11px; text-align: left; }
                    th.num { text-align: right; }
                    th.center { text-align: center; }
                    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    td.num { text-align: right; font-family: monospace; font-weight: 600; }
                    td.center { text-align: center; }

                    /* RESUMEN DE TOTALES */
                    .totals-container { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; font-size: 13px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #cbd5e1; }
                    .total-row { display: flex; justify-content: space-between; width: 220px; }
                    .total-row.main { font-size: 16px; font-weight: 800; color: #0f172a; border-top: 2px solid #1e293b; padding-top: 6px; margin-top: 4px; }
                    .total-row.paid { color: #15803d; font-weight: 700; }
                    .total-row.pending { color: #b45309; font-weight: 800; }

                    /* PIE DE PÁGINA CON LEYENDA */
                    .footer-notes { margin-top: 35px; font-size: 11px; color: #64748b; line-height: 1.5; }

                    /* BOTÓN DE IMPRESIÓN */
                    .actions { margin-top: 25px; text-align: center; }
                    .btn-print { background: #15803d; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: 12px; transition: background 0.2s; }
                    .btn-print:hover { background: #166534; }

                    @media print {
                        body { background: #fff; padding: 0; }
                        .invoice-card { box-shadow: none; border-radius: 0; max-width: 100%; padding: 20px; }
                        .actions { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-card">
                    
                    <div class="header">
                        <div class="brand-info">
                            <div class="brand-text">
                                <h2>TIENDA DE PLANTAS</h2>
                                <p>Pedro Mascagni 316, Lomas de Zamora</p>
                                <p>Tel: +54 11 40782378 | CUIT: 20-XXXXXXXX-X</p>
                            </div>
                        </div>

                        <div class="box-c-container">
                            <div class="box-c">C</div>
                            <div class="box-c-sub">COD. 011</div>
                        </div>
                    </div>

                    <div class="status-stamp">
                        ${estaPagado ? 'Pagado' : 'Pago Parcial / Pendiente'}
                    </div>

                    <div class="doc-title">Factura</div>

                    <div class="meta-grid">
                        <div>
                            <p><span class="meta-label">Fecha:</span> <span class="meta-val">${new Date(sale.createdAt).toLocaleDateString('es-AR')}</span></p>
                            <p><span class="meta-label">N° de factura:</span> <span class="meta-val">0001-${sale.id.slice(-6).toUpperCase()}</span></p>
                            <p><span class="meta-label">Condición IVA:</span> <span class="meta-val">Consumidor Final</span></p>
                        </div>
                        <div style="text-align: right;">
                            <p class="meta-label">Facturar a:</p>
                            <p class="meta-val" style="text-transform: uppercase; font-size: 13px;">${nombreCliente}</p>
                            <p style="color: #64748b; font-size: 11px;">${direccionCliente}</p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th class="center" style="width: 10%;">Cant.</th>
                                <th style="width: 50%;">Descripción</th>
                                <th class="num" style="width: 20%;">Precio unitario</th>
                                <th class="num" style="width: 20%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items && sale.items.length > 0
                ? sale.items.map((it: any) => `
                                    <tr>
                                        <td class="center"><strong>${it.quantity}</strong></td>
                                        <td><strong>${it.product?.name || 'Producto'}</strong></td>
                                        <td class="num">$ ${it.price.toLocaleString('es-AR')}</td>
                                        <td class="num">$ ${(it.price * it.quantity).toLocaleString('es-AR')}</td>
                                    </tr>
                                `).join('')
                : '<tr><td colSpan="4" style="text-align:center; color:#94a3b8;">Sin detalles registrados</td></tr>'
            }
                        </tbody>
                    </table>

                    <div class="totals-container">
                        <div class="total-row main">
                            <span>Total:</span>
                            <span>$ ${sale.total.toLocaleString('es-AR')}</span>
                        </div>
                        ${totalPagado > 0 ? `
                            <div class="total-row paid">
                                <span>Abonado:</span>
                                <span>$ ${totalPagado.toLocaleString('es-AR')}</span>
                            </div>
                        ` : ''}
                        ${saldoPendiente > 0 ? `
                            <div class="total-row pending">
                                <span>Resta Cobrar:</span>
                                <span>$ ${saldoPendiente.toLocaleString('es-AR')}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="footer-notes">
                        <p><strong>Nota:</strong> ${sale.notes || 'Comprobante emitido a Consumidor Final.'}</p>
                        <p style="margin-top: 4px;">Gracias por su preferencia.</p>
                    </div>

                    <div class="actions">
                        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Descargar PDF</button>
                    </div>

                </div>
            </body>
            </html>
        `;

        return new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });

    } catch (error: any) {
        console.error('Error al generar la Factura C:', error);
        return new NextResponse(`Error al generar la factura: ${error.message}`, { status: 500 });
    }
}