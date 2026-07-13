import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { PLAN_CUENTAS_BASE } from "@/lib/planCuentasBase";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const cuentas = await sql`
    SELECT * FROM plan_cuentas WHERE empresa_id = ${empresa_id} AND activa = true
    ORDER BY codigo ASC
  `;
  return NextResponse.json({ cuentas });
}

export async function POST(req: NextRequest) {
  const { empresa_id, cargar_base } = await req.json();
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  if (cargar_base) {
    // Cargar el plan base si la empresa no tiene ninguno
    const existentes = await sql`SELECT COUNT(*) as c FROM plan_cuentas WHERE empresa_id = ${empresa_id}`;
    if (Number(existentes[0].c) > 0) {
      return NextResponse.json({ error: "La empresa ya tiene un plan de cuentas. Agrega cuentas individualmente." }, { status: 400 });
    }
    for (const c of PLAN_CUENTAS_BASE) {
      await sql`
        INSERT INTO plan_cuentas (empresa_id, codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable)
        VALUES (${empresa_id}, ${c.codigo}, ${c.nombre}, ${c.tipo}, ${(c as any).subtipo || null},
                ${(c as any).cuenta_padre || null}, ${c.es_imputable !== false})
        ON CONFLICT (empresa_id, codigo) DO NOTHING
      `;
    }
    return NextResponse.json({ ok: true, cuentas: PLAN_CUENTAS_BASE.length });
  }

  // Agregar una cuenta individual
  const body = await req.json();
  const { codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable } = body;
  await sql`
    INSERT INTO plan_cuentas (empresa_id, codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable)
    VALUES (${empresa_id}, ${codigo}, ${nombre}, ${tipo}, ${subtipo || null},
            ${cuenta_padre || null}, ${es_imputable !== false})
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre, activa = true
  `;
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { empresa_id, codigo, nombre, activa } = await req.json();
  await sql`
    UPDATE plan_cuentas SET
      nombre = COALESCE(${nombre ?? null}, nombre),
      activa = COALESCE(${activa ?? null}, activa)
    WHERE empresa_id = ${empresa_id} AND codigo = ${codigo}
  `;
  return NextResponse.json({ ok: true });
}
