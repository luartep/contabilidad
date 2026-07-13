import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const trabajador_id = req.nextUrl.searchParams.get("trabajador_id");
  const empresa_id   = req.nextUrl.searchParams.get("empresa_id");

  if (trabajador_id) {
    const cargas = await sql`
      SELECT * FROM cargas_familiares WHERE trabajador_id = ${trabajador_id} AND activa = true
      ORDER BY tipo ASC, nombre ASC
    `;
    return NextResponse.json({ cargas });
  }
  if (empresa_id) {
    const resumen = await sql`
      SELECT t.id, t.nombres, t.apellidos, t.rut,
        COUNT(c.id) as total_cargas,
        json_agg(json_build_object('tipo', c.tipo, 'nombre', c.nombre)) FILTER (WHERE c.id IS NOT NULL) as cargas
      FROM trabajadores t
      LEFT JOIN cargas_familiares c ON c.trabajador_id = t.id AND c.activa = true
      WHERE t.empresa_id = ${empresa_id} AND t.activo = true
      GROUP BY t.id
      ORDER BY t.apellidos ASC
    `;
    return NextResponse.json({ resumen });
  }
  return NextResponse.json({ error: "Falta parámetro" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { trabajador_id, tipo, nombre, rut, fecha_nacimiento } = await req.json();
  const [c] = await sql`
    INSERT INTO cargas_familiares (trabajador_id, tipo, nombre, rut, fecha_nacimiento)
    VALUES (${trabajador_id}, ${tipo}, ${nombre}, ${rut || null}, ${fecha_nacimiento || null})
    RETURNING id
  `;
  return NextResponse.json({ id: c.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await sql`UPDATE cargas_familiares SET activa = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
