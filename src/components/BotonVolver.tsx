'use client';

import React from 'react';
import Link from 'next/link';

interface BotonVolverProps {
    href?: string;
    texto?: string;
    className?: string;
}

export function BotonVolver({
    href = '@/dashboard',
    texto = 'Volver al Panel Principal',
    className = ''
}: BotonVolverProps) {
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-semibold shadow-sm cursor-pointer ${className}`}
        >
            <span className="text-sm">←</span>
            <span>{texto}</span>
        </Link>
    );
}