import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const [trabajador] = await sql`
    SELECT t.*, cd.*
    FROM trabajadores t
    LEFT JOIN config_descuentos cd ON cd.trabajador_id = t.id
    WHERE t.id = ${id}
  `;
  if (!trabajador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const variables = await sql`
    SELECT * FROM variables_sueldo
    WHERE trabajador_id = ${id}
      AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
    ORDER BY concepto ASC
  `;

  return NextResponse.json({ trabajador, variables });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await req.json();
  const {
    nombres, apellidos, cargo, afp, sistema_salud, isapre_plan_uf,
    tipo_contrato, fecha_ingreso, activo,
    // config descuentos
    afp_automatico, salud_automatico, cesantia_automatico, impuesto_automatico,
  } = body;

  await sql`
    UPDATE trabajadores SET
      nombres = COALESCE(${nombres ?? null}, nombres),
      apellidos = COALESCE(${apellidos ?? null}, apellidos),
      cargo = COALESCE(${cargo ?? null}, cargo),
      afp = COALESCE(${afp ?? null}, afp),
      sistema_salud = COALESCE(${sistema_salud ?? null}, sistema_salud),
      isapre_plan_uf = COALESCE(${isapre_plan_uf ?? null}, isapre_plan_uf),
      tipo_contrato = COALESCE(${tipo_contrato ?? null}, tipo_contrato),
      fecha_ingreso = COALESCE(${fecha_ingreso ?? null}, fecha_ingreso),
      activo = COALESCE(${activo ?? null}, activo)
    WHERE id = ${id}
  `;

  if (
    afp_automatico !== undefined ||
    salud_automatico !== undefined ||
    cesantia_automatico !== undefined ||
    impuesto_automatico !== undefined
  ) {
    await sql`
      INSERT INTO config_descuentos (trabajador_id, afp_automatico, salud_automatico, cesantia_automatico, impuesto_automatico)
      VALUES (${id}, ${afp_automatico ?? true}, ${salud_automatico ?? true}, ${cesantia_automatico ?? true}, ${impuesto_automatico ?? true})
      ON CONFLICT (trabajador_id) DO UPDATE SET
        afp_automatico = EXCLUDED.afp_automatico,
        salud_automatico = EXCLUDED.salud_automatico,
        cesantia_automatico = EXCLUDED.cesantia_automatico,
        impuesto_automatico = EXCLUDED.impuesto_automatico
    `;
  }

  return NextResponse.json({ ok: true });
}
