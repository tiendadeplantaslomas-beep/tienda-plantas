import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/tienda/login?error=token_invalido', request.url));
    }

    try {
        // Buscar usuario con ese token y actualizar email_verified = 1, token = NULL
        // const [rows]: any = await db.execute('SELECT id FROM customers WHERE verification_token = ?', [token]);
        // if (rows.length === 0) throw new Error('Token no válido');
        // await db.execute('UPDATE customers SET email_verified = 1, verification_token = NULL WHERE verification_token = ?', [token]);

        // Redirigir al Login indicando éxito
        return NextResponse.redirect(new URL('/tienda/login?verificado=true', request.url));
    } catch (error) {
        return NextResponse.redirect(new URL('/tienda/login?error=verificacion_fallida', request.url));
    }
}