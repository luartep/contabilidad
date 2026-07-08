# ContaPyme — Fase 1

App de contabilidad para pymes chilenas (uso personal, contador único). Ver `ESPECIFICACION.md`
para el detalle completo del proyecto y el roadmap de fases.

## Qué incluye esta Fase 1
- Autenticación simple (usuario/clave) con cookie firmada.
- CRUD de Empresas.
- CRUD de Trabajadores por empresa (con tipo de contrato, incluyendo honorarios).
- Panel de Parámetros del período (UF, UTM, tabla de impuesto único) — se actualiza cada mes.

## Cómo desplegar

1. **Crear base de datos en Neon** (o usar la integración de Neon directo desde Vercel).
2. **Ejecutar la migración**: abre el SQL Editor de Neon y corre el contenido de
   `migrations/001_init.sql`.
3. **Variables de entorno** en Vercel (Project Settings → Environment Variables):
   - `DATABASE_URL`: la connection string de Neon.
   - `AUTH_SECRET`: cualquier string largo y aleatorio (ej: genera uno con `openssl rand -hex 32`).
   - `APP_USERNAME`: Miguel
   - `APP_PASSWORD`: Miguel3682
4. **Deploy**: conecta este repo a Vercel (o sube el ZIP a un repo de GitHub y luego impórtalo en
   Vercel) y despliega. Framework detectado automáticamente: Next.js.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```

## Próximas fases (ver ESPECIFICACION.md)
- Fase 2: motor de cálculo de liquidaciones + simulador de cotizaciones + PDF.
- Fase 3: generador de archivo Previred (105 campos) y LRE (DT), con apertura de portal.
- Fase 4: F29 (registro manual de ingresos/egresos, IVA).
- Fase 5: Declaraciones juradas DJ 1887 y DJ 1879.
- Fase 6: Recomendaciones (vencimientos, optimización tributaria, flujo de caja, comparativas).
