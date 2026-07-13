import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const centros = await sql`
    SELECT cc.*,
      (SELECT COUNT(*) FROM voucher_lineas vl WHERE vl.centro_costo_id = cc.id) as usos_vouchers,
      (SELECT COALESCE(SUM(vl.debe),0) FROM voucher_lineas vl
       JOIN vouchers v ON v.id = vl.voucher_id
       WHERE vl.centro_costo_id = cc.id AND v.empresa_id = ${empresa_id}) as total_debe,
      (SELECT COALESCE(SUM(vl.haber),0) FROM voucher_lineas vl
       JOIN vouchers v ON v.id = vl.voucher_id
       WHERE vl.centro_costo_id = cc.id AND v.empresa_id = ${empresa_id}) as total_haber
    FROM centros_costo cc
    WHERE cc.empresa_id = ${empresa_id} AND cc.activo = true
    ORDER BY cc.codigo ASC
  `;
  return NextResponse.json({ centros });
}

export async function POST(req: NextRequest) {
  const { empresa_id, codigo, nombre, descripcion, tipo } = await req.json();
  if (!empresa_id || !codigo || !nombre) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  const [cc] = await sql`
    INSERT INTO centros_costo (empresa_id, codigo, nombre, descripcion, tipo)
    VALUES (${empresa_id}, ${codigo}, ${nombre}, ${descripcion || null}, ${tipo || "proyecto"})
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, activo = true
    RETURNING id
  `;
  return NextResponse.json({ id: cc.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await sql`UPDATE centros_costo SET activo = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
