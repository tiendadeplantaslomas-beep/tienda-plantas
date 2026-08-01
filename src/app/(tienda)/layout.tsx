import React from 'react';

export default function TiendaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white text-gray-800">
            {/* Contenedor del e-commerce público */}
            <main>{children}</main>
        </div>
    );
}