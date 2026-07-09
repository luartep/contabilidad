/**
 * Motor de cálculo de remuneraciones — Chile 2026
 * Normativa: Código del Trabajo, DL 3.500 (AFP), Ley 18.469 (Salud),
 * Ley 19.728 (AFC/Cesantía), Ley 21.735 (Reforma Previsional).
 */

export interface TramoImpuesto {
  tramo: number;
  desde: number;
  hasta: number | null;
  factor: number;
  rebaja: number;
}

export interface ParametrosPeriodo {
  uf: number;
  utm: number;
  imm: number; // Ingreso Mínimo Mensual
  tope_imponible_afp_salud_uf: number;
  tope_imponible_cesantia_uf: number;
  tasa_afc_indefinido_trabajador: number;
  tasa_afc_indefinido_empleador: number;
  tasa_afc_plazo_fijo_empleador: number;
  tasa_salud_fonasa: number;
  tramos: TramoImpuesto[];
}

export interface InputTrabajador {
  tipo_contrato: 'indefinido' | 'plazo_fijo' | 'por_obra' | 'honorarios';
  afp: string | null;
  tasa_afp: number | null;          // % total (10 + comisión)
  tasa_afp_adicional: number | null; // solo la comisión AFP
  sistema_salud: 'fonasa' | 'isapre' | null;
  isapre_plan_uf: number | null;
  // Haberes
  sueldo_base: number;
  horas_extra_monto: number;
  comisiones: number;
  bono_imponible: number;
  otros_imponibles: number;
  colacion: number;
  movilizacion: number;
  asignacion_familiar: number;
  bono_no_imponible: number;
  otros_no_imponibles: number;
  // Opciones de cálculo
  gratificacion_tipo: 'garantizada' | 'proporcional' | 'no_aplica';
  descuentos_varios: number;
  anticipo: number;
  // Flags de descuentos automáticos
  afp_automatico: boolean;
  salud_automatico: boolean;
  cesantia_automatico: boolean;
  impuesto_automatico: boolean;
  // Overrides manuales (si el flag automático está off)
  afp_manual: number;
  salud_manual: number;
  cesantia_manual: number;
  impuesto_manual: number;
  // Aportes empleador
  tasa_accidentes: number; // % mutualidad empresa
  tasa_sis: number;        // % SIS (varía, ~1.87% referencial 2026)
}

export interface ResultadoLiquidacion {
  // Haberes
  sueldo_base: number;
  gratificacion: number;
  horas_extra_monto: number;
  comisiones: number;
  bono_imponible: number;
  otros_imponibles: number;
  colacion: number;
  movilizacion: number;
  asignacion_familiar: number;
  bono_no_imponible: number;
  otros_no_imponibles: number;
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;
  // Bases
  base_imponible_afp: number;
  base_imponible_salud: number;
  base_imponible_cesantia: number;
  base_tributable: number;
  // Descuentos legales trabajador
  afp_trabajador: number;
  afp_adicional: number;
  salud_trabajador: number;
  cesantia_trabajador: number;
  impuesto_unico: number;
  // Descuentos voluntarios
  descuentos_varios: number;
  anticipo: number;
  // Totales
  total_descuentos_legales: number;
  total_descuentos: number;
  liquido_a_pagar: number;
  // Aportes empleador (costo empresa)
  cesantia_empleador: number;
  sis_empleador: number;
  accidente_empleador: number;
  costo_total_empresa: number;
  // Metadatos
  tasa_afp_usada: number;
  afp_nombre: string;
  sistema_salud_usado: string;
  uf_usada: number;
  utm_usada: number;
  imm_usado: number;
}

export function calcularLiquidacion(
  input: InputTrabajador,
  params: ParametrosPeriodo
): ResultadoLiquidacion {
  const { uf, utm, imm, tramos } = params;

  // ─── 1. GRATIFICACIÓN ───────────────────────────────────────────────────────
  let gratificacion = 0;
  if (input.gratificacion_tipo === 'garantizada') {
    // 25% del sueldo base mensual, tope 4,75 IMM / 12
    const tope = (4.75 * imm) / 12;
    gratificacion = Math.min(input.sueldo_base * 0.25, tope);
  }
  // 'proporcional' se carga manualmente en el campo otros_imponibles o bono_imponible
  // 'no_aplica' = 0

  // ─── 2. HABERES IMPONIBLES ───────────────────────────────────────────────────
  const total_haberes_imponibles =
    input.sueldo_base +
    gratificacion +
    input.horas_extra_monto +
    input.comisiones +
    input.bono_imponible +
    input.otros_imponibles;

  // ─── 3. HABERES NO IMPONIBLES ───────────────────────────────────────────────
  const total_haberes_no_imponibles =
    input.colacion +
    input.movilizacion +
    input.asignacion_familiar +
    input.bono_no_imponible +
    input.otros_no_imponibles;

  const total_haberes = total_haberes_imponibles + total_haberes_no_imponibles;

  // ─── 4. BASES IMPONIBLES (con topes en UF) ──────────────────────────────────
  const tope_afp_salud = params.tope_imponible_afp_salud_uf * uf;
  const tope_cesantia = params.tope_imponible_cesantia_uf * uf;

  const base_imponible_afp = Math.min(total_haberes_imponibles, tope_afp_salud);
  const base_imponible_salud = Math.min(total_haberes_imponibles, tope_afp_salud);
  const base_imponible_cesantia = Math.min(total_haberes_imponibles, tope_cesantia);

  // ─── 5. AFP ─────────────────────────────────────────────────────────────────
  // tasa_afp = 10% + comisión AFP (ej. Habitat 0.58% → total 10.58%)
  // tasa_afp_adicional = solo la comisión
  let afp_trabajador = 0;
  let afp_adicional = 0;
  const tasa_afp = input.tasa_afp ?? 10.77; // fallback Habitat 2026 referencial

  if (input.tipo_contrato !== 'honorarios') {
    if (input.afp_automatico) {
      afp_trabajador = redondear(base_imponible_afp * (tasa_afp / 100));
      afp_adicional = redondear(base_imponible_afp * ((input.tasa_afp_adicional ?? 0.58) / 100));
      afp_trabajador = afp_trabajador - afp_adicional; // el 10% base
    } else {
      afp_trabajador = input.afp_manual;
    }
  }

  // ─── 6. SALUD ───────────────────────────────────────────────────────────────
  let salud_trabajador = 0;
  if (input.tipo_contrato !== 'honorarios') {
    if (input.salud_automatico) {
      if (input.sistema_salud === 'isapre' && input.isapre_plan_uf) {
        const plan_pesos = input.isapre_plan_uf * uf;
        const minimo_legal = base_imponible_salud * (params.tasa_salud_fonasa / 100);
        salud_trabajador = redondear(Math.max(plan_pesos, minimo_legal));
      } else {
        // Fonasa: 7% de la base imponible
        salud_trabajador = redondear(base_imponible_salud * (params.tasa_salud_fonasa / 100));
      }
    } else {
      salud_trabajador = input.salud_manual;
    }
  }

  // ─── 7. CESANTÍA (AFC) ──────────────────────────────────────────────────────
  let cesantia_trabajador = 0;
  let cesantia_empleador = 0;
  if (input.tipo_contrato !== 'honorarios') {
    if (input.cesantia_automatico) {
      if (input.tipo_contrato === 'indefinido') {
        cesantia_trabajador = redondear(
          base_imponible_cesantia * (params.tasa_afc_indefinido_trabajador / 100)
        );
        cesantia_empleador = redondear(
          base_imponible_cesantia * (params.tasa_afc_indefinido_empleador / 100)
        );
      } else {
        // Plazo fijo / por obra: solo empleador paga
        cesantia_trabajador = 0;
        cesantia_empleador = redondear(
          base_imponible_cesantia * (params.tasa_afc_plazo_fijo_empleador / 100)
        );
      }
    } else {
      cesantia_trabajador = input.cesantia_manual;
    }
  }

  // ─── 8. BASE TRIBUTABLE ─────────────────────────────────────────────────────
  // Renta líquida imponible = haberes imponibles - AFP - Salud - Cesantía trabajador
  const base_tributable = Math.max(
    0,
    total_haberes_imponibles - afp_trabajador - afp_adicional - salud_trabajador - cesantia_trabajador
  );

  // ─── 9. IMPUESTO ÚNICO DE SEGUNDA CATEGORÍA ─────────────────────────────────
  let impuesto_unico = 0;
  if (input.tipo_contrato !== 'honorarios') {
    if (input.impuesto_automatico) {
      impuesto_unico = calcularImpuestoUnico(base_tributable, tramos);
    } else {
      impuesto_unico = input.impuesto_manual;
    }
  }

  // ─── 10. APORTES EMPLEADOR ───────────────────────────────────────────────────
  const sis_empleador = redondear(base_imponible_afp * (input.tasa_sis / 100));
  const accidente_empleador = redondear(base_imponible_afp * (input.tasa_accidentes / 100));

  // ─── 11. TOTALES ────────────────────────────────────────────────────────────
  const total_descuentos_legales =
    afp_trabajador + afp_adicional + salud_trabajador + cesantia_trabajador + impuesto_unico;

  const total_descuentos =
    total_descuentos_legales + input.descuentos_varios + input.anticipo;

  const liquido_a_pagar = Math.max(0, total_haberes - total_descuentos);

  const costo_total_empresa =
    total_haberes + cesantia_empleador + sis_empleador + accidente_empleador;

  return {
    sueldo_base: input.sueldo_base,
    gratificacion,
    horas_extra_monto: input.horas_extra_monto,
    comisiones: input.comisiones,
    bono_imponible: input.bono_imponible,
    otros_imponibles: input.otros_imponibles,
    colacion: input.colacion,
    movilizacion: input.movilizacion,
    asignacion_familiar: input.asignacion_familiar,
    bono_no_imponible: input.bono_no_imponible,
    otros_no_imponibles: input.otros_no_imponibles,
    total_haberes_imponibles,
    total_haberes_no_imponibles,
    total_haberes,
    base_imponible_afp,
    base_imponible_salud,
    base_imponible_cesantia,
    base_tributable,
    afp_trabajador,
    afp_adicional,
    salud_trabajador,
    cesantia_trabajador,
    impuesto_unico,
    descuentos_varios: input.descuentos_varios,
    anticipo: input.anticipo,
    total_descuentos_legales,
    total_descuentos,
    liquido_a_pagar,
    cesantia_empleador,
    sis_empleador,
    accidente_empleador,
    costo_total_empresa,
    tasa_afp_usada: tasa_afp,
    afp_nombre: input.afp ?? 'No definida',
    sistema_salud_usado: input.sistema_salud ?? 'No definido',
    uf_usada: uf,
    utm_usada: utm,
    imm_usado: imm,
  };
}

function calcularImpuestoUnico(baseTributable: number, tramos: TramoImpuesto[]): number {
  for (const t of tramos) {
    const dentroDelTramo =
      baseTributable >= t.desde && (t.hasta === null || baseTributable <= t.hasta);
    if (dentroDelTramo) {
      const impuesto = baseTributable * t.factor - t.rebaja;
      return redondear(Math.max(0, impuesto));
    }
  }
  return 0;
}

function redondear(valor: number): number {
  return Math.round(valor);
}

export function formatCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
}
