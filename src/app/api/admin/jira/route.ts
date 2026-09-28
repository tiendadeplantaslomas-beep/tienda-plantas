import { NextResponse } from 'next/server';
import { obtenerTicketsJira, crearTicketJira } from '@/lib/jira';

export async function GET() {
    try {
        const tickets = await obtenerTicketsJira();
        return NextResponse.json({ success: true, tickets });
    } catch (error: any) {
        console.error('Error en GET /api/admin/jira:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { summary, description, issuetype, parentKey } = body;

        if (!summary) {
            return NextResponse.json({ success: false, error: 'El campo summary es obligatorio' }, { status: 400 });
        }

        const newIssue = await crearTicketJira(summary, description || '', issuetype || 'Task', parentKey);
        return NextResponse.json({ success: true, ticket: newIssue });
    } catch (error: any) {
        console.error('Error en POST /api/admin/jira:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}