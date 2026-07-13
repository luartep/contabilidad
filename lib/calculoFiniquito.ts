/**
 * Motor de cálculo de finiquitos — Chile 2026
 * Código del Trabajo: Art. 159, 160, 161, 162, 163
 */

export interface InputFiniquito {
  fecha_ingreso: string;        // YYYY-MM-DD
  fecha_termino: string;        // YYYY-MM-DD
  causal: string;
  sueldo_base: number;
  promedio_ultimos_3_meses: number; // para indemnización (últimas 3 remuneraciones)
  vacaciones_pendientes_dias: number;
  dias_trabajados_mes_termino: number; // para proporcional del mes
  dias_mes_termino: number;            // días del mes de término
  otros_haberes: number;
  descuentos: number;
  tiene_aviso_previo: boolean; // si se paga sustitutiva de aviso previo (30 días)
}

export interface ResultadoFiniquito {
  anios_servicio: number;
  meses_servicio: number;
  dias_servicio: number;
  sueldo_base_promedio: number;
  // Indemnización
  indemnizacion_anios: number;
  indemnizacion_sustitutiva_aviso: number; // aviso previo si no se dio 30 días
  // Vacaciones
  vacaciones_pendientes_monto: number;
  // Proporcional del mes
  proporcional_mes: number;
  // Otros
  otros_haberes: number;
  descuentos: number;
  total_finiquito: number;
  // Detalle
  desglose: { concepto: string; monto: number }[];
}

const causalesConIndemnizacion = [
  "art_161",  // Necesidades de la empresa (con indemnización)
];

const causalesSinIndemnizacion = [
  "art_159_1", "art_159_2", "art_159_3", "art_159_4", "art_159_5",
  "renuncia", "art_160",
];

export function calcularFiniquito(input: InputFiniquito): ResultadoFiniquito {
  const ingreso  = new Date(input.fecha_ingreso);
  const termino  = new Date(input.fecha_termino);

  // ── Años, meses y días de servicio ──────────────────────────────────────
  let anios  = termino.getFullYear() - ingreso.getFullYear();
  let meses  = termino.getMonth() - ingreso.getMonth();
  let dias   = termino.getDate() - ingreso.getDate();

  if (dias < 0) { meses--; dias += 30; }
  if (meses < 0) { anios--; meses += 12; }

  const aniosTotales = anios + meses / 12 + dias / 365;

  // ── Base de cálculo: promedio últimas 3 remuneraciones ──────────────────
  const base = input.promedio_ultimos_3_meses || input.sueldo_base;

  // ── Indemnización por años de servicio (Art. 161) ───────────────────────
  // 1 mes por año trabajado, máximo 11 meses (tope de UF también aplica
  // pero lo maneja el contador; aquí calculamos meses completos)
  let indemnizacion_anios = 0;
  if (causalesConIndemnizacion.includes(input.causal)) {
    const mesesCompletos = Math.min(Math.floor(anios + (meses >= 6 ? 1 : 0)), 11);
    indemnizacion_anios = base * Math.max(mesesCompletos, 1);
  }

  // ── Sustitutiva de aviso previo (Art. 161 inc. 2) ───────────────────────
  // Si no se dio aviso con 30 días de anticipación, se paga 1 mes de sueldo
  const indemnizacion_sustitutiva = input.tiene_aviso_previo ? base : 0;

  // ── Vacaciones pendientes ────────────────────────────────────────────────
  // Monto = (sueldo diario) × días hábiles pendientes
  // Sueldo diario = sueldo mensual / 30 (criterio DT)
  const sueldo_diario = base / 30;
  const vacaciones_monto = Math.round(sueldo_diario * input.vacaciones_pendientes_dias);

  // ── Proporcional del mes de término ─────────────────────────────────────
  const proporcional = Math.round(
    (base / input.dias_mes_termino) * input.dias_trabajados_mes_termino
  );

  // ── Total ────────────────────────────────────────────────────────────────
  const subtotal =
    indemnizacion_anios +
    indemnizacion_sustitutiva +
    vacaciones_monto +
    proporcional +
    input.otros_haberes;

  const total = Math.max(0, subtotal - input.descuentos);

  // ── Desglose ─────────────────────────────────────────────────────────────
  const desglose: { concepto: string; monto: number }[] = [];
  if (proporcional > 0)
    desglose.push({ concepto: `Proporcional del mes (${input.dias_trabajados_mes_termino} días)`, monto: proporcional });
  if (vacaciones_monto > 0)
    desglose.push({ concepto: `Vacaciones pendientes (${input.vacaciones_pendientes_dias} días)`, monto: vacaciones_monto });
  if (indemnizacion_anios > 0)
    desglose.push({ concepto: `Indemnización por años de servicio (${Math.min(Math.floor(aniosTotales), 11)} mes(es))`, monto: indemnizacion_anios });
  if (indemnizacion_sustitutiva > 0)
    desglose.push({ concepto: "Sustitutiva de aviso previo (30 días)", monto: indemnizacion_sustitutiva });
  if (input.otros_haberes > 0)
    desglose.push({ concepto: "Otros haberes", monto: input.otros_haberes });
  if (input.descuentos > 0)
    desglose.push({ concepto: "Descuentos", monto: -input.descuentos });

  return {
    anios_servicio: anios,
    meses_servicio: meses,
    dias_servicio: dias,
    sueldo_base_promedio: base,
    indemnizacion_anios,
    indemnizacion_sustitutiva_aviso: indemnizacion_sustitutiva,
    vacaciones_pendientes_monto: vacaciones_monto,
    proporcional_mes: proporcional,
    otros_haberes: input.otros_haberes,
    descuentos: input.descuentos,
    total_finiquito: total,
    desglose,
  };
}

export function calcularVacacionesPendientes(
  fechaIngreso: string,
  fechaTermino: string,
  diasTomados: number,
  diasBase: number = 15,
  ferialdoProgresivo: boolean = false,
  aniosParaProgresivo: number = 0
): number {
  const ingreso = new Date(fechaIngreso);
  const termino = new Date(fechaTermino);
  const diffMs  = termino.getTime() - ingreso.getTime();
  const diffDias = diffMs / (1000 * 60 * 60 * 24);
  const aniosProporcional = diffDias / 365;

  let diasVacaciones = diasBase;
  if (ferialdoProgresivo && aniosParaProgresivo >= 10) {
    // 1 día adicional por cada 3 años sobre los 10 primeros
    const diasExtra = Math.floor((aniosParaProgresivo - 10) / 3);
    diasVacaciones = diasBase + diasExtra;
  }

  const diasGanados = aniosProporcional * diasVacaciones;
  return Math.max(0, Math.round(diasGanados - diasTomados));
}

export const CAUSALES_TERMINO: Record<string, string> = {
  art_159_1: "Art. 159 N°1 — Mutuo acuerdo",
  art_159_2: "Art. 159 N°2 — Renuncia del trabajador (equivalente)",
  art_159_3: "Art. 159 N°3 — Muerte del trabajador",
  art_159_4: "Art. 159 N°4 — Vencimiento del plazo convenido",
  art_159_5: "Art. 159 N°5 — Conclusión de la obra o faena",
  art_159_6: "Art. 159 N°6 — Caso fortuito o fuerza mayor",
  art_160:   "Art. 160 — Despido con causa (sin indemnización)",
  art_161:   "Art. 161 — Necesidades de la empresa (con indemnización)",
  renuncia:  "Renuncia voluntaria",
};
