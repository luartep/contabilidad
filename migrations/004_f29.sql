-- Fase 4: F29
-- Ejecutar en el SQL Editor de Neon después de 003_previred_lre.sql

-- Configuración tributaria IVA por empresa
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS regimen_iva TEXT NOT NULL DEFAULT 'general',
  -- 'general'         → IVA normal: débito - crédito
  -- 'pro_pyme_trans'  → Pro Pyme transparente: exento de IVA en ventas
  -- 'primera_categ'   → Primera categoría con PPM
  ADD COLUMN IF NOT EXISTS tasa_ppm NUMERIC(5,2) DEFAULT 0.25, -- % PPM mensual
  ADD COLUMN IF NOT EXISTS actividad_economica TEXT,
  ADD COLUMN IF NOT EXISTS codigo_actividad TEXT;              -- código SII

-- Período F29 por empresa
CREATE TABLE IF NOT EXISTS periodos_f29 (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,                -- 'YYYY-MM'
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'presentado'
  -- IVA
  debito_fiscal NUMERIC(14,2) NOT NULL DEFAULT 0,
  credito_fiscal NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva_a_pagar NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- PPM
  ppm_base NUMERIC(14,2) NOT NULL DEFAULT 0,
  ppm_monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Retenciones (honorarios pagados a terceros)
  retenciones_honorarios NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Impuesto único trabajadores (si se declara vía F29)
  impuesto_unico_trab NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Total a pagar
  total_a_pagar NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Remanente crédito fiscal (cuando crédito > débito)
  remanente_credito NUMERIC(14,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, periodo)
);

-- Documentos individuales del RCV (ventas y compras)
CREATE TABLE IF NOT EXISTS documentos_f29 (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'venta' | 'compra' | 'honorario_recibido'
  tipo_documento TEXT NOT NULL,
  -- 'factura'              → Factura afecta (con IVA)
  -- 'factura_exenta'       → Factura exenta (sin IVA)
  -- 'boleta'               → Boleta afecta
  -- 'boleta_exenta'        → Boleta exenta
  -- 'nota_debito'          → Nota de débito
  -- 'nota_credito'         → Nota de crédito (resta del total)
  -- 'liquidacion_factura'  → Liquidación-Factura
  -- 'boleta_honorarios'    → Boleta de honorarios
  folio TEXT,
  rut_contraparte TEXT,
  razon_social_contraparte TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_neto NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_exento NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  retencion_honorario NUMERIC(14,2) NOT NULL DEFAULT 0, -- solo boletas de honorarios
  es_nota_credito BOOLEAN NOT NULL DEFAULT false, -- si es NC, resta del débito/crédito
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_f29_empresa_periodo ON documentos_f29(empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_periodos_f29_empresa ON periodos_f29(empresa_id);
