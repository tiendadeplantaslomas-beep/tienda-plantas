// app/layout.tsx
import React from 'react';
import './globals.css'; // o las clases de CSS que uses

export const metadata = {
    title: 'Tienda de Plantas ERP',
    description: 'Sistema de Gestión ERP / CRM',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className="antialiased bg-slate-50 text-slate-800">
                {children}
            </body>
        </html>
    );
}