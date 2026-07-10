/**
 * Generador de archivo Previred — Formato Estándar 105 campos
 * Separador: ";" (punto y coma)
 * Normativa: Previred Layout 2024-2026 + Ley 21.735 (Reforma Previsional)
 *
 * Campos clave:
 *  1  RUT trabajador (sin puntos, con guión)
 *  2  RUT empresa (sin puntos, con guión)
 *  3  Período (AAAAMM)
 *  4  Tipo movimiento: 0=Normal, 1=Rezago, 2=Reliquidación
 *  5  Días trabajados
 *  6  Renta imponible AFP
 *  7  Cotización obligatoria AFP (10%)
 *  8  AFP destino (código numérico)
 *  9  Renta imponible salud
 * 10  Cotización salud (7% mínimo)
 * 11  Código institución salud (Fonasa=07)
 * 12  Renta imponible cesantía
 * 13  Cotización cesantía trabajador
 * 14  Cotización cesantía empleador
 * 15  Tipo contrato (1=Indefinido, 2=Plazo fijo, 3=Por obra)
 * 28  Cotización adicional AFP (comisión, campo separado Ley 21.735 parte 1: 0.1%)
 * 94  Cotización Expectativa de Vida (Ley 21.735 parte 2: 0.9% empleador)
 * ...campos vacíos para APV, SIS, accidentes, etc.
 */

export interface PreviredTrabajador {
  // Identificación
  rut_trabajador: string;
  rut_empresa: string;
  periodo: string; // YYYY-MM
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  sexo: string; // 'M' | 'F'
  fecha_nacimiento: string; // YYYY-MM-DD
  nacionalidad: string; // 'CHL'
  tipo_contrato: string; // 'indefinido' | 'plazo_fijo' | 'por_obra'
  discapacidad: boolean;
  pensionado: boolean;

  // Remuneración
  dias_trabajados: number;
  renta_imponible_afp: number;
  renta_imponible_salud: number;
  renta_imponible_cesantia: number;

  // AFP
  codigo_afp: string; // código numérico Previred
  cotizacion_obligatoria_afp: number; // 10% base
  cotizacion_adicional_afp: number;   // comisión AFP (campo 28)
  cotizacion_expectativa_vida: number; // 0.9% empleador (campo 94, Ley 21.735)

  // Salud
  codigo_salud: string; // '07' Fonasa, o código Isapre
  cotizacion_salud: number;
  cotizacion_isapre_adicional: number; // diferencia plan sobre 7%

  // Cesantía
  cotizacion_cesantia_trabajador: number;
  cotizacion_cesantia_empleador: number;

  // APV (opcionales)
  tiene_apv: boolean;
  modalidad_apv: string; // 'A' | 'B'
  monto_apv: number;
  codigo_institucion_apv: string;

  // SIS y accidentes
  sis_empleador: number;
  tasa_accidentes: number;
  cotizacion_accidentes: number;
}

// Códigos AFP Previred 2026
export const CODIGOS_AFP: Record<string, string> = {
  "capital":  "01",
  "cuprum":   "02",
  "habitat":  "03",
  "planvital": "04",
  "provida":  "05",
  "modelo":   "06",
  "uno":      "07",
};

// Códigos Isapre comunes (Previred)
export const CODIGOS_ISAPRE: Record<string, string> = {
  "banmedica":    "02",
  "colmena":      "03",
  "consalud":     "04",
  "cruzblanca":   "05",
  "esencial":     "06",
  "masvida":      "09",
  "nueva masvida":"09",
  "vidatres":     "11",
};

export function getCodigoAfp(nombre: string): string {
  const clave = nombre?.toLowerCase().trim();
  return CODIGOS_AFP[clave] || "03"; // default Habitat
}

export function getCodigoSalud(sistema: string, isapre?: string): string {
  if (sistema === "fonasa") return "07";
  const clave = isapre?.toLowerCase().trim() || "";
  return CODIGOS_ISAPRE[clave] || "04"; // default Consalud si no se encuentra
}

function padR(val: string, len: number): string {
  return String(val ?? "").padEnd(len, " ").slice(0, len);
}

function n(val: number | null | undefined): string {
  return String(Math.round(val ?? 0));
}

function formatRut(rut: string): string {
  // Asegurar formato XXXXXXXX-X (sin puntos)
  return rut.replace(/\./g, "").toUpperCase();
}

function periodoToYYYYMM(periodo: string): string {
  return periodo.replace("-", ""); // '2026-07' → '202607'
}

export function generarLineaPrevired(t: PreviredTrabajador): string {
  const rut = formatRut(t.rut_trabajador);
  const rutEmp = formatRut(t.rut_empresa);
  const periodo = periodoToYYYYMM(t.periodo);
  const tipoContrato = t.tipo_contrato === "indefinido" ? "1"
    : t.tipo_contrato === "plazo_fijo" ? "2"
    : t.tipo_contrato === "por_obra" ? "3" : "1";

  // 105 campos separados por ";"
  // Los campos vacíos se dejan como "" (cadena vacía entre ;; )
  const campos: string[] = new Array(105).fill("");

  campos[0]  = rut;                             // C1: RUT trabajador
  campos[1]  = rutEmp;                          // C2: RUT empresa
  campos[2]  = periodo;                         // C3: Período AAAAMM
  campos[3]  = "0";                             // C4: Tipo movimiento (0=Normal)
  campos[4]  = String(t.dias_trabajados || 30); // C5: Días trabajados
  campos[5]  = n(t.renta_imponible_afp);        // C6: Renta imponible AFP
  campos[6]  = n(t.cotizacion_obligatoria_afp); // C7: Cotización obligatoria AFP 10%
  campos[7]  = t.codigo_afp;                    // C8: Código AFP
  campos[8]  = n(t.renta_imponible_salud);      // C9: Renta imponible salud
  campos[9]  = n(t.cotizacion_salud);           // C10: Cotización salud
  campos[10] = t.codigo_salud;                  // C11: Código institución salud
  campos[11] = n(t.renta_imponible_cesantia);   // C12: Renta imponible cesantía
  campos[12] = n(t.cotizacion_cesantia_trabajador); // C13: Cesantía trabajador
  campos[13] = n(t.cotizacion_cesantia_empleador);  // C14: Cesantía empleador
  campos[14] = tipoContrato;                    // C15: Tipo contrato

  // C16-C27: vacíos (rezagos, campos adicionales no usados)

  campos[27] = n(t.cotizacion_adicional_afp);   // C28: Cotización adicional AFP (comisión, Ley 21.735 parte 1)

  // C29-C33: APV
  if (t.tiene_apv && t.monto_apv > 0) {
    campos[28] = t.modalidad_apv || "A";        // C29: Modalidad APV
    campos[29] = n(t.monto_apv);               // C30: Monto APV
    campos[30] = t.codigo_institucion_apv || ""; // C31: Institución APV
  }

  // C35: Discapacidad
  campos[34] = t.discapacidad ? "1" : "0";

  // C36: Pensionado
  campos[35] = t.pensionado ? "1" : "0";

  // C37: Sexo
  campos[36] = t.sexo || "M";

  // C38: Fecha nacimiento DDMMAAAA
  if (t.fecha_nacimiento) {
    const [y, m, d] = t.fecha_nacimiento.split("-");
    campos[37] = `${d}${m}${y}`;
  }

  // C39: Nacionalidad
  campos[38] = t.nacionalidad || "CHL";

  // C40: Nombre
  campos[39] = padR(t.nombres, 50);

  // C41: Apellido paterno
  campos[40] = padR(t.apellido_paterno, 30);

  // C42: Apellido materno
  campos[41] = padR(t.apellido_materno, 30);

  // C51: SIS empleador
  campos[50] = n(t.sis_empleador);

  // C52: Tasa accidentes
  campos[51] = String(t.tasa_accidentes || 0.95);

  // C53: Cotización accidentes
  campos[52] = n(t.cotizacion_accidentes);

  // C94: Cotización Expectativa de Vida (0.9% empleador, Ley 21.735)
  campos[93] = n(t.cotizacion_expectativa_vida);

  return campos.join(";");
}

export function generarArchivoPrevired(trabajadores: PreviredTrabajador[]): string {
  const lineas = trabajadores.map(generarLineaPrevired);
  return lineas.join("\r\n") + "\r\n";
}
