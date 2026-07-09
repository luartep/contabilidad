import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const periodo = req.nextUrl.searchParams.get("periodo");
  if (periodo) {
    const [param] = await sql`SELECT * FROM parametros_periodo WHERE periodo = ${periodo}`;
    const tramos = param
      ? await sql`SELECT * FROM tramos_impuesto_unico WHERE periodo = ${periodo} ORDER BY tramo ASC`
      : [];
    return NextResponse.json({ parametro: param || null, tramos });
  }
  const parametros = await sql`SELECT * FROM parametros_periodo ORDER BY periodo DESC`;
  return NextResponse.json({ parametros });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    periodo, uf, utm, imm,
    tope_imponible_afp_salud_uf, tope_imponible_cesantia_uf,
    tasa_afc_indefinido_trabajador, tasa_afc_indefinido_empleador,
    tasa_afc_plazo_fijo_empleador, tasa_salud_fonasa,
    tramos,
  } = body;

  if (!periodo || !uf || !utm) {
    return NextResponse.json({ error: "periodo, uf y utm son obligatorios" }, { status: 400 });
  }

  await sql`
    INSERT INTO parametros_periodo (
      periodo, uf, utm, imm,
      tope_imponible_afp_salud_uf, tope_imponible_cesantia_uf,
      tasa_afc_indefinido_trabajador, tasa_afc_indefinido_empleador,
      tasa_afc_plazo_fijo_empleador, tasa_salud_fonasa
    ) VALUES (
      ${periodo}, ${uf}, ${utm}, ${imm || 510966},
      ${tope_imponible_afp_salud_uf || 90.0}, ${tope_imponible_cesantia_uf || 135.2},
      ${tasa_afc_indefinido_trabajador || 0.6}, ${tasa_afc_indefinido_empleador || 2.4},
      ${tasa_afc_plazo_fijo_empleador || 3.0}, ${tasa_salud_fonasa || 7.0}
    )
    ON CONFLICT (periodo) DO UPDATE SET
      uf = EXCLUDED.uf,
      utm = EXCLUDED.utm,
      imm = EXCLUDED.imm,
      tope_imponible_afp_salud_uf = EXCLUDED.tope_imponible_afp_salud_uf,
      tope_imponible_cesantia_uf = EXCLUDED.tope_imponible_cesantia_uf,
      tasa_afc_indefinido_trabajador = EXCLUDED.tasa_afc_indefinido_trabajador,
      tasa_afc_indefinido_empleador = EXCLUDED.tasa_afc_indefinido_empleador,
      tasa_afc_plazo_fijo_empleador = EXCLUDED.tasa_afc_plazo_fijo_empleador,
      tasa_salud_fonasa = EXCLUDED.tasa_salud_fonasa
  `;

  if (Array.isArray(tramos)) {
    await sql`DELETE FROM tramos_impuesto_unico WHERE periodo = ${periodo}`;
    for (const t of tramos) {
      await sql`
        INSERT INTO tramos_impuesto_unico (periodo, tramo, desde, hasta, factor, rebaja)
        VALUES (${periodo}, ${t.tramo}, ${t.desde}, ${t.hasta || null}, ${t.factor}, ${t.rebaja})
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
