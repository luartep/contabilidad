-- Fase 5: Declaraciones Juradas
-- Ejecutar en el SQL Editor de Neon después de 004_f29.sql

CREATE TABLE IF NOT EXISTS declaraciones_juradas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- '1887' | '1879'
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'presentada'
  total_informado NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_retenido NUMERIC(14,2) NOT NULL DEFAULT 0,
  cantidad_informados INTEGER NOT NULL DEFAULT 0,
  presentada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, anio, tipo)
);

CREATE TABLE IF NOT EXISTS ddjj_lineas (
  id SERIAL PRIMARY KEY,
  declaracion_id INTEGER NOT NULL REFERENCES declaraciones_juradas(id) ON DELETE CASCADE,
  rut TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  -- DJ 1887 (sueldos)
  monto_renta NUMERIC(14,2) DEFAULT 0,
  impuesto_retenido NUMERIC(14,2) DEFAULT 0,
  meses_trabajados INTEGER DEFAULT 12,
  -- DJ 1879 (honorarios)
  monto_honorarios NUMERIC(14,2) DEFAULT 0,
  retencion_honorarios NUMERIC(14,2) DEFAULT 0,
  -- Común
  tipo TEXT NOT NULL -- '1887' | '1879'
);

CREATE INDEX IF NOT EXISTS idx_ddjj_empresa_anio ON declaraciones_juradas(empresa_id, anio);
