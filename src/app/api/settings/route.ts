import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // O tu cliente de Prisma configurado

export async function GET() {
    try {
        let settings = await prisma.companySettings.findUnique({
            where: { id: 'default' }
        });

        // Si es la primera vez, creamos el registro por defecto
        if (!settings) {
            settings = await prisma.companySettings.create({
                data: {
                    id: 'default',
                    tradeName: 'TIENDA DE PLANTAS',
                    legalName: 'DANIEL ALBERTO URRACA',
                    vatCondition: 'MONOTRIBUTO',
                    address: 'Lomas de Zamora, Buenos Aires',
                    receiptLegend: 'DOCUMENTO NO VÁLIDO COMO FACTURA',
                    invoicePoint: 1
                }
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();

        const updated = await prisma.companySettings.upsert({
            where: { id: 'default' },
            update: {
                tradeName: body.tradeName?.toUpperCase(),
                legalName: body.legalName?.toUpperCase(),
                cuit: body.cuit,
                vatCondition: body.vatCondition,
                grossIncome: body.grossIncome,
                activityStart: body.activityStart,
                address: body.address?.toUpperCase(),
                phone: body.phone,
                email: body.email?.toLowerCase(),
                logoUrl: body.logoUrl,
                invoicePoint: Number(body.invoicePoint) || 1,
                receiptLegend: body.receiptLegend?.toUpperCase(),
                defaultInvoiceC: Boolean(body.defaultInvoiceC)
            },
            create: {
                id: 'default',
                ...body
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
    }
}