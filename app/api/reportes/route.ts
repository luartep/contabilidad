import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo    = req.nextUrl.searchParams.get("periodo");
  const tipo       = req.nextUrl.searchParams.get("tipo");
  // tipo: 'estado_resultados' | 'balance_general' | 'excel_liquidaciones' | 'excel_f29' | 'excel_remuneraciones'

  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;

  // ── EXCEL: Liquidaciones del período ──────────────────────────────────────
  if (tipo === "excel_liquidaciones" && periodo) {
    const liq = await sql`
      SELECT l.*, t.rut, t.nombres, t.apellidos, t.cargo, t.afp, t.sistema_salud
      FROM liquidaciones l
      JOIN trabajadores t ON t.id = l.trabajador_id
      JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
      WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
      ORDER BY t.apellidos ASC
    `;

    const datos = liq.map((l: any) => ({
      "RUT":               l.rut,
      "Nombres":           l.nombres,
      "Apellidos":         l.apellidos,
      "Cargo":             l.cargo || "",
      "Sueldo Base":       Number(l.sueldo_base),
      "Gratificación":     Number(l.gratificacion),
      "Horas Extra":       Number(l.horas_extra_monto),
      "Comisiones":        Number(l.comisiones),
      "Bono Imponible":    Number(l.bono_imponible),
      "Colación":          Number(l.colacion),
      "Movilización":      Number(l.movilizacion),
      "Total Imponible":   Number(l.total_haberes_imponibles),
      "Total No Imponible":Number(l.total_haberes_no_imponibles),
      "Total Haberes":     Number(l.total_haberes),
      "AFP":               Number(l.afp_trabajador),
      "Comisión AFP":      Number(l.afp_adicional),
      "Salud":             Number(l.salud_trabajador),
      "Cesantía Trab.":    Number(l.cesantia_trabajador),
      "Imp. Único":        Number(l.impuesto_unico),
      "Total Desc. Legales":Number(l.total_descuentos_legales),
      "Otros Descuentos":  Number(l.descuentos_varios),
      "Anticipo":          Number(l.anticipo),
      "Total Descuentos":  Number(l.total_descuentos),
      "Líquido a Pagar":   Number(l.liquido_a_pagar),
      "Cesantía Empleador":Number(l.cesantia_empleador),
      "SIS":               Number(l.sis_empleador),
      "Accidentes":        Number(l.accidente_empleador),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    ws["!cols"] = Object.keys(datos[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, `Remuneraciones ${periodo}`);

    // Hoja resumen
    const total = (campo: string) => liq.reduce((s: number, l: any) => s + Number(l[campo] || 0), 0);
    const resumen = [
      { "Concepto": "Total Haberes", "Monto": total("total_haberes") },
      { "Concepto": "Total Descuentos Legales", "Monto": total("total_descuentos_legales") },
      { "Concepto": "Total Líquido a Pagar", "Monto": total("liquido_a_pagar") },
      { "Concepto": "Total Cotizaciones AFP", "Monto": total("afp_trabajador") + total("afp_adicional") },
      { "Concepto": "Total Salud", "Monto": total("salud_trabajador") },
      { "Concepto": "Total Cesantía Trabajador", "Monto": total("cesantia_trabajador") },
      { "Concepto": "Total Cesantía Empleador", "Monto": total("cesantia_empleador") },
      { "Concepto": "Total SIS", "Monto": total("sis_empleador") },
      { "Concepto": "Total Accidentes", "Monto": total("accidente_empleador") },
      { "Concepto": "Total Impuesto Único", "Monto": total("impuesto_unico") },
    ];
    const wsRes = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsRes, "Resumen");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="liquidaciones_${empresa.rut?.replace(/[^0-9kK]/g,"")}_${periodo}.xlsx"`,
      },
    });
  }

  // ── EXCEL: F29 del período ─────────────────────────────────────────────────
  if (tipo === "excel_f29" && periodo) {
    const docs = await sql`
      SELECT * FROM documentos_f29 WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
      ORDER BY tipo ASC, fecha ASC
    `;
    const [f29] = await sql`SELECT * FROM periodos_f29 WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}`;

    const datos = docs.map((d: any) => ({
      "Tipo":            d.tipo,
      "Tipo Documento":  d.tipo_documento,
      "Folio":           d.folio || "",
      "RUT Contraparte": d.rut_contraparte || "",
      "Razón Social":    d.razon_social_contraparte || "",
      "Fecha":           d.fecha,
      "Neto":            Number(d.monto_neto),
      "IVA":             Number(d.monto_iva),
      "Exento":          Number(d.monto_exento),
      "Total":           Number(d.monto_total),
      "Nota Crédito":    d.es_nota_credito ? "Sí" : "No",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, `Documentos ${periodo}`);

    if (f29) {
      const resumen = [
        { "Concepto": "Débito Fiscal",       "Monto": Number(f29.debito_fiscal) },
        { "Concepto": "Crédito Fiscal",      "Monto": Number(f29.credito_fiscal) },
        { "Concepto": "IVA a Pagar",         "Monto": Number(f29.iva_a_pagar) },
        { "Concepto": "Remanente Crédito",   "Monto": Number(f29.remanente_credito) },
        { "Concepto": "PPM",                 "Monto": Number(f29.ppm_monto) },
        { "Concepto": "Retenc. Honorarios",  "Monto": Number(f29.retenciones_honorarios) },
        { "Concepto": "Imp. Único Trab.",    "Monto": Number(f29.impuesto_unico_trab) },
        { "Concepto": "TOTAL F29",           "Monto": Number(f29.total_a_pagar) },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen F29");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="f29_${empresa.rut?.replace(/[^0-9kK]/g,"")}_${periodo}.xlsx"`,
      },
    });
  }

  // ── ESTADO DE RESULTADOS ───────────────────────────────────────────────────
  if (tipo === "estado_resultados") {
    const saldos = await sql`
      SELECT vl.cuenta_codigo, pc.nombre, pc.tipo,
        SUM(vl.debe) as debe, SUM(vl.haber) as haber
      FROM voucher_lineas vl
      JOIN vouchers v ON v.id = vl.voucher_id
      JOIN plan_cuentas pc ON pc.empresa_id = v.empresa_id AND pc.codigo = vl.cuenta_codigo
      WHERE v.empresa_id = ${empresa_id}
        ${periodo ? sql`AND v.periodo = ${periodo}` : sql``}
        AND pc.tipo IN ('ingreso', 'egreso')
        AND pc.es_imputable = true
      GROUP BY vl.cuenta_codigo, pc.nombre, pc.tipo
      ORDER BY vl.cuenta_codigo ASC
    `;

    const ingresos = saldos.filter((s: any) => s.tipo === "ingreso");
    const egresos  = saldos.filter((s: any) => s.tipo === "egreso");

    const totalIngresos = ingresos.reduce((s: number, c: any) => s + Number(c.haber) - Number(c.debe), 0);
    const totalEgresos  = egresos.reduce((s: number, c: any)  => s + Number(c.debe) - Number(c.haber), 0);
    const resultado     = totalIngresos - totalEgresos;

    return NextResponse.json({ ingresos, egresos, totalIngresos, totalEgresos, resultado });
  }

  // ── BALANCE GENERAL ────────────────────────────────────────────────────────
  if (tipo === "balance_general") {
    const saldos = await sql`
      SELECT vl.cuenta_codigo, pc.nombre, pc.tipo, pc.subtipo,
        SUM(vl.debe) as debe, SUM(vl.haber) as haber,
        SUM(vl.debe) - SUM(vl.haber) as saldo
      FROM voucher_lineas vl
      JOIN vouchers v ON v.id = vl.voucher_id
      JOIN plan_cuentas pc ON pc.empresa_id = v.empresa_id AND pc.codigo = vl.cuenta_codigo
      WHERE v.empresa_id = ${empresa_id}
        ${periodo ? sql`AND v.periodo <= ${periodo}` : sql``}
        AND pc.es_imputable = true
      GROUP BY vl.cuenta_codigo, pc.nombre, pc.tipo, pc.subtipo
      ORDER BY vl.cuenta_codigo ASC
    `;

    const activos    = saldos.filter((s: any) => s.tipo === "activo");
    const pasivos    = saldos.filter((s: any) => s.tipo === "pasivo");
    const patrimonio = saldos.filter((s: any) => s.tipo === "patrimonio");

    const totalActivos    = activos.reduce((s: number, c: any) => s + Number(c.saldo), 0);
    const totalPasivos    = Math.abs(pasivos.reduce((s: number, c: any) => s + Number(c.saldo), 0));
    const totalPatrimonio = Math.abs(patrimonio.reduce((s: number, c: any) => s + Number(c.saldo), 0));

    return NextResponse.json({ activos, pasivos, patrimonio, totalActivos, totalPasivos, totalPatrimonio });
  }

  return NextResponse.json({ error: "Tipo de reporte no reconocido" }, { status: 400 });
}
