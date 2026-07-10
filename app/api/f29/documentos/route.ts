import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    empresa_id, periodo, tipo, tipo_documento,
    folio, rut_contraparte, razon_social_contraparte,
    fecha, monto_neto, monto_iva, monto_exento, monto_total,
    retencion_honorario, es_nota_credito, observaciones,
  } = body;

  if (!empresa_id || !periodo || !tipo || !tipo_documento) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Auto-calcular IVA si no viene (19% sobre neto)
  const iva = monto_iva ?? Math.round((monto_neto || 0) * 0.19);
  const total = monto_total ?? ((monto_neto || 0) + iva + (monto_exento || 0));

  const [doc] = await sql`
    INSERT INTO documentos_f29 (
      empresa_id, periodo, tipo, tipo_documento,
      folio, rut_contraparte, razon_social_contraparte,
      fecha, monto_neto, monto_iva, monto_exento, monto_total,
      retencion_honorario, es_nota_credito, observaciones
    ) VALUES (
      ${empresa_id}, ${periodo}, ${tipo}, ${tipo_documento},
      ${folio || null}, ${rut_contraparte || null}, ${razon_social_contraparte || null},
      ${fecha || new Date().toISOString().slice(0, 10)},
      ${monto_neto || 0}, ${iva}, ${monto_exento || 0}, ${total},
      ${retencion_honorario || 0}, ${es_nota_credito || false}, ${observaciones || null}
    )
    RETURNING id
  `;

  return NextResponse.json({ id: doc.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  await sql`DELETE FROM documentos_f29 WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
