# 📖 Documentación del Sistema de Gestión Comercial y Vivero

**Versión:** 1.2.0  
**Última actualización:** Agosto 2026  
**Tecnologías:** Next.js (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL.

---

## 🎯 1. Visión General del Proyecto
Sistema web integral diseñado para la administración comercial, control de inventario, punto de venta (POS), arqueo financiero de caja y gestión especializada para vivero.

### 🎨 Sistema de Diseño y UI
Toda la interfaz cuenta con una línea estética unificada:
* **Paleta base:** `Slate` (fondos, contenedores y bordes).
* **Acentos:** `Emerald` (ventas, métricas positivas, acciones principales), `Sky` (transferencias, envíos), `Indigo/Purple` (tarjetas/crédito) y `Rose` (alertas/cancelaciones).
* **Diseño:** Sin scrollbars innecesarias, vistas compactas e interactivas, tipografía marcada y estados vacíos claros.

---

## 🧱 2. Estructura de Módulos y Rutas

```text
src/
├── actions/              # Server Actions (Productos, Ventas, Clientes, Reportes)
├── docs/
│   └── documentacion.md  # Documentación técnica y funcional
└── app/
    ├── (admin)/          # Panel de Administración Protegido
    │   ├── layout.tsx    # Layout con navegación general
    │   ├── page.tsx      # Landing Page / Hub Principal (En desarrollo)
    │   ├── caja/         # Resumen y Arqueo Diario de Caja
    │   ├── compras/      # Gestión de Proveedores y Compras
    │   ├── productos/    # Catálogo General y Precios
    │   ├── stock/        # Control de Inventario
    │   ├── ventas/       # Punto de Venta (POS)
    │   │   └── historial/ # Reportes e Informes Acumulados
    │   └── vivero/       # Módulo Especializado Vivero
    │       └── _components/ # Componentes del ecosistema vivero
    └── login/            # Acceso de usuarios