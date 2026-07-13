-- Fase 7: Activos fijos, depreciación, conciliación bancaria
-- Ejecutar después de 006_rrhh_contabilidad.sql

-- ============================================================
-- ACTIVOS FIJOS Y DEPRECIACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS activos_fijos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL,
  -- 'maquinaria'|'vehiculo'|'muebles'|'equipos_computacion'|'edificio'|'otro'
  numero_serie TEXT,
  fecha_adquisicion DATE NOT NULL,
  valor_adquisicion NUMERIC(14,2) NOT NULL,
  valor_residual NUMERIC(14,2) NOT NULL DEFAULT 0,
  vida_util_anios INTEGER NOT NULL,          -- SII define vida útil por categoría
  metodo_depreciacion TEXT NOT NULL DEFAULT 'lineal', -- 'lineal' | 'acelerada'
  cuenta_activo TEXT,                        -- código plan de cuentas
  cuenta_depreciacion TEXT,                  -- código cuenta gasto depreciación
  cuenta_dep_acumulada TEXT,                 -- código cuenta depreciación acumulada
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_baja DATE,
  valor_baja NUMERIC(14,2),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS depreciaciones (
  id SERIAL PRIMARY KEY,
  activo_id INTEGER NOT NULL REFERENCES activos_fijos(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,              -- 'YYYY-MM'
  monto_depreciacion NUMERIC(14,2) NOT NULL,
  depreciacion_acumulada NUMERIC(14,2) NOT NULL,
  valor_libro NUMERIC(14,2) NOT NULL,
  voucher_id INTEGER REFERENCES vouchers(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activo_id, periodo)
);

-- Vidas útiles SII Chile (referencia)
-- maquinaria: 15 años, vehículo: 7, muebles: 7, equipos computación: 6, edificio: 40

-- ============================================================
-- CONCILIACIÓN BANCARIA
-- ============================================================
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  banco TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'corriente', -- 'corriente'|'ahorro'|'vista'
  cuenta_contable TEXT,  -- código del plan de cuentas (ej: 1.1.02)
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos_bancarios (
  id SERIAL PRIMARY KEY,
  cuenta_bancaria_id INTEGER NOT NULL REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  numero_doc TEXT,
  cargo NUMERIC(14,2) NOT NULL DEFAULT 0,    -- egreso del banco
  abono NUMERIC(14,2) NOT NULL DEFAULT 0,    -- ingreso al banco
  saldo NUMERIC(14,2),                       -- saldo del estado de cuenta
  conciliado BOOLEAN NOT NULL DEFAULT false,
  voucher_id INTEGER REFERENCES vouchers(id),
  origen TEXT NOT NULL DEFAULT 'cartola',    -- 'cartola' | 'manual'
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta_periodo ON movimientos_bancarios(cuenta_bancaria_id, periodo);
CREATE INDEX IF NOT EXISTS idx_activos_empresa ON activos_fijos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_depreciaciones_periodo ON depreciaciones(empresa_id, periodo);
