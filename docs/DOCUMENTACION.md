# 🪴 Sistema de Gestión para Vivero - Documentación Funcional y Técnica

Este documento consolida la arquitectura, reglas de negocio y flujos operativos de los módulos desarrollados en el sistema.

---

## 1. Módulo de Productos (`/productos`)

### 🎯 Objetivo
Gestionar el catálogo de productos, definiendo la ficha técnica de cada artículo, sus costos base, márgenes de ganancia e indicadores de inventario.

### ⚙️ Reglas de Negocio
* **Mayúsculas Automáticas:** Todo texto ingresado (código, nombre) se transforma a mayúsculas en tiempo real y antes de guardarse en la base de datos.
* **Cálculo de Precio de Venta:** El precio final se calcula automáticamente con la fórmula:
  $$\text{Precio Final} = \text{Math.round}\left((\text{Costo Base} + \text{Otros Costos}) \times \left(1 + \frac{\text{Margen \%}}{100}\right)\right)$$
* **Generación de Código:** Permite la creación manual o la generación automática con formato `PRD-XXXX`.
* **Carga Masiva:** Soporta la importación por lotes para alta y actualización masiva de artículos.

### 💡 Caso de Uso Principal
Entrar a este módulo **únicamente** para dar de alta nuevos productos, corregir descripciones o ajustar el porcentaje de margen de ganancia ($GB\%$).

---

## 2. Módulo de Control de Stock (`/stock`)

### 🎯 Objetivo
Monitorear la disponibilidad física de mercadería en tiempo real, controlar puntos de reposición (stock mínimo) y registrar ajustes o mermas con trazabilidad completa.

### ⚙️ Reglas de Negocio
* **Estados de Stock:**
  * **Stock Actual (`stock`):** Cantidad de unidades físicas disponibles hoy.
  * **Stock Mínimo (`minStock`):** Umbral que activa alertas visuales de stock crítico para reposición.
  * **Control de Stock (`trackStock`):** Interruptor booleano para habilitar/deshabilitar el descuento automático.
* **Trazabilidad (`StockMovement`):** Todo cambio en el stock genera un registro imborrable con:
  * Fecha y hora exacta.
  * Tipo de movimiento: Entrada (`IN`), Salida/Merma (`OUT`), Ajuste de Inventario (`ADJUSTMENT`).
  * Stock previo, cantidad modificada y stock resultante.
  * Nota explicativa del movimiento.

### 💡 Caso de Uso Principal
Pantalla de **operación y control diario**. Se utiliza para verificar disponibilidad, registrar mermas (plantas dañadas, macetas rotas) o realizar el conteo físico de inventario.

---

## 3. Módulo de Ingreso de Compras (`/compras`)

### 🎯 Objetivo
Registrar la recepción de mercadería mediante comprobantes (Facturas, Remitos, Presupuestos), actualizando automáticamente los costos del producto y sumando existencias al stock.

### ⚙️ Reglas de Negocio
* **Prorrateo de Flete/Gastos Varios:** Los costos adicionales del comprobante (flete, acarreo) se dividen equitativamente entre el total de unidades físicas ingresadas:
  $$\text{Flete por Unidad} = \text{Math.round}\left(\frac{\text{Total Gastos Varios}}{\text{Total de Unidades del Comprobante}}\right)$$
  $$\text{Costo Final por Unidad} = \text{Costo Base} + \text{Flete por Unidad}$$
* **Alta Rápida de Proveedores:** Permite crear proveedores en vivo desde el mismo formulario mediante un pop-over inline. Los datos de proveedores se limitan estrictamente a `Nombre` y `Teléfono` (convertidos a mayúsculas).
* **Actualización Automática:** Al guardar el comprobante:
  1. Se impacta el costo base y costo final en el producto.
  2. Se suma la cantidad ingresada al `stock` del producto automáticamente.
  3. Se genera un registro de movimiento de entrada (`IN`) en la trazabilidad de stock.
* **Limpieza de Formulario:** Tras una carga exitosa, el sistema resetea los datos generales del comprobante y la grilla de ítems.

### 💡 Caso de Uso Principal
Carga de comprobantes de proveedores cuando ingresa mercadería al local/vivero.