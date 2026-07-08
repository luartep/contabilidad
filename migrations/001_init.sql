-- ContaPyme - Migración inicial
-- Ejecutar en el SQL Editor de Neon, en orden.

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  rut TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  nombre_fantasia TEXT,
  giro TEXT,
  regimen_tributario TEXT, -- 'pro_pyme', 'renta_atribuida', 'semi_integrado', 'otro'
  representante_legal TEXT,
  direccion TEXT,
  email_contacto TEXT,
  telefono_contacto TEXT,
  mutualidad TEXT, -- ACHS, Mutual CChC, IST, ISL, etc. (para Previred)
  tasa_accidentes NUMERIC(5,2) DEFAULT 0.95,
  caja_compensacion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trabajadores (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rut TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  tipo_contrato TEXT NOT NULL, -- 'indefinido', 'plazo_fijo', 'por_obra', 'honorarios'
  cargo TEXT,
  fecha_ingreso DATE,
  fecha_termino DATE,
  afp TEXT, -- null si es honorarios
  sistema_salud TEXT, -- 'fonasa' | 'isapre' | null
  isapre_plan_uf NUMERIC(10,2), -- si sistema_salud = 'isapre'
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, rut)
);

-- Variables de sueldo por trabajador: todo opcional, un registro por concepto activo.
-- Permite que cada trabajador tenga solo los haberes que le apliquen.
CREATE TABLE IF NOT EXISTS variables_sueldo (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL, -- 'sueldo_base','gratificacion','horas_extra','comisiones','bono','colacion','movilizacion','asignacion_familiar', etc.
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  es_imponible BOOLEAN NOT NULL DEFAULT true,
  es_tributable BOOLEAN NOT NULL DEFAULT true,
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta DATE
);

-- Configuración de descuentos legales por trabajador: permite marcar cuáles se
-- calculan automáticamente y cuáles maneja el contador manualmente.
CREATE TABLE IF NOT EXISTS config_descuentos (
  id SERIAL PRIMARY KEY,
  trabajador_id INTEGER NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE UNIQUE,
  afp_automatico BOOLEAN NOT NULL DEFAULT true,
  salud_automatico BOOLEAN NOT NULL DEFAULT true,
  cesantia_automatico BOOLEAN NOT NULL DEFAULT true,
  impuesto_automatico BOOLEAN NOT NULL DEFAULT true
);

-- Parámetros legales por período (mes/año). Se cargan/actualizan manualmente
-- porque UF, UTM, tramos y tasas cambian mes a mes.
CREATE TABLE IF NOT EXISTS parametros_periodo (
  id SERIAL PRIMARY KEY,
  periodo TEXT NOT NULL UNIQUE, -- formato 'YYYY-MM'
  uf NUMERIC(10,2) NOT NULL,
  utm NUMERIC(10,2) NOT NULL,
  tope_imponible_afp_salud_uf NUMERIC(6,2) NOT NULL DEFAULT 90.0,
  tope_imponible_cesantia_uf NUMERIC(6,2) NOT NULL DEFAULT 135.2,
  tasa_afc_indefinido_trabajador NUMERIC(5,3) NOT NULL DEFAULT 0.6,
  tasa_afc_indefinido_empleador NUMERIC(5,3) NOT NULL DEFAULT 2.4,
  tasa_afc_plazo_fijo_empleador NUMERIC(5,3) NOT NULL DEFAULT 3.0,
  tasa_salud_fonasa NUMERIC(5,3) NOT NULL DEFAULT 7.0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tramos del impuesto único de segunda categoría, por período.
CREATE TABLE IF NOT EXISTS tramos_impuesto_unico (
  id SERIAL PRIMARY KEY,
  periodo TEXT NOT NULL REFERENCES parametros_periodo(periodo) ON DELETE CASCADE,
  tramo INTEGER NOT NULL,
  desde NUMERIC(14,2) NOT NULL,
  hasta NUMERIC(14,2), -- null = sin tope (último tramo)
  factor NUMERIC(5,4) NOT NULL,
  rebaja NUMERIC(14,2) NOT NULL,
  UNIQUE (periodo, tramo)
);

-- Comisiones AFP vigentes por período (cambian poco, pero se versionan igual).
CREATE TABLE IF NOT EXISTS comisiones_afp (
  id SERIAL PRIMARY KEY,
  periodo TEXT NOT NULL REFERENCES parametros_periodo(periodo) ON DELETE CASCADE,
  nombre_afp TEXT NOT NULL,
  comision_pct NUMERIC(5,3) NOT NULL,
  UNIQUE (periodo, nombre_afp)
);
