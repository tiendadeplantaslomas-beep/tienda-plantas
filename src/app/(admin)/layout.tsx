import React from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            {/* Contenedor del panel administrativo */}
            <main>{children}</main>
        </div>
    );
}