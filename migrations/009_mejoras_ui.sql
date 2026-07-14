-- Migración 009: Mejoras UI — notas internas, columnas adicionales
-- Ejecutar después de 008_modulos_adicionales.sql

-- Notas internas por empresa (texto libre para el contador)
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- Índice para búsqueda rápida por razón social y RUT
CREATE INDEX IF NOT EXISTS idx_empresas_razon_social ON empresas USING gin(to_tsvector('spanish', razon_social));
CREATE INDEX IF NOT EXISTS idx_empresas_rut ON empresas(rut);
