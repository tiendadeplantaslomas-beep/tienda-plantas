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


    # Documentación Funcional del Sistema — Panel Comercial y Vivero

## 1. Arquitectura y Estructura del Proyecto
El sistema está desarrollado con **Next.js (App Router)** utilizando **Route Groups** bajo la carpeta `app/(admin)/` para aislar las vistas protegidas del panel de control general y la terminal de caja.

### Estructura de Directorios del Sistema
- **`caja/`**: Gestión de tesorería, arqueos de caja y cierres de turno.
- **`compras/`**: Abastecimiento, órdenes de compra y gestión de proveedores.
- **`dashboard/`**: Panel métrico centralizado con gráficos de evolución de ventas sincronizados en tiempo real mediante Prisma.
- **`productos/`**: Catálogo general de artículos, precios, marcas y costos de adquisición.
- **`stock/`**: Control de inventario, ajustes operativos y recepción de remitos.
- **`ventas/`**: Punto de venta (POS) y subcarpeta `historial` de transacciones.
- **`vivero/`**: Módulo botánico especializado en especies, sustratos e insumos específicos.

---

## 2. Roles y Permisos de Acceso
- **ADMIN (Administrador General):** Control total del sistema. Acceso a reportes globales de ventas, gestión de costos, altas de stock, ajustes de inventario y supervisión general.
- **CAJERO (Operador de Terminal):** Acceso restringido al Punto de Venta (POS), registro de cobros de su turno y operaciones operativas de mostrador.

---

## 3. Reglas de Negocio y Lógica de Validación

### A. Módulo de Ventas (`ventas`)
- **Transaccionalidad Atómica:** Las operaciones de venta se ejecutan mediante transacciones atómicas en base de datos (`prisma.$transaction`) para garantizar que el descuento de stock, el registro del cobro y la emisión del comprobante ocurran de forma simultánea e íntegra.
- **Validación de Existencias:** Se bloquea la concreción de la venta si la cantidad solicitada supera el stock disponible del producto.

### B. Módulo de Stock (`stock`)
- **Prevención de Stock Negativo:** Ningún movimiento de salida o ajuste manual puede dejar las existencias de un ítem en valores negativos.
- **Alertas de Umbral Crítico:** Verificación automática de stock bajo frente al mínimo configurado para disparar avisos de reposición.

### C. Módulo de Caja (`caja`)
- **Apertura Obligatoria de Turno:** Se impide registrar cobros o transacciones comerciales si no existe una sesión de caja abierta con un fondo inicial declarado.
- **Control de Cierre:** Validación estricta entre el balance acumulado por el sistema y el efectivo o medios de pago contados en el arqueo físico.

### D. Módulo de Compras (`compras`)
- **Validación de Proveedores:** Restricción para emitir órdenes de compra únicamente a proveedores habilitados en el sistema.
- **Control de Recepción:** Consistencia cruzada entre las cantidades solicitadas en la orden y los remitos ingresados al almacén.

### E. Módulo de Productos (`productos`)
- **Integridad de SKUs:** Control de unicidad estricta en los códigos de identificación de artículos.
- **Margen Comercial:** Validación de que el precio de venta configurado nunca sea inferior al costo de adquisición.

### F. Módulo de Vivero (`vivero`)
- **Trazabilidad Botánica:** Seguimiento de lotes y características particulares de especies vegetales.
- **Compatibilidad de Insumos:** Asociación lógica entre las especies y los sustratos o fertilizantes aptos para su cuidado.


