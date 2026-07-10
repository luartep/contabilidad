/**
 * Generador de Libro de Remuneraciones Electrónico (LRE)
 * Dirección del Trabajo — Portal Mi DT
 * Formato: CSV delimitado por ";" con headers fijos
 * Obligatorio para empleadores con 5+ trabajadores
 * Plazo: primeros 15 días hábiles del mes siguiente
 *
 * Referencia: Resolución Exenta N°1.237 DT y actualizaciones 2024-2026
 */

export interface LRETrabajador {
  // Identificación empresa
  rut_empresa: string;
  razon_social: string;
  periodo: string; // YYYY-MM

  // Identificación trabajador
  rut_trabajador: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_contrato: string;
  dias_trabajados: number;
  cargo: string;

  // Haberes imponibles y tributables
  sueldo_base: number;
  gratificacion: number;
  horas_extra_monto: number;
  comisiones: number;
  bono_imponible: number;
  otros_imponibles: number;

  // Haberes no imponibles
  colacion: number;
  movilizacion: number;
  asignacion_familiar: number;
  bono_no_imponible: number;
  otros_no_imponibles: number;

  // Totales haberes
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;

  // Descuentos legales trabajador
  afp_trabajador: number;
  afp_adicional: number;
  salud_trabajador: number;
  cesantia_trabajador: number;
  impuesto_unico: number;
  apv_trabajador: number;

  // Aportes empleador
  cesantia_empleador: number;
  sis_empleador: number;
  accidente_empleador: number;

  // Otros descuentos
  descuentos_varios: number;
  anticipo: number;

  // Totales
  total_descuentos_legales: number;
  total_descuentos: number;
  liquido_a_pagar: number;

  // Bases
  base_imponible_afp: number;
  base_tributable: number;

  // AFP y salud
  afp_nombre: string;
  sistema_salud: string;
}

// Headers exactos exigidos por la DT para el LRE
// (no se pueden modificar — el portal rechaza el archivo si difieren)
export const HEADERS_LRE = [
  "RUT_EMPRESA",
  "RAZON_SOCIAL",
  "PERIODO",
  "RUT_TRABAJADOR",
  "APELLIDO_PATERNO",
  "APELLIDO_MATERNO",
  "NOMBRES",
  "TIPO_CONTRATO",
  "DIAS_TRABAJADOS",
  "CARGO",
  "SUELDO_BASE",
  "GRATIFICACION",
  "HORAS_EXTRA",
  "COMISIONES",
  "BONO_IMPONIBLE",
  "OTROS_IMPONIBLES",
  "TOTAL_IMPONIBLE",
  "COLACION",
  "MOVILIZACION",
  "ASIG_FAMILIAR",
  "BONO_NO_IMPONIBLE",
  "OTROS_NO_IMPONIBLES",
  "TOTAL_NO_IMPONIBLE",
  "TOTAL_HABERES",
  "AFP_NOMBRE",
  "COTIZ_AFP",
  "COTIZ_AFP_ADICIONAL",
  "SISTEMA_SALUD",
  "COTIZ_SALUD",
  "COTIZ_CESANTIA_TRAB",
  "IMPUESTO_UNICO",
  "APV",
  "TOTAL_DESC_LEGALES",
  "OTROS_DESCUENTOS",
  "ANTICIPO",
  "TOTAL_DESCUENTOS",
  "LIQUIDO_A_PAGAR",
  "COTIZ_CESANTIA_EMP",
  "SIS_EMPLEADOR",
  "ACCIDENTE_EMPLEADOR",
  "BASE_IMPONIBLE_AFP",
  "BASE_TRIBUTABLE",
];

function formatRut(rut: string): string {
  return rut.replace(/\./g, "").toUpperCase();
}

function n(val: number | null | undefined): string {
  return String(Math.round(val ?? 0));
}

function s(val: string | null | undefined): string {
  return (val ?? "").replace(/;/g, ",").trim(); // escapar punto y coma
}

function periodoToMMAAAA(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  return `${mes}/${anio}`;
}

function tipoContratoLabel(tipo: string): string {
  const m: Record<string, string> = {
    indefinido: "INDEFINIDO",
    plazo_fijo: "PLAZO FIJO",
    por_obra: "POR OBRA",
    honorarios: "HONORARIOS",
  };
  return m[tipo] || tipo.toUpperCase();
}

export function generarLineaLRE(t: LRETrabajador): string {
  const campos = [
    formatRut(t.rut_empresa),
    s(t.razon_social),
    periodoToMMAAAA(t.periodo),
    formatRut(t.rut_trabajador),
    s(t.apellido_paterno),
    s(t.apellido_materno),
    s(t.nombres),
    tipoContratoLabel(t.tipo_contrato),
    String(t.dias_trabajados || 30),
    s(t.cargo || ""),
    n(t.sueldo_base),
    n(t.gratificacion),
    n(t.horas_extra_monto),
    n(t.comisiones),
    n(t.bono_imponible),
    n(t.otros_imponibles),
    n(t.total_haberes_imponibles),
    n(t.colacion),
    n(t.movilizacion),
    n(t.asignacion_familiar),
    n(t.bono_no_imponible),
    n(t.otros_no_imponibles),
    n(t.total_haberes_no_imponibles),
    n(t.total_haberes),
    s(t.afp_nombre),
    n(t.afp_trabajador),
    n(t.afp_adicional),
    s(t.sistema_salud === "isapre" ? "ISAPRE" : "FONASA"),
    n(t.salud_trabajador),
    n(t.cesantia_trabajador),
    n(t.impuesto_unico),
    n(t.apv_trabajador),
    n(t.total_descuentos_legales),
    n(t.descuentos_varios),
    n(t.anticipo),
    n(t.total_descuentos),
    n(t.liquido_a_pagar),
    n(t.cesantia_empleador),
    n(t.sis_empleador),
    n(t.accidente_empleador),
    n(t.base_imponible_afp),
    n(t.base_tributable),
  ];

  return campos.join(";");
}

export function generarArchivoLRE(trabajadores: LRETrabajador[]): string {
  const header = HEADERS_LRE.join(";");
  const lineas = trabajadores.map(generarLineaLRE);
  return [header, ...lineas].join("\r\n") + "\r\n";
}

export function calcularDiasHabilesRestantes(periodo: string): number {
  // Calcula cuántos días hábiles quedan para el vencimiento del LRE
  // (15 días hábiles del mes siguiente)
  const [anio, mes] = periodo.split("-").map(Number);
  const mesVencimiento = mes === 12 ? 1 : mes + 1;
  const anioVencimiento = mes === 12 ? anio + 1 : anio;

  let diasHabiles = 0;
  let dia = 1;
  const hoy = new Date();

  while (diasHabiles < 15) {
    const fecha = new Date(anioVencimiento, mesVencimiento - 1, dia);
    const dow = fecha.getDay();
    if (dow !== 0 && dow !== 6) diasHabiles++; // excluye sábado y domingo
    if (diasHabiles < 15) dia++;
  }

  const vencimiento = new Date(anioVencimiento, mesVencimiento - 1, dia);
  const diffMs = vencimiento.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
