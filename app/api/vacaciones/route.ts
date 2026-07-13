import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const trabajador_id = req.nextUrl.searchParams.get("trabajador_id");
  const empresa_id   = req.nextUrl.searchParams.get("empresa_id");
  if (!trabajador_id && !empresa_id) {
    return NextResponse.json({ error: "Falta trabajador_id o empresa_id" }, { status: 400 });
  }

  if (trabajador_id) {
    const [trab] = await sql`
      SELECT t.*, 
        COALESCE(SUM(v.dias_habiles), 0) as dias_tomados
      FROM trabajadores t
      LEFT JOIN vacaciones v ON v.trabajador_id = t.id AND v.tipo = 'tomada'
      WHERE t.id = ${trabajador_id}
      GROUP BY t.id
    `;
    const registros = await sql`
      SELECT * FROM vacaciones WHERE trabajador_id = ${trabajador_id}
      ORDER BY fecha_inicio DESC
    `;
    return NextResponse.json({ trabajador: trab, registros });
  }

  // Resumen por empresa: todos los trabajadores
  const resumen = await sql`
    SELECT 
      t.id, t.rut, t.nombres, t.apellidos, t.fecha_ingreso,
      t.dias_vacaciones_base, t.feriado_progresivo,
      COALESCE(SUM(CASE WHEN v.tipo = 'tomada' THEN v.dias_habiles ELSE 0 END), 0) as dias_tomados,
      t.activo
    FROM trabajadores t
    LEFT JOIN vacaciones v ON v.trabajador_id = t.id
    WHERE t.empresa_id = ${empresa_id} AND t.activo = true AND t.tipo_contrato != 'honorarios'
    GROUP BY t.id
    ORDER BY t.apellidos ASC
  `;
  return NextResponse.json({ resumen });
}

export async function POST(req: NextRequest) {
  const { trabajador_id, tipo, fecha_inicio, fecha_fin, dias_habiles, dias_corridos, observaciones } =
    await req.json();

  const [vac] = await sql`
    INSERT INTO vacaciones (trabajador_id, tipo, fecha_inicio, fecha_fin, dias_habiles, dias_corridos, observaciones)
    VALUES (${trabajador_id}, ${tipo || "tomada"}, ${fecha_inicio}, ${fecha_fin},
            ${dias_habiles || 0}, ${dias_corridos || 0}, ${observaciones || null})
    RETURNING id
  `;
  return NextResponse.json({ id: vac.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await sql`DELETE FROM vacaciones WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
