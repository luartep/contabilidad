import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function getNextVoucherNum(empresa_id: string, periodo: string): Promise<number> {
  const [{ max_num }] = await sql`
    SELECT COALESCE(MAX(numero), 0) as max_num
    FROM vouchers WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;
  return Number(max_num) + 1;
}

async function crearVoucher(
  empresa_id: string, periodo: string, fecha: string,
  tipo: string, glosa: string,
  lineas: { cuenta_codigo: string; cuenta_nombre: string; glosa?: string; debe: number; haber: number }[]
) {
  const total_debe  = lineas.reduce((s, l) => s + l.debe, 0);
  const total_haber = lineas.reduce((s, l) => s + l.haber, 0);
  const cuadrado    = Math.abs(total_debe - total_haber) < 1;
  const numero      = await getNextVoucherNum(empresa_id, periodo);

  const [v] = await sql`
    INSERT INTO vouchers (empresa_id, periodo, fecha, numero, tipo, glosa, total_debe, total_haber, cuadrado)
    VALUES (${empresa_id}, ${periodo}, ${fecha}, ${numero}, ${tipo}, ${glosa}, ${total_debe}, ${total_haber}, ${cuadrado})
    RETURNING id
  `;

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    await sql`
      INSERT INTO voucher_lineas (voucher_id, cuenta_codigo, cuenta_nombre, glosa, debe, haber, orden)
      VALUES (${v.id}, ${l.cuenta_codigo}, ${l.cuenta_nombre}, ${l.glosa || null}, ${l.debe}, ${l.haber}, ${i + 1})
    `;
  }
  return { id: v.id, numero, cuadrado };
}

export async function POST(req: NextRequest) {
  const { empresa_id, periodo, tipo } = await req.json();
  // tipo: 'remuneraciones' | 'f29' | 'ambos'

  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;
  const fecha = `${periodo}-28`; // último día operacional del mes

  const vouchers_creados = [];

  // ── VOUCHER DE REMUNERACIONES ─────────────────────────────────────────────
  if (tipo === "remuneraciones" || tipo === "ambos") {
    const liq = await sql`
      SELECT l.*
      FROM liquidaciones l
      JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
      WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
    `;

    if (liq.length > 0) {
      const totHaberes    = liq.reduce((s: number, l: any) => s + Number(l.total_haberes), 0);
      const totLiquido    = liq.reduce((s: number, l: any) => s + Number(l.liquido_a_pagar), 0);
      const totAfp        = liq.reduce((s: number, l: any) => s + Number(l.afp_trabajador) + Number(l.afp_adicional), 0);
      const totSalud      = liq.reduce((s: number, l: any) => s + Number(l.salud_trabajador), 0);
      const totCesantiaTr = liq.reduce((s: number, l: any) => s + Number(l.cesantia_trabajador), 0);
      const totImpUnico   = liq.reduce((s: number, l: any) => s + Number(l.impuesto_unico), 0);
      const totCesantiaEm = liq.reduce((s: number, l: any) => s + Number(l.cesantia_empleador), 0);
      const totSIS        = liq.reduce((s: number, l: any) => s + Number(l.sis_empleador), 0);
      const totAccidentes = liq.reduce((s: number, l: any) => s + Number(l.accidente_empleador), 0);
      const otrosDesc     = liq.reduce((s: number, l: any) => s + Number(l.descuentos_varios) + Number(l.anticipo), 0);
      const totCargaEmp   = totCesantiaEm + totSIS + totAccidentes;

      const v = await crearVoucher(empresa_id, periodo, fecha, "remuneracion",
        `Remuneraciones ${periodo} — ${liq.length} trabajador(es)`, [
          // DEBE: el gasto total de la empresa
          { cuenta_codigo: "5.1.01", cuenta_nombre: "Sueldos y Salarios",                   glosa: `${liq.length} trabajadores`, debe: Math.round(totHaberes), haber: 0 },
          { cuenta_codigo: "5.1.02", cuenta_nombre: "Cotizaciones Previsionales Empleador",  glosa: "AFP + Salud + Cesantía emp.", debe: Math.round(totCargaEmp), haber: 0 },
          // HABER: las obligaciones que quedan pendientes de pago
          { cuenta_codigo: "2.1.04", cuenta_nombre: "Remuneraciones por Pagar",             glosa: "Líquido a pagar trabajadores", debe: 0, haber: Math.round(totLiquido) },
          { cuenta_codigo: "2.1.05", cuenta_nombre: "Cotizaciones Previsionales por Pagar", glosa: "AFP + Salud + Cesantía trab.", debe: 0, haber: Math.round(totAfp + totSalud + totCesantiaTr + totCargaEmp) },
          { cuenta_codigo: "2.1.06", cuenta_nombre: "Impuestos por Pagar",                  glosa: "Impuesto único 2ª categoría",  debe: 0, haber: Math.round(totImpUnico) },
          ...(otrosDesc > 0 ? [{ cuenta_codigo: "2.1.08", cuenta_nombre: "Otros Pasivos Corrientes", glosa: "Anticipos y otros descuentos", debe: 0, haber: Math.round(otrosDesc) }] : []),
        ]
      );
      vouchers_creados.push({ tipo: "remuneraciones", ...v });
    }
  }

  // ── VOUCHER DE F29 / IVA ─────────────────────────────────────────────────
  if (tipo === "f29" || tipo === "ambos") {
    const [f29] = await sql`SELECT * FROM periodos_f29 WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}`;

    if (f29) {
      const debitoFiscal  = Math.round(Number(f29.debito_fiscal));
      const creditoFiscal = Math.round(Number(f29.credito_fiscal));
      const ivaAPagar     = Math.round(Number(f29.iva_a_pagar));
      const ppm           = Math.round(Number(f29.ppm_monto));
      const remanente     = Math.round(Number(f29.remanente_credito));

      const lineasF29: any[] = [];
      if (debitoFiscal > 0) {
        lineasF29.push({ cuenta_codigo: "2.1.03", cuenta_nombre: "IVA Débito Fiscal", glosa: "Débito fiscal del período", debe: debitoFiscal, haber: 0 });
      }
      if (creditoFiscal > 0) {
        lineasF29.push({ cuenta_codigo: "1.1.05", cuenta_nombre: "IVA Crédito Fiscal", glosa: "Crédito fiscal del período", debe: 0, haber: creditoFiscal });
      }
      if (ivaAPagar > 0) {
        lineasF29.push({ cuenta_codigo: "2.1.06", cuenta_nombre: "Impuestos por Pagar", glosa: "IVA a pagar", debe: 0, haber: ivaAPagar });
      }
      if (remanente > 0) {
        lineasF29.push({ cuenta_codigo: "1.1.05", cuenta_nombre: "IVA Crédito Fiscal", glosa: "Remanente crédito fiscal", debe: remanente, haber: 0 });
      }
      if (ppm > 0) {
        lineasF29.push({ cuenta_codigo: "1.1.06", cuenta_nombre: "PPM por Recuperar", glosa: "PPM del período", debe: ppm, haber: 0 });
        lineasF29.push({ cuenta_codigo: "2.1.06", cuenta_nombre: "Impuestos por Pagar", glosa: "PPM a pagar", debe: 0, haber: ppm });
      }

      if (lineasF29.length > 0) {
        const v = await crearVoucher(empresa_id, periodo, fecha, "venta",
          `F29 ${periodo} — IVA y PPM`, lineasF29
        );
        vouchers_creados.push({ tipo: "f29", ...v });
      }
    }
  }

  if (!vouchers_creados.length) {
    return NextResponse.json({ error: "No hay datos para generar vouchers. Calcula las remuneraciones y/o el F29 primero." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, vouchers: vouchers_creados });
}
