import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const trabajador_id = req.nextUrl.searchParams.get("trabajador_id");
  if (!trabajador_id) return NextResponse.json({ error: "Falta trabajador_id" }, { status: 400 });
  const [apv] = await sql`SELECT * FROM apv_trabajador WHERE trabajador_id = ${trabajador_id}`;
  return NextResponse.json({ apv: apv || null });
}

export async function POST(req: NextRequest) {
  const { trabajador_id, tiene_apv, modalidad_apv, monto_apv, institucion_apv, codigo_institucion } =
    await req.json();

  await sql`
    INSERT INTO apv_trabajador (trabajador_id, tiene_apv, modalidad_apv, monto_apv, institucion_apv, codigo_institucion)
    VALUES (${trabajador_id}, ${tiene_apv}, ${modalidad_apv || "A"}, ${monto_apv || 0},
            ${institucion_apv || null}, ${codigo_institucion || null})
    ON CONFLICT (trabajador_id) DO UPDATE SET
      tiene_apv = EXCLUDED.tiene_apv,
      modalidad_apv = EXCLUDED.modalidad_apv,
      monto_apv = EXCLUDED.monto_apv,
      institucion_apv = EXCLUDED.institucion_apv,
      codigo_institucion = EXCLUDED.codigo_institucion
  `;

  return NextResponse.json({ ok: true });
}
