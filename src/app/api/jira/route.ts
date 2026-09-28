import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const domain = (process.env.JIRA_HOST || '').trim();
        const email = (process.env.JIRA_EMAIL || '').trim();
        const token = (process.env.JIRA_API_TOKEN || '').trim();
        const projectKey = (process.env.JIRA_PROJECT_KEY || 'ERP').trim();

        // 1. Validar variables de entorno explícitamente
        if (!domain || !email || !token) {
            return NextResponse.json({
                success: false,
                error: `Faltan variables en .env.local -> HOST: ${!!domain}, EMAIL: ${!!email}, TOKEN: ${!!token}`
            }, { status: 200 });
        }

        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const credentials = Buffer.from(`${email}:${token}`).toString('base64');
        const url = `https://${cleanDomain}/rest/api/2/search?jql=project=${projectKey}&maxResults=5`;

        // 2. Intentar la petición fetch con control de errores de red
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json',
            }
        });

        const responseText = await res.text();

        if (!res.ok) {
            return NextResponse.json({
                success: false,
                error: `Atlassian respondió con HTTP ${res.status}: ${responseText.substring(0, 300)}`
            }, { status: 200 });
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            return NextResponse.json({
                success: false,
                error: `La respuesta de Jira no es un JSON válido (HTML recibido): ${responseText.substring(0, 150)}`
            }, { status: 200 });
        }

        const tickets = (data.issues || []).map((issue: any) => ({
            id: issue.id,
            key: issue.key,
            summary: issue.fields?.summary || 'Sin título',
            description: issue.fields?.description || 'Sin descripción',
            status: issue.fields?.status?.name || 'Pendiente',
            issuetype: issue.fields?.issuetype?.name || 'Task',
            created: issue.fields?.created || null
        }));

        return NextResponse.json({ success: true, tickets }, { status: 200 });

    } catch (err: any) {
        // Captura cualquier error de red, DNS o excepción no controlada
        return NextResponse.json({
            success: false,
            error: `Excepción crítica en servidor: ${err.message || err}`
        }, { status: 200 });
    }
}