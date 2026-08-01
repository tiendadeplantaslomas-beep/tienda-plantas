# # 🌿 Sistema de Gestión y E-commerce - Tienda de Plantas

Este proyecto es una plataforma **omnicanal** desarrollada con Next.js (App Router), pensada para integrar en una sola base de datos y backend centralizado dos operaciones clave:
1. **Tienda Online (E-commerce / B2C)**: Catálogo, carrito de compras, usuarios y ventas web.
2. **Sistema POS / Administración Interna**: Punto de venta ágil en mostrador, arqueo de caja diario, gestión de inventario y reportes consolidados.

---

## 🏗️ Arquitectura de Rutas (Route Groups)

Aprovechando los **Route Groups** de Next.js, el proyecto se divide en dos entornos visuales y funcionales totalmente independientes, compartiendo las mismas Server Actions y base de datos.

```text
src/
└── app/
    ├── (tienda)/                   # 🛒 CANAL PÚBLICO (Clientes)
    │   ├── layout.tsx              # Usa Navbar (Logo, Carrito, Menú móvil, etc.)
    │   ├── page.tsx                # Home / Catálogo principal
    │   ├── categoria/[id]/page.tsx # Filtro por categorías (Plantas, Sustratos, Macetas)
    │   └── checkout/page.tsx       # Checkout y pago online
    │
    ├── (admin)/                    # 🖥️ CANAL MOSTRADOR / POS (Uso Interno)
    │   ├── layout.tsx              # Layout compacto (Barra superior fija 45px)
    │   ├── ventas/page.tsx         # Terminal Punto de Venta (POS Mostrador)
    │   ├── caja/page.tsx           # Resumen y Arqueo Diario de Caja
    │   ├── ventas/historial/       # Reportes e Informes Acumulados
    │   └── productos/page.tsx      # ABM de Productos y Control de Stock
    │
    └── api/                        # Webhooks y endpoints API

    🗄️ Modelo de Datos Centralizado (Prisma Schema)
El control de stock y ventas es unificado. La diferenciación de ingresos se maneja a través del enum SalesChannel.

🗄️ Modelo de Datos Centralizado (Prisma Schema)
El control de stock y ventas es unificado. La diferenciación de ingresos se maneja a través del enum SalesChannel.

📌 Reglas de Desarrollo y Buenas Prácticas
Prevención de Errores de Hidratación (SSR / Client):

El cálculo/formateo de fechas (.toLocaleDateString(), new Date()) y números (.toLocaleString('es-AR')) debe estar controlado mediante el estado de montaje del cliente (mounted) o la directiva suppressHydrationWarning en componentes cliente.

Diseño e Interfaz:

Canal Admin (POS): Vistas compactas sin scroll global (h-[calc(100vh-45px)]), densas en información, botones grandes para cobro rápido y atajos.

Canal Tienda: Interfaz orientada a la experiencia de usuario (UX), componentes adaptables (responsive) y navegación por categorías.

📋 Estado del Proyecto y Hoja de Ruta
🟢 Módulos Completados
[x] Terminal Punto de Venta (POS): Selección de productos, métodos de pago y emisión de comprobantes.

[x] Control y Arqueo de Caja: Vista de totales por medio de pago y comparación de efectivo teórico vs. físico.

[x] Historial e Informes de Ventas: Filtros por rango de fechas, detalle de operaciones y corrección de hidratación.

[x] Navegación Unificada Admin: Integración entre Ventas, Caja y Reportes mediante barra superior fija (45px).

[x] Componente Header / Navbar Tienda: Estructura inicial para el canal público con carrito y perfil.

[x] Arquitectura Base de Rutas: Definición del esquema (tienda) y (admin).

🟡 En Progreso / Siguientes Pasos
[ ] Estructura de Carpetas: Reorganizar físicamente las rutas actuales en (admin) y (tienda).

[ ] Canal Enum en Ventas: Incorporar la propiedad channel (MOSTRADOR / ONLINE) al registrar ventas y en los reportes.

[ ] ABM de Productos y Stock: Pantalla de gestión de productos para actualizar precios y stock centralizado.

[ ] Carrito y Checkout E-commerce: Lógica de carrito persistente y flujo de compra para el cliente online.

[ ] Autenticación & Roles: Distinguir entre usuarios/clientes web y administradores/cajeros.