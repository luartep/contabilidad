-- Fase 3: Previred + LRE
-- Ejecutar en el SQL Editor de Neon después de 002_remuneraciones.sql

-- APV por trabajador (cotizaciones voluntarias)
CREATE TABLE IF NOT EXISTS apv_trabajador (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE UNIQUE,
  tiene_apv BOOLEAN NOT NULL DEFAULT false,
  modalidad TEXT, -- 'A' (con beneficio tributario) | 'B' (sin beneficio)
  monto_apv NUMERIC(12,2) DEFAULT 0,
  institucion_apv TEXT, -- AFP, banco, compañía de seguros
  codigo_institucion TEXT -- código Previred de la institución APV
);

-- Registro de archivos generados (trazabilidad)
CREATE TABLE IF NOT EXISTS archivos_generados (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'previred' | 'lre'
  nombre_archivo TEXT NOT NULL,
  generado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado BOOLEAN NOT NULL DEFAULT false,
  enviado_en TIMESTAMPTZ
);

-- Campos adicionales en trabajadores para Previred
ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS nacionalidad TEXT DEFAULT 'CHL',
  ADD COLUMN IF NOT EXISTS sexo TEXT, -- 'M' | 'F'
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS discapacidad BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pensionado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trabajador_joven BOOLEAN DEFAULT false; -- contrato empleo joven
