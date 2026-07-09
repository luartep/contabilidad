# ContaPyme — App de Contabilidad para Contador (Chile 2026)

## 1. Resumen
Aplicación web de uso personal para Miguel (contador), montada en Vercel, para llevar la
contabilidad mensual/anual de sus empresas clientes (pymes). Cubre remuneraciones (con
generación de archivo Previred y Libro de Remuneraciones Electrónico), F29 (ingresos/egresos
e IVA), declaraciones juradas de renta (DJ 1887 y DJ 1879) y recomendaciones automáticas
(vencimientos, optimización tributaria excepto IVA, flujo de caja, comparativas mensuales).

## 2. Decisiones ya tomadas
- **Uso**: solo Miguel. Sin multiusuario, sin roles, sin planes de pago.
- **Auth**: usuario/clave simple (Miguel / Miguel3682), sesión vía cookie firmada (Web Crypto API, Edge-compatible), sin 2FA.
- **Empresas**: cada una independiente (cliente del contador). Datos mínimos, sin exigir todo el detalle SII de entrada.
- **Previred / LRE (DT)**: no existe API oficial → la app genera el archivo con el formato exacto exigido y abre el portal correspondiente en pestaña nueva para carga manual.
- **F29 / RCV**: por ahora ingreso manual de totales de compras/ventas/IVA (arquitectura preparada para conectar en el futuro un proveedor pagado tipo BaseAPI/ApiPyme sin tener que rediseñar el modelo de datos).
- **Declaraciones juradas**: DJ 1887 (sueldos) y DJ 1879 (honorarios) únicamente, por ahora.
- **Recomendaciones**: vencimientos, optimización tributaria (excluye IVA), flujo de caja, comparativas mes a mes. Motor de reglas + opción de usar la API de Claude para redactar sugerencias.
- **Sin firma electrónica.**
- **Stack**: Next.js (App Router) + TypeScript + Tailwind CSS v4 + Neon Postgres + Vercel, igual que tus otros proyectos.
- **Parámetros legales (UF, UTM, tramos impuesto único, tasas AFP/salud/cesantía, topes imponibles)**: se guardan en tablas editables en un panel de "Parámetros del período", porque cambian mes a mes. La app no los hardcodea; tú los actualizas (o los cargas desde un valor de referencia) antes de calcular cada período.

## 3. Normativa vigente investigada (base para el modelo de datos)

### Previred
- Formato **Estándar 105 campos**, por separador (recomendado) o por posición.
- Extensión TXT/CSV/ZIP. Campos numéricos rellenos con ceros a la izquierda, alfanuméricos con blancos a la derecha.
- Reforma previsional (Ley 21.735): 1% adicional de cargo del empleador se reparte en campo 28 (0,1%, cotización obligatoria AFP) y campo 94 (0,9%, cotización Expectativa de Vida).
- No se puede abrir/guardar el TXT con Excel (rompe ceros a la izquierda).
- Flujo: la app genera el TXT → botón "Abrir Previred" (nueva pestaña) → el contador sube el archivo manualmente.

### Libro de Remuneraciones Electrónico (LRE — Dirección del Trabajo)
- Obligatorio para empleadores con 5+ trabajadores.
- Declaración mensual dentro de los primeros 15 días hábiles del mes siguiente, vía portal "Mi DT" (Clave Única).
- Archivo CSV o TXT delimitado por `;`, con headers fijos — no se pueden agregar ni quitar columnas.
- Estructura: datos del trabajador, haberes (imponible/tributable, imponible/no tributable, etc.), descuentos, aportes del empleador, totales.
- Flujo: igual que Previred — generar archivo exacto + abrir portal DT en pestaña nueva.

### F29 / Registro de Compras y Ventas (SII)
- El RCV es la fuente que arma la propuesta del F29 (IVA a pagar = Débito Fiscal − Crédito Fiscal).
- No hay API oficial del SII; existen terceros pagados (screen scraping autenticado) — **fuera de alcance por ahora**, se ingresan totales manualmente por período y por empresa.
- El modelo de datos debe guardar documentos/línea (o al menos totales por tipo de documento) para no tener que rediseñar cuando se agregue integración.

### Impuesto Único de Segunda Categoría
- Tramo exento: hasta 13,5 UTM de renta líquida imponible mensual.
- 8 tramos progresivos (4% a 40%), fórmula: `Impuesto = (Base × Factor) − Rebaja`.
- La tabla cambia cada mes según la UTM vigente (publicada por el SII vía Circular). Se carga en el panel de parámetros del período.

### Cotizaciones previsionales 2026
- AFP: 10% + comisión variable (0,46% a 1,45% según AFP), tope 90 UF.
- Salud: 7% mínimo (Fonasa) o plan pactado en UF si es Isapre (lo que sea mayor), tope 90 UF.
- Seguro de cesantía (AFC): contrato indefinido → 0,6% trabajador + 2,4% empleador; contrato plazo fijo/obra → 3% empleador, trabajador no aporta. Tope 135,2 UF.
- SIS (seguro invalidez y sobrevivencia): de cargo del empleador, tasa variable.
- Boletas de honorarios: no llevan Previred, van con retención de Primera Categoría / Segunda Categoría, PPM cuando corresponde.

## 4. Módulos funcionales

1. **Empresas** — alta/edición de empresas cliente, período contable independiente por empresa.
2. **Trabajadores** — ficha por empresa, tipo de contrato (indefinido, plazo fijo, por obra, honorarios), AFP, sistema de salud, variables de sueldo (todas opcionales y configurables por trabajador).
3. **Remuneraciones** — cálculo mensual con haberes/descuentos configurables, simulador de cotizaciones antes de generar archivo final, liquidaciones en PDF, boletas de honorarios (registro, no timbraje SII automático), finiquitos.
4. **Previred** — generador de archivo 105 campos + apertura de portal.
5. **LRE** — generador de archivo CSV/TXT formato DT + apertura de portal Mi DT.
6. **F29** — registro manual de ingresos/egresos con IVA débito/crédito, manejo de distintos regímenes de IVA, resumen para declarar.
7. **Declaraciones juradas** — generación de DJ 1887 (sueldos) y DJ 1879 (honorarios) a partir de los datos de remuneraciones/honorarios del año.
8. **Recomendaciones** — alertas de vencimientos (F29, Previred, LRE), optimización tributaria (sin IVA), alertas de flujo de caja, comparativa mes a mes por empresa.
9. **Parámetros del período** — panel para actualizar UF, UTM, tabla de impuesto único, tasas AFP/salud/cesantía y topes imponibles, mes a mes.

## 5. Roadmap de construcción (fases)

- **Fase 1 — Fundaciones**: proyecto Next.js + Neon, autenticación, CRUD de Empresas, CRUD de Trabajadores, panel de Parámetros del período.
- **Fase 2 — Remuneraciones**: motor de cálculo de liquidaciones (con descuentos opcionales/editables), simulador de cotizaciones, liquidaciones PDF.
- **Fase 3 — Previred + LRE**: generadores de archivo exactos + botones de apertura de portal.
- **Fase 4 — F29**: registro manual de documentos/ingresos-egresos, cálculo IVA, distintos regímenes.
- **Fase 5 — Declaraciones juradas**: DJ 1887 y DJ 1879.
- **Fase 6 — Recomendaciones**: motor de reglas + alertas + comparativas.

Empezamos por la Fase 1.
