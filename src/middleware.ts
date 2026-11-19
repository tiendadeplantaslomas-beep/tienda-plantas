import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: ['*'],
    CAJERO: ['/dashboard', '/perfil', '/ventas', '/caja', '/clientes', '/reportes', '/vivero', '/productos', '/operaciones', '/promociones'],
    OPERADOR: ['/dashboard', '/perfil', '/vivero', '/productos', '/portada', '/promociones', '/resenas', '/operaciones'],
    DEPOSITO: ['/dashboard', '/perfil', '/vivero', '/productos', '/ventas', '/caja', '/compras'],
};

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Permitir acceso libre a login, api y recursos estáticos
    if (path.startsWith('/login') || path.startsWith('/_next') || path.startsWith('/api')) {
        return NextResponse.next();
    }

    const sessionCookie = request.cookies.get('admin_session')?.value;

    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const session = JSON.parse(sessionCookie);
        const userRole = (session.role || '').toUpperCase();

        const allowedRoutes = ROLE_PERMISSIONS[userRole] || [];
        const hasAccess = allowedRoutes.includes('*') || allowedRoutes.some(route => path.startsWith(route));

        if (!hasAccess) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    } catch (e) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('admin_session');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/perfil/:path*',
        '/clientes/:path*',
        '/productos/:path*',
        '/vivero/:path*',
        '/ventas/:path*',
        '/caja/:path*',
        '/compras/:path*',
        '/reportes/:path*',
        '/jira/:path*',
        '/operaciones/:path*',
        '/portada/:path*',
        '/promociones/:path*',
        '/resenas/:path*',
    ],
};