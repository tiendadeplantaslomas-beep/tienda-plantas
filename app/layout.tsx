import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Sistema Vivero - CRM/ERP',
    description: 'Gestión comercial y catálogo digital',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body className="min-h-screen bg-stone-100 text-stone-800 antialiased selection:bg-emerald-200 selection:text-emerald-900">
                {children}
            </body>
        </html>
    );
}