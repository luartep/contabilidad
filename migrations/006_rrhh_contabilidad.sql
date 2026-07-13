-- Fase 6: RRHH completo + Contabilidad general
-- Ejecutar en el SQL Editor de Neon después de 005_ddjj.sql

-- ============================================================
-- MÓDULO VACACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS vacaciones (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'tomada' | 'progresiva' | 'pendiente_pago'
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_habiles INTEGER NOT NULL DEFAULT 0,
  dias_corridos INTEGER NOT NULL DEFAULT 0,
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columnas a trabajadores para control vacaciones
ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS dias_vacaciones_base INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS feriado_progresivo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anios_servicio_feriado INTEGER DEFAULT 0;

-- ============================================================
-- MÓDULO PRÉSTAMOS Y ANTICIPOS
-- ============================================================
CREATE TABLE IF NOT EXISTS prestamos (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'prestamo', -- 'prestamo' | 'anticipo'
  monto_total NUMERIC(12,2) NOT NULL,
  cuotas INTEGER NOT NULL DEFAULT 1,
  cuota_mensual NUMERIC(12,2) NOT NULL,
  cuotas_pagadas INTEGER NOT NULL DEFAULT 0,
  saldo_pendiente NUMERIC(12,2) NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuotas descontadas por liquidación
CREATE TABLE IF NOT EXISTS prestamo_cuotas (
  id SERIAL PRIMARY KEY,
  prestamo_id INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  liquidacion_id INTEGER REFERENCES liquidaciones(id),
  pagado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MÓDULO CARGAS FAMILIARES
-- ============================================================
CREATE TABLE IF NOT EXISTS cargas_familiares (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'hijo' | 'conyuge' | 'madre_hijo' | 'otro'
  nombre TEXT NOT NULL,
  rut TEXT,
  fecha_nacimiento DATE,
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tramos asignación familiar (cambian según IMM — se actualizan en parámetros)
ALTER TABLE parametros_periodo
  ADD COLUMN IF NOT EXISTS af_tramo1_hasta NUMERIC(12,2) DEFAULT 391384,
  ADD COLUMN IF NOT EXISTS af_tramo1_monto NUMERIC(10,2) DEFAULT 16443,
  ADD COLUMN IF NOT EXISTS af_tramo2_hasta NUMERIC(12,2) DEFAULT 572259,
  ADD COLUMN IF NOT EXISTS af_tramo2_monto NUMERIC(10,2) DEFAULT 10121,
  ADD COLUMN IF NOT EXISTS af_tramo3_hasta NUMERIC(12,2) DEFAULT 893645,
  ADD COLUMN IF NOT EXISTS af_tramo3_monto NUMERIC(10,2) DEFAULT 3207,
  ADD COLUMN IF NOT EXISTS af_tramo4_monto NUMERIC(10,2) DEFAULT 0;

-- ============================================================
-- MÓDULO FINIQUITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS finiquitos (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha_termino DATE NOT NULL,
  causal TEXT NOT NULL,
  -- Causal: 'art_159_1' necesidades empresa, 'art_159_2' caso fortuito,
  --         'art_159_3' no renovacion, 'art_159_4' vencimiento plazo,
  --         'art_159_5' conclusion obra, 'art_160' despido con causa,
  --         'art_161' necesidades empresa (con indemnizacion), 'renuncia'
  -- Cálculos
  anios_servicio NUMERIC(5,2) NOT NULL DEFAULT 0,
  sueldo_base_promedio NUMERIC(12,2) NOT NULL DEFAULT 0,
  indemnizacion_anios NUMERIC(12,2) NOT NULL DEFAULT 0,
  indemnizacion_anios_meses NUMERIC(12,2) NOT NULL DEFAULT 0, -- sustitutiva aviso previo
  aviso_previo NUMERIC(12,2) NOT NULL DEFAULT 0,
  vacaciones_pendientes_dias NUMERIC(6,2) NOT NULL DEFAULT 0,
  vacaciones_pendientes_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  proporcional_mes NUMERIC(12,2) NOT NULL DEFAULT 0,
  otros_haberes NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuentos_finiquito NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_finiquito NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'firmado'
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MÓDULO CONTABILIDAD GENERAL (DOBLE ENTRADA)
-- ============================================================

-- Plan de cuentas por empresa
CREATE TABLE IF NOT EXISTS plan_cuentas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,          -- '1.1.01', '4.1.02', etc.
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,            -- 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
  subtipo TEXT,                  -- 'corriente' | 'no_corriente' | 'operacional' | etc.
  cuenta_padre TEXT,             -- código del padre (para árbol)
  es_imputable BOOLEAN NOT NULL DEFAULT true, -- false = solo agrupadora
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- Vouchers / comprobantes contables
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,         -- 'YYYY-MM'
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  numero INTEGER NOT NULL,       -- correlativo por empresa+periodo
  tipo TEXT NOT NULL DEFAULT 'diario', -- 'diario' | 'compra' | 'venta' | 'remuneracion' | 'ajuste' | 'cierre'
  glosa TEXT NOT NULL,
  total_debe NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_haber NUMERIC(14,2) NOT NULL DEFAULT 0,
  cuadrado BOOLEAN NOT NULL DEFAULT false, -- debe == haber
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, periodo, numero)
);

-- Líneas de voucher (asientos contables)
CREATE TABLE IF NOT EXISTS voucher_lineas (
  id SERIAL PRIMARY KEY,
  voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  cuenta_codigo TEXT NOT NULL,
  cuenta_nombre TEXT NOT NULL,
  glosa TEXT,
  debe NUMERIC(14,2) NOT NULL DEFAULT 0,
  haber NUMERIC(14,2) NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vouchers_empresa_periodo ON vouchers(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_voucher_lineas_cuenta ON voucher_lineas(cuenta_codigo);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_empresa ON plan_cuentas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vacaciones_trabajador ON vacaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_trabajador ON prestamos(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_cargas_trabajador ON cargas_familiares(trabajador_id);
