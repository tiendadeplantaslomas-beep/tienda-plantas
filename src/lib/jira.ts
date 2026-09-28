export async function crearTicketJira(summary: string, description: string, issuetype: string = 'Task', parentKey?: string) {
    const domain = (process.env.JIRA_HOST || '').trim();
    const email = (process.env.JIRA_EMAIL || '').trim();
    const token = (process.env.JIRA_API_TOKEN || '').trim();
    const projectKey = (process.env.JIRA_PROJECT_KEY || 'KAN').trim();

    if (!domain || !email || !token) {
        throw new Error('Faltan configurar las credenciales de Jira en el archivo .env.local');
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');

    const fields: any = {
        project: { key: projectKey },
        summary: summary,
        description: description || '',
        issuetype: { name: issuetype }
    };

    if (parentKey && parentKey.trim() !== '') {
        fields.parent = { key: parentKey.trim() };
    }

    const res = await fetch(`https://${cleanDomain}/rest/api/2/issue`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields })
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Jira Create Error (${res.status}): ${errorText}`);
    }
    return await res.json();
}

export async function obtenerTicketsJira() {
    const domain = (process.env.JIRA_HOST || '').trim();
    const email = (process.env.JIRA_EMAIL || '').trim();
    const token = (process.env.JIRA_API_TOKEN || '').trim();
    const projectKey = (process.env.JIRA_PROJECT_KEY || 'KAN').trim();

    if (!domain || !email || !token) {
        throw new Error('Faltan configurar las credenciales de Jira en el archivo .env.local');
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const credentials = Buffer.from(`${email}:${token}`).toString('base64');

    const jql = encodeURIComponent(`project = ${projectKey} ORDER BY created DESC`);
    // Agregamos 'priority' a la lista de campos requeridos junto con assignee, parent, etc.
    const fieldsParam = encodeURIComponent('summary,status,issuetype,created,parent,assignee,priority');

    const url = `https://${cleanDomain}/rest/api/3/search/jql?jql=${jql}&maxResults=50&fields=${fieldsParam}`;

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json',
        }
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Jira Search Error (${res.status}): ${errorText}`);
    }

    const data = await res.json();

    return (data.issues || []).map((issue: any) => {
        const fields = issue.fields || {};
        return {
            id: issue.id || issue.key,
            key: issue.key || projectKey,
            summary: fields.summary || `Ticket ${issue.key}`,
            description: fields.description || '',
            status: fields.status?.name || 'Pendiente',
            issuetype: fields.issuetype?.name || 'Task',
            created: fields.created ? new Date(fields.created).toLocaleDateString('es-AR') : 'Reciente',
            parentKey: fields.parent?.key || null,
            assignee: fields.assignee?.displayName || 'Sin asignar',
            priority: fields.priority?.name || 'Normal' // Mapeo de la prioridad extraída de Jira
        };
    });
}