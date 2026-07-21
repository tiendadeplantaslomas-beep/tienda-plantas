// Al principio de tu archivo app/admin/page.tsx:
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Upload, Download, Package, DollarSign, FileText, AlertTriangle, LogOut /* rest of icons */ } from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();

    // Protección de ruta a nivel cliente
    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role !== 'ADMIN') {
            router.push('/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('user_role');
        router.push('/login');
    };

    // ... TODO EL CÓDIGO DEL DASHBOARD DEL VIVERO QUE TENÍAMOS ...
}