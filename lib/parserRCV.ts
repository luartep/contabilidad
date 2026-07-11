/**
 * Parser del Registro de Compras y Ventas (RCV) del SII
 * Soporta CSV y Excel (.xlsx) — archivos separados de ventas y compras
 *
 * El SII exporta con estas columnas (pueden variar levemente según el año):
 * Ventas:  N° Documento | Tipo DTE | RUT Receptor | Razón Social | Fecha Emisión | Monto Exento | Monto Neto | IVA | Monto Total | ...
 * Compras: N° Documento | Tipo DTE | RUT Emisor   | Razón Social | Fecha Emisión | Monto Exento | Monto Neto | IVA | Monto Total | ...
 */

import * as XLSX from "xlsx";

export interface DocumentoRCV {
  folio: string;
  tipo_documento: string;  // mapeado a nuestro sistema
  tipo_dte: string;        // código DTE original del SII
  rut_contraparte: string;
  razon_social: string;
  fecha: string;           // YYYY-MM-DD
  monto_neto: number;
  monto_iva: number;
  monto_exento: number;
  monto_total: number;
  es_nota_credito: boolean;
}

// Mapeo de tipos DTE del SII a nuestros tipos internos
const MAPA_DTE: Record<string, string> = {
  "33":  "factura",
  "34":  "factura_exenta",
  "39":  "boleta",
  "41":  "boleta_exenta",
  "46":  "liquidacion_factura",
  "56":  "nota_debito",
  "61":  "nota_credito",
  "110": "factura",        // Factura de exportación
  "111": "nota_debito",
  "112": "nota_credito",
};

// Alias posibles para las columnas del SII (el SII varía el nombre exacto)
const ALIAS_COLUMNAS: Record<string, string[]> = {
  folio:       ["n° documento", "numero documento", "folio", "n°", "numero", "nro"],
  tipo_dte:    ["tipo dte", "tipo de dte", "tipo documento", "tipo doc", "dte"],
  rut:         ["rut receptor", "rut emisor", "rut", "r.u.t."],
  razon:       ["razón social", "razon social", "nombre", "receptor", "emisor"],
  fecha:       ["fecha emisión", "fecha emision", "fecha", "fecha doc"],
  neto:        ["monto neto", "neto", "base imponible"],
  iva:         ["iva", "monto iva", "débito fiscal", "crédito fiscal"],
  exento:      ["monto exento", "exento", "no afecto o exento"],
  total:       ["monto total", "total", "total documento"],
};

function normalizarHeader(h: string): string {
  return h?.toString().toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/\s+/g, " ");
}

function encontrarColumna(headers: string[], aliases: string[]): number {
  const norm = headers.map(normalizarHeader);
  for (const alias of aliases) {
    const idx = norm.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parsearFecha(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  const str = val.toString().trim();
  // Formato DD/MM/YYYY (SII usa esto en CSV)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/");
    return `${y}-${m}-${d}`;
  }
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Número serial de Excel (días desde 1900-01-01)
  if (!isNaN(Number(str))) {
    const date = XLSX.SSF.parse_date_code(Number(str));
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function parsearMonto(val: any): number {
  if (!val) return 0;
  const str = val.toString().replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  return Math.round(Number(str) || 0);
}

function mapearTipoDTE(codigoDTE: string): { tipo_documento: string; es_nota_credito: boolean } {
  const codigo = codigoDTE?.toString().trim();
  const tipo_documento = MAPA_DTE[codigo] || "factura";
  const es_nota_credito = codigo === "61" || codigo === "112";
  return { tipo_documento, es_nota_credito };
}

export function parsearRCV(
  buffer: Buffer,
  tipo_archivo: "venta" | "compra",
  nombre_archivo: string
): DocumentoRCV[] {
  const esExcel = nombre_archivo.toLowerCase().endsWith(".xlsx") ||
                  nombre_archivo.toLowerCase().endsWith(".xls");

  let filas: any[][];

  if (esExcel) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  } else {
    // CSV: detectar separador automáticamente (SII usa ";" o ",")
    const texto = buffer.toString("latin1"); // SII a veces usa latin1
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
    const separador = lineas[0].includes(";") ? ";" : ",";
    filas = lineas.map((l) =>
      l.split(separador).map((c) => c.replace(/^"|"$/g, "").trim())
    );
  }

  if (filas.length < 2) return [];

  // Encontrar fila de headers (puede no ser la primera si el SII agrega metadatos arriba)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, filas.length); i++) {
    const row = filas[i].map(normalizarHeader);
    if (row.some((c) => c.includes("documento") || c.includes("dte") || c.includes("folio"))) {
      headerIdx = i;
      break;
    }
  }

  const headers = filas[headerIdx].map((h) => h?.toString() || "");

  // Mapear índices de columnas
  const idx = {
    folio:  encontrarColumna(headers, ALIAS_COLUMNAS.folio),
    dte:    encontrarColumna(headers, ALIAS_COLUMNAS.tipo_dte),
    rut:    encontrarColumna(headers, ALIAS_COLUMNAS.rut),
    razon:  encontrarColumna(headers, ALIAS_COLUMNAS.razon),
    fecha:  encontrarColumna(headers, ALIAS_COLUMNAS.fecha),
    neto:   encontrarColumna(headers, ALIAS_COLUMNAS.neto),
    iva:    encontrarColumna(headers, ALIAS_COLUMNAS.iva),
    exento: encontrarColumna(headers, ALIAS_COLUMNAS.exento),
    total:  encontrarColumna(headers, ALIAS_COLUMNAS.total),
  };

  const documentos: DocumentoRCV[] = [];

  for (let i = headerIdx + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.every((c) => !c)) continue; // saltar filas vacías

    const codigoDTE = idx.dte >= 0 ? fila[idx.dte]?.toString().trim() : "";
    if (!codigoDTE) continue; // saltar filas sin tipo DTE (totales, etc.)

    const neto   = idx.neto   >= 0 ? parsearMonto(fila[idx.neto])   : 0;
    const iva    = idx.iva    >= 0 ? parsearMonto(fila[idx.iva])    : 0;
    const exento = idx.exento >= 0 ? parsearMonto(fila[idx.exento]) : 0;
    const total  = idx.total  >= 0 ? parsearMonto(fila[idx.total])  : neto + iva + exento;

    const { tipo_documento, es_nota_credito } = mapearTipoDTE(codigoDTE);

    documentos.push({
      folio:           idx.folio >= 0 ? fila[idx.folio]?.toString().trim() : "",
      tipo_documento,
      tipo_dte:        codigoDTE,
      rut_contraparte: idx.rut   >= 0 ? fila[idx.rut]?.toString().trim()   : "",
      razon_social:    idx.razon >= 0 ? fila[idx.razon]?.toString().trim()  : "",
      fecha:           idx.fecha >= 0 ? parsearFecha(fila[idx.fecha])       : new Date().toISOString().slice(0, 10),
      monto_neto:      neto,
      monto_iva:       iva,
      monto_exento:    exento,
      monto_total:     total,
      es_nota_credito,
    });
  }

  return documentos;
}
