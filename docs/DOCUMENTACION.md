# 🌿 Tienda de Plantas - Sistema Integrado ERP / CRM / E-commerce & PMO

Sistema integral full-stack desarrollado para la gestión omnicanal de viveros, abarcando desde el control de inventario y cultivo, pasando por el punto de venta (POS) y la tienda web (E-commerce), hasta la logística de entrega y la gestión ágil de proyectos (PMO).

---

## 🚀 1. Stack Tecnológico

* **Framework Full-Stack:** Next.js (App Router) con TypeScript.
* **Estilos y UI:** Tailwind CSS para un diseño responsivo y moderno.
* **Base de Datos & ORM:** TiDB Cloud (SQL Distribuido) gestionado mediante Prisma ORM.
* **Autenticación:** NextAuth.js con autenticación basada en credenciales y cifrado `bcryptjs`.
* **Gestión de Proyectos:** Integración nativa con Jira Cloud REST API para automatización PMO.

---

## 📂 2. Arquitectura de Módulos del Sistema

### A. Autenticación y Control de Accesos (RBAC)
* **Padrón Centralizado (`Customer`):** Almacena tanto a clientes finales como al personal interno en una sola tabla relacional utilizando un campo de rol dinámico (`role`).
* **Roles del Personal Interno:**
  * `ADMIN`: Acceso total al sistema, configuración general y administración de usuarios.
  * `CAJERO`: Acceso exclusivo al terminal POS, caja diaria y registro de cobros.
  * `OPERADOR`: Gestión de atención omnicanal y seguimiento de clientes.
  * `DEPOSITO`: Control de stock, recepción de mercadería y preparación de envíos.
* **Perfiles de Clientes:** `cliente_web` (E-commerce), `cliente_presencial` (Mostrador) y `cliente_pos`.

### B. ERP e Inventario de Vivero
* **Fichas Técnicas Botánicas:** Registro detallado de especies de interior y exterior, requerimientos lumínicos, riego, sustratos y fertilizantes.
* **Control de Stock en Tiempo Real:** Descuento automático de inventario ante transacciones web o presenciales.
* **Alertas y Lotes:** Gestión de stock mínimo y control de mermas o producción.

### C. CRM y Gestión Omnicanal
* **Fichas de Compradores:** Historial comercial, direcciones de envío y preferencias de jardinería.
* **Etiquetado Visual (Badges):** Identificación inmediata del canal de origen de cada interacción o venta.

### D. E-commerce y Punto de Venta (POS)
* **Tienda Pública Web:** Catálogo visual con filtros avanzados por tipo de planta y cuidados.
* **Terminal POS (Mostrador):** Interfaz optimizada para el cobro rápido en tienda física, emisión de comprobantes y selección de medios de pago (efectivo, transferencia, tarjetas).

### E. Logística y Distribución
* **Planificador de Envíos:** Agrupamiento de despachos por zonas y estados de trazabilidad (`Preparando`, `En Camino`, `Entregado`).
* **Hojas de Ruta:** Generación de reportes de entrega para transportistas con instrucciones de manipulación vegetal.

### F. Integración PMO / Jira
* **Tablero y Listado Paginado:** Consumo de tickets desde la API de Jira Cloud.
* **Creación Jerárquica:** Alta asistida de Épicas, Historias de Usuario, Tareas y Subtareas validando relaciones padre/hijo.
* **Ejecutor Masivo de Scripts (TXTaJira):** Modal interactivo para la importación y carga secuencial de backlogs mediante archivos JSON/TXT.

---

## 🛠️ 3. Configuración y Despliegue Local

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone <url-repositorio>
   cd tienda-de-plantas
   npm install

###  MEJORAS 28/09/2026
   ## Módulo: Panel de Control (Dashboard Admin)

### 1. Descripción General
El Panel de Control principal (`/dashboard`) ha sido refactorizado para eliminar por completo los valores estáticos o *hardcodeados*. Ahora opera de manera 100% dinámica mediante consultas en tiempo real a la base de datos (TiDB), garantizando la sincronización automática de la información del usuario y las métricas operativas del negocio.

---

### 2. Especificaciones Técnicas y Funcionales

#### A. Sincronización del Perfil de Usuario (`Usuario Activo`)
* **Comportamiento previo:** La interfaz utilizaba exclusivamente los datos de la cookie inicial de la sesión de NextAuth (`useSession`), lo cual impedía ver reflejados los cambios de nombre, correo o avatar de forma inmediata tras modificar el perfil sin requerir un nuevo inicio de sesión.
* **Comportamiento actual:** Se implementó una llamada asíncrona al endpoint `/api/admin/perfil` durante la carga del dashboard, asegurando que:
  * El nombre y correo electrónico se actualicen dinámicamente desde la base de datos.
  * La imagen o avatar refleje instantáneamente cualquier actualización realizada por el usuario en su perfil.

#### B. Dinamización del Panel de Actividad y Estado de Caja
Se eliminaron todos los valores estáticos en la sección lateral de actividad, integrando un nuevo servicio backend (`/api/admin/dashboard-stats`) que alimenta las siguientes métricas en tiempo real:

1. **Arqueo de Turno (Estado de Caja):**
   * **Lógica implementada:** El sistema consulta la tabla `CashClosure` filtrando por la fecha actual del sistema (`YYYY-MM-DD`).
   * **Indicadores visuales:**
     * *Al Día (Verde):* Se registra un cierre completado para el día de la fecha.
     * *Abierta / Pendiente (Amarillo/Alerta):* No existe registro de cierre para el día actual, advirtiendo al operador que la caja sigue abierta.
2. **Métrica de Facturas (Ventas):**
   * Consulta el conteo real y actualizado de registros en la tabla `Sale` de la base de datos.
3. **Métrica de Pedidos (Compras):**
   * Consulta el conteo real y actualizado de órdenes de abastecimiento en la tabla `Purchase`.

---

### 3. Endpoints Asociados
* **`GET /api/admin/dashboard-stats`**: Retorna el estado de la caja de hoy (`cajaPendiente`), el total de facturas (`facturasCount`) y el total de pedidos (`pedidosCount`).
* **`GET /api/admin/perfil`**: Provee los datos actualizados del usuario activo para el panel lateral y la vista de perfil.