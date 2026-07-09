import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan empresa_id y periodo" }, { status: 400 });
  }
  const [per] = await sql`
    SELECT * FROM periodos_remuneracion
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;
  return NextResponse.json({ periodo: per || null });
}

export async function POST(req: NextRequest) {
  const { empresa_id, periodo, gratificacion_tipo } = await req.json();
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  const [per] = await sql`
    INSERT INTO periodos_remuneracion (empresa_id, periodo, gratificacion_tipo)
    VALUES (${empresa_id}, ${periodo}, ${gratificacion_tipo || 'garantizada'})
    ON CONFLICT (empresa_id, periodo) DO UPDATE
      SET gratificacion_tipo = EXCLUDED.gratificacion_tipo
    RETURNING *
  `;
  return NextResponse.json({ periodo: per });
}

export async function PATCH(req: NextRequest) {
  const { empresa_id, periodo, estado, observaciones } = await req.json();
  await sql`
    UPDATE periodos_remuneracion
    SET estado = COALESCE(${estado}, estado),
        observaciones = COALESCE(${observaciones}, observaciones)
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;
  return NextResponse.json({ ok: true });
}
