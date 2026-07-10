/**
 * Motor de cálculo F29 — Chile 2026
 * Soporta: régimen general IVA, Pro Pyme transparente, Primera categoría con PPM
 */

export interface DocumentoF29 {
  tipo: "venta" | "compra" | "honorario_recibido";
  tipo_documento: string;
  monto_neto: number;
  monto_iva: number;
  monto_exento: number;
  es_nota_credito: boolean;
  retencion_honorario: number;
}

export interface ResumenF29 {
  // Ventas
  total_ventas_netas: number;
  total_ventas_exentas: number;
  debito_fiscal: number;
  // Compras
  total_compras_netas: number;
  total_compras_exentas: number;
  credito_fiscal: number;
  // IVA
  iva_determinado: number;      // débito - crédito
  remanente_credito: number;    // si crédito > débito
  iva_a_pagar: number;          // si débito > crédito
  // PPM
  ppm_base: number;
  ppm_monto: number;
  // Retenciones honorarios
  retenciones_honorarios: number;
  // Impuesto único (traído desde liquidaciones)
  impuesto_unico_trab: number;
  // Total final
  total_a_pagar: number;
  // Remanente del mes anterior (se ingresa manualmente)
  remanente_anterior: number;
}

export function calcularF29(
  documentos: DocumentoF29[],
  regimen_iva: string,
  tasa_ppm: number,
  impuesto_unico_trab: number,
  remanente_anterior: number = 0
): ResumenF29 {

  const ventas = documentos.filter((d) => d.tipo === "venta");
  const compras = documentos.filter((d) => d.tipo === "compra");
  const honorarios = documentos.filter((d) => d.tipo === "honorario_recibido");

  // ── VENTAS ────────────────────────────────────────────────────────────────
  let total_ventas_netas = 0;
  let total_ventas_exentas = 0;
  let debito_fiscal = 0;

  for (const v of ventas) {
    if (v.es_nota_credito) {
      // NC resta del débito fiscal
      total_ventas_netas -= v.monto_neto;
      debito_fiscal -= v.monto_iva;
    } else {
      total_ventas_netas += v.monto_neto;
      total_ventas_exentas += v.monto_exento;
      debito_fiscal += v.monto_iva;
    }
  }

  // ── COMPRAS ───────────────────────────────────────────────────────────────
  let total_compras_netas = 0;
  let total_compras_exentas = 0;
  let credito_fiscal = 0;

  for (const c of compras) {
    if (c.es_nota_credito) {
      // NC de compra resta del crédito fiscal
      total_compras_netas -= c.monto_neto;
      credito_fiscal -= c.monto_iva;
    } else {
      total_compras_netas += c.monto_neto;
      total_compras_exentas += c.monto_exento;
      credito_fiscal += c.monto_iva;
    }
  }

  // ── RETENCIONES HONORARIOS ────────────────────────────────────────────────
  const retenciones_honorarios = honorarios.reduce(
    (s, h) => s + h.retencion_honorario, 0
  );

  // ── PPM ───────────────────────────────────────────────────────────────────
  // Base PPM = ventas netas + ventas exentas (ingresos brutos del período)
  const ppm_base = total_ventas_netas + total_ventas_exentas;
  let ppm_monto = 0;

  // PPM aplica en régimen general y primera categoría (no en Pro Pyme transparente)
  if (regimen_iva !== "pro_pyme_trans") {
    ppm_monto = Math.round(ppm_base * (tasa_ppm / 100));
  }

  // ── IVA A PAGAR ───────────────────────────────────────────────────────────
  let iva_determinado = 0;
  let remanente_credito = 0;
  let iva_a_pagar = 0;

  if (regimen_iva === "pro_pyme_trans") {
    // Pro Pyme transparente: exento de IVA en ventas → no hay débito fiscal
    iva_a_pagar = 0;
    debito_fiscal = 0;
    // El crédito fiscal se pierde (no genera remanente ni devolución en este régimen)
    credito_fiscal = 0;
  } else {
    // Régimen general e híbridos
    // Aplicar remanente del mes anterior
    const credito_total = credito_fiscal + remanente_anterior;
    iva_determinado = debito_fiscal - credito_total;

    if (iva_determinado > 0) {
      iva_a_pagar = Math.round(iva_determinado);
      remanente_credito = 0;
    } else {
      iva_a_pagar = 0;
      remanente_credito = Math.round(Math.abs(iva_determinado));
    }
  }

  // ── TOTAL A PAGAR ─────────────────────────────────────────────────────────
  // Total = IVA + PPM + Retenciones honorarios + Impuesto único trabajadores
  const total_a_pagar = Math.max(
    0,
    iva_a_pagar + ppm_monto + retenciones_honorarios + impuesto_unico_trab
  );

  return {
    total_ventas_netas: Math.round(total_ventas_netas),
    total_ventas_exentas: Math.round(total_ventas_exentas),
    debito_fiscal: Math.round(debito_fiscal),
    total_compras_netas: Math.round(total_compras_netas),
    total_compras_exentas: Math.round(total_compras_exentas),
    credito_fiscal: Math.round(credito_fiscal),
    iva_determinado: Math.round(Math.max(0, debito_fiscal - credito_fiscal)),
    remanente_credito,
    iva_a_pagar,
    ppm_base: Math.round(ppm_base),
    ppm_monto,
    retenciones_honorarios: Math.round(retenciones_honorarios),
    impuesto_unico_trab: Math.round(impuesto_unico_trab),
    total_a_pagar,
    remanente_anterior,
  };
}
