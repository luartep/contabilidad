import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { calcularF29, DocumentoF29 } from "@/lib/calculoF29";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;
  const [periodo_f29] = await sql`
    SELECT * FROM periodos_f29 WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;
  const documentos = await sql`
    SELECT * FROM documentos_f29
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
    ORDER BY tipo ASC, fecha ASC
  `;

  // Traer impuesto único del período de remuneraciones
  const impUnico = await sql`
    SELECT COALESCE(SUM(l.impuesto_unico), 0) as total
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
  `;

  return NextResponse.json({
    empresa,
    periodo_f29: periodo_f29 || null,
    documentos,
    impuesto_unico_trab: Number(impUnico[0]?.total || 0),
  });
}

export async function POST(req: NextRequest) {
  // Calcular y guardar el F29 del período
  const body = await req.json();
  const { empresa_id, periodo, remanente_anterior = 0 } = body;
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const documentos = await sql`
    SELECT * FROM documentos_f29
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;

  const impUnico = await sql`
    SELECT COALESCE(SUM(l.impuesto_unico), 0) as total
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
  `;

  const docs: DocumentoF29[] = documentos.map((d: any) => ({
    tipo: d.tipo,
    tipo_documento: d.tipo_documento,
    monto_neto: Number(d.monto_neto),
    monto_iva: Number(d.monto_iva),
    monto_exento: Number(d.monto_exento),
    es_nota_credito: d.es_nota_credito,
    retencion_honorario: Number(d.retencion_honorario),
  }));

  const resultado = calcularF29(
    docs,
    empresa.regimen_iva || "general",
    Number(empresa.tasa_ppm || 0.25),
    Number(impUnico[0]?.total || 0),
    remanente_anterior
  );

  await sql`
    INSERT INTO periodos_f29 (
      empresa_id, periodo,
      debito_fiscal, credito_fiscal, iva_a_pagar, remanente_credito,
      ppm_base, ppm_monto, retenciones_honorarios,
      impuesto_unico_trab, total_a_pagar
    ) VALUES (
      ${empresa_id}, ${periodo},
      ${resultado.debito_fiscal}, ${resultado.credito_fiscal},
      ${resultado.iva_a_pagar}, ${resultado.remanente_credito},
      ${resultado.ppm_base}, ${resultado.ppm_monto},
      ${resultado.retenciones_honorarios}, ${resultado.impuesto_unico_trab},
      ${resultado.total_a_pagar}
    )
    ON CONFLICT (empresa_id, periodo) DO UPDATE SET
      debito_fiscal = EXCLUDED.debito_fiscal,
      credito_fiscal = EXCLUDED.credito_fiscal,
      iva_a_pagar = EXCLUDED.iva_a_pagar,
      remanente_credito = EXCLUDED.remanente_credito,
      ppm_base = EXCLUDED.ppm_base,
      ppm_monto = EXCLUDED.ppm_monto,
      retenciones_honorarios = EXCLUDED.retenciones_honorarios,
      impuesto_unico_trab = EXCLUDED.impuesto_unico_trab,
      total_a_pagar = EXCLUDED.total_a_pagar,
      actualizado_en = now()
  `;

  return NextResponse.json({ ok: true, resultado });
}

export async function PATCH(req: NextRequest) {
  const { empresa_id, periodo, estado, observaciones } = await req.json();
  await sql`
    UPDATE periodos_f29
    SET estado = COALESCE(${estado ?? null}, estado),
        observaciones = COALESCE(${observaciones ?? null}, observaciones),
        actualizado_en = now()
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;
  return NextResponse.json({ ok: true });
}
