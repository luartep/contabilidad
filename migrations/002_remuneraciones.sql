-- Fase 2: Remuneraciones
-- Ejecutar en el SQL Editor de Neon después de 001_init.sql

-- Sueldo mínimo por período (IMM)
ALTER TABLE parametros_periodo
  ADD COLUMN IF NOT EXISTS imm NUMERIC(12,2) NOT NULL DEFAULT 510966,
  ADD COLUMN IF NOT EXISTS gratificacion_tipo_default TEXT NOT NULL DEFAULT 'garantizada';
-- imm julio 2026 referencial: $510.966 (ajustar según decreto vigente)

-- Período de remuneraciones por empresa (estado del mes)
CREATE TABLE IF NOT EXISTS periodos_remuneracion (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,           -- 'YYYY-MM'
  estado TEXT NOT NULL DEFAULT 'borrador', -- 'borrador' | 'cerrado'
  gratificacion_tipo TEXT NOT NULL DEFAULT 'garantizada', -- 'garantizada' | 'proporcional'
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, periodo)
);

-- Liquidación individual por trabajador y período
CREATE TABLE IF NOT EXISTS liquidaciones (
  id SERIAL PRIMARY KEY,
  periodo_rem_id INTEGER NOT NULL REFERENCES periodos_remuneracion(id) ON DELETE CASCADE,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,           -- copia desnormalizada para consultas rápidas

  -- Haberes imponibles
  sueldo_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  horas_extra_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  comisiones NUMERIC(12,2) NOT NULL DEFAULT 0,
  bono_imponible NUMERIC(12,2) NOT NULL DEFAULT 0,
  gratificacion NUMERIC(12,2) NOT NULL DEFAULT 0,
  otros_imponibles NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Haberes no imponibles
  colacion NUMERIC(12,2) NOT NULL DEFAULT 0,
  movilizacion NUMERIC(12,2) NOT NULL DEFAULT 0,
  asignacion_familiar NUMERIC(12,2) NOT NULL DEFAULT 0,
  bono_no_imponible NUMERIC(12,2) NOT NULL DEFAULT 0,
  otros_no_imponibles NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Totales haberes
  total_haberes_imponibles NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_haberes_no_imponibles NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_haberes NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Descuentos legales (calculados)
  afp_trabajador NUMERIC(12,2) NOT NULL DEFAULT 0,
  afp_adicional NUMERIC(12,2) NOT NULL DEFAULT 0,   -- comisión AFP
  salud_trabajador NUMERIC(12,2) NOT NULL DEFAULT 0,
  cesantia_trabajador NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto_unico NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Aportes empleador (para Previred, no afectan el líquido)
  cesantia_empleador NUMERIC(12,2) NOT NULL DEFAULT 0,
  sis_empleador NUMERIC(12,2) NOT NULL DEFAULT 0,
  accidente_empleador NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Descuentos voluntarios / otros
  descuentos_varios NUMERIC(12,2) NOT NULL DEFAULT 0,
  anticipo NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Totales descuentos y líquido
  total_descuentos_legales NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_descuentos NUMERIC(12,2) NOT NULL DEFAULT 0,
  liquido_a_pagar NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Metadatos del cálculo
  base_imponible_afp NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_imponible_salud NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_imponible_cesantia NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_tributable NUMERIC(12,2) NOT NULL DEFAULT 0,
  tasa_afp_usada NUMERIC(5,3),
  afp_nombre TEXT,
  sistema_salud_usado TEXT,
  isapre_plan_uf_usado NUMERIC(10,2),
  uf_usada NUMERIC(10,2),
  utm_usada NUMERIC(10,2),
  imm_usado NUMERIC(12,2),

  -- Overrides manuales (si el contador ajusta algo)
  editado_manualmente BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,

  cerrado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (periodo_rem_id, trabajador_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_liquidaciones_periodo ON liquidaciones(periodo);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_trabajador ON liquidaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_periodos_empresa ON periodos_remuneracion(empresa_id);

-- Actualizar config descuentos para incluir más flags
ALTER TABLE config_descuentos
  ADD COLUMN IF NOT EXISTS gratificacion_incluida BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS colacion_monto NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS movilizacion_monto NUMERIC(12,2) DEFAULT 0;
