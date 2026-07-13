-- Fase 8: Centros de costo, boletas honorarios, DTE, IVA proporcional
-- Ejecutar después de 007_activos_conciliacion.sql

-- ============================================================
-- CENTROS DE COSTO
-- ============================================================
CREATE TABLE IF NOT EXISTS centros_costo (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'proyecto', -- 'proyecto' | 'sucursal' | 'departamento' | 'otro'
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, codigo)
);

-- Asignación de centros de costo a líneas de voucher
ALTER TABLE voucher_lineas
  ADD COLUMN IF NOT EXISTS centro_costo_id INTEGER REFERENCES centros_costo(id);

-- Asignación de centros de costo a liquidaciones
ALTER TABLE liquidaciones
  ADD COLUMN IF NOT EXISTS centro_costo_id INTEGER REFERENCES centros_costo(id);

-- ============================================================
-- BOLETAS DE HONORARIOS ELECTRÓNICAS (REGISTRO)
-- ============================================================
CREATE TABLE IF NOT EXISTS boletas_honorarios (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  -- Tipo: emitida (empresa emite a cliente) | recibida (empresa recibe de prestador)
  tipo TEXT NOT NULL DEFAULT 'emitida',
  periodo TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  folio TEXT,
  -- Prestador (si emitida = el trabajador o tú; si recibida = el prestador externo)
  rut_prestador TEXT NOT NULL,
  nombre_prestador TEXT NOT NULL,
  -- Pagador
  rut_pagador TEXT,
  nombre_pagador TEXT,
  -- Montos
  monto_bruto NUMERIC(12,2) NOT NULL,
  tasa_retencion NUMERIC(5,2) NOT NULL DEFAULT 13.75,
  monto_retencion NUMERIC(12,2) NOT NULL,
  monto_liquido NUMERIC(12,2) NOT NULL,
  -- Estado
  estado TEXT NOT NULL DEFAULT 'emitida', -- 'emitida' | 'pagada' | 'anulada'
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boletas_empresa_periodo ON boletas_honorarios(empresa_id, periodo);

-- ============================================================
-- IVA PROPORCIONAL (PRORRATA)
-- ============================================================
ALTER TABLE periodos_f29
  ADD COLUMN IF NOT EXISTS prorrata_iva NUMERIC(5,4) DEFAULT 1.0,
  -- Proporción de crédito fiscal recuperable (ventas afectas / ventas totales)
  ADD COLUMN IF NOT EXISTS credito_recuperable NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_irrecuperable NUMERIC(14,2) DEFAULT 0;

-- ============================================================
-- DOCUMENTOS TRIBUTARIOS ELECTRÓNICOS (DTE)
-- ============================================================
CREATE TABLE IF NOT EXISTS folios_dte (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_dte INTEGER NOT NULL,  -- 33=Factura, 34=Exenta, 39=Boleta, 56=ND, 61=NC, etc.
  folio_desde INTEGER NOT NULL,
  folio_hasta INTEGER NOT NULL,
  folio_actual INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  vencimiento DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo_dte)
);

CREATE TABLE IF NOT EXISTS documentos_dte (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_dte INTEGER NOT NULL,
  tipo_nombre TEXT NOT NULL,      -- 'Factura Afecta', 'Boleta', etc.
  folio INTEGER NOT NULL,
  periodo TEXT NOT NULL,
  fecha DATE NOT NULL,
  rut_receptor TEXT,
  razon_social_receptor TEXT,
  monto_neto NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_exento NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'vigente', -- 'vigente' | 'anulado'
  referencia_id INTEGER REFERENCES documentos_dte(id), -- para NC/ND
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, tipo_dte, folio)
);

CREATE INDEX IF NOT EXISTS idx_dte_empresa_periodo ON documentos_dte(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_dte_empresa_tipo ON documentos_dte(empresa_id, tipo_dte);
