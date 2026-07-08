import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresaId = req.nextUrl.searchParams.get("empresa_id");
  if (!empresaId) {
    return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });
  }
  const trabajadores = await sql`
    SELECT id, rut, nombres, apellidos, tipo_contrato, cargo, afp, sistema_salud, activo
    FROM trabajadores
    WHERE empresa_id = ${empresaId}
    ORDER BY apellidos ASC
  `;
  return NextResponse.json({ trabajadores });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    empresa_id, rut, nombres, apellidos, tipo_contrato,
    cargo, fecha_ingreso, afp, sistema_salud, isapre_plan_uf,
  } = body;

  if (!empresa_id || !rut || !nombres || !apellidos || !tipo_contrato) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const [trabajador] = await sql`
    INSERT INTO trabajadores (
      empresa_id, rut, nombres, apellidos, tipo_contrato,
      cargo, fecha_ingreso, afp, sistema_salud, isapre_plan_uf
    ) VALUES (
      ${empresa_id}, ${rut}, ${nombres}, ${apellidos}, ${tipo_contrato},
      ${cargo || null}, ${fecha_ingreso || null}, ${afp || null},
      ${sistema_salud || null}, ${isapre_plan_uf || null}
    )
    RETURNING id
  `;

  // Config de descuentos por defecto: todo automático (el contador puede
  // desmarcarlo después desde la ficha del trabajador).
  await sql`
    INSERT INTO config_descuentos (trabajador_id) VALUES (${trabajador.id})
  `;

  return NextResponse.json({ id: trabajador.id }, { status: 201 });
}
