import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, PaymentMethod } from '@prisma/client';

// GET: Obtener todos los pagos
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const saleId = searchParams.get('saleId');
        const customerId = searchParams.get('customerId');

        const where: Prisma.PaymentWhereInput = {};
        if (saleId) where.saleId = saleId;
        if (customerId) where.customerId = customerId;

        const payments = await prisma.payment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                sale: true,
            }
        });
        return NextResponse.json(payments);
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        return NextResponse.json(
            { error: 'Error al obtener los pagos' },
            { status: 500 }
        );
    }
}

// POST / PUT / PATCH: Crear o actualizar el pago
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const rawMethod = body.paymentMethod || body.method || body.paymentType || 'EFECTIVO';
        const validMethods = Object.values(PaymentMethod);
        const finalMethod = validMethods.includes(rawMethod) ? rawMethod : PaymentMethod.EFECTIVO;

        const amount = Number(body.amount);
        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { error: 'El monto del pago es obligatorio y debe ser mayor a 0.' },
                { status: 400 }
            );
        }

        // Asignamos el saleId de forma limpia si viene especificado
        const validSaleId = body.saleId && typeof body.saleId === 'string' && body.saleId.trim() !== ''
            ? body.saleId.trim()
            : null;

        const paymentData = {
            amount,
            paymentMethod: finalMethod,
            reference: body.reference ? String(body.reference).trim() : null,
            notes: body.notes ? String(body.notes).trim() : null,
            customerId: body.customerId || null,
            saleId: validSaleId,
        };

        let result;
        if (body.id) {
            result = await prisma.payment.upsert({
                where: { id: String(body.id) },
                update: paymentData,
                create: {
                    id: String(body.id),
                    ...paymentData,
                },
            });
        } else {
            result = await prisma.payment.create({
                data: paymentData,
            });
        }

        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('ERROR CRITICO EN API PAYMENTS:', error);

        // Si Prisma detecta que el saleId no existe en la base de datos (Error P2003: Foreign Key constraint)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003') {
                return NextResponse.json(
                    { error: 'El ID de venta asociado no existe en el sistema o es inválido.' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: `Error de base de datos (${error.code}): ${error.message}` },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Error interno al procesar el pago' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    return POST(request);
}

export async function PATCH(request: Request) {
    return POST(request);
}