import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const incluirInactivas = req.nextUrl.searchParams.get("todas") === "1";

  const empresas = incluirInactivas
    ? await sql`
        SELECT id, rut, razon_social, nombre_fantasia, regimen_tributario, activa, notas_internas
        FROM empresas
        ORDER BY razon_social ASC
      `
    : await sql`
        SELECT id, rut, razon_social, nombre_fantasia, regimen_tributario, activa, notas_internas
        FROM empresas
        WHERE activa = true
        ORDER BY razon_social ASC
      `;

  return NextResponse.json({ empresas });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    rut, razon_social, nombre_fantasia, giro, regimen_tributario,
    representante_legal, direccion, email_contacto, telefono_contacto,
    mutualidad, tasa_accidentes, caja_compensacion,
    // duplicar desde otra empresa
    duplicar_desde_id,
  } = body;

  if (!rut || !razon_social) {
    return NextResponse.json({ error: "RUT y razón social son obligatorios" }, { status: 400 });
  }

  const [empresa] = await sql`
    INSERT INTO empresas (
      rut, razon_social, nombre_fantasia, giro, regimen_tributario,
      representante_legal, direccion, email_contacto, telefono_contacto,
      mutualidad, tasa_accidentes, caja_compensacion
    ) VALUES (
      ${rut}, ${razon_social}, ${nombre_fantasia || null}, ${giro || null}, ${regimen_tributario || null},
      ${representante_legal || null}, ${direccion || null}, ${email_contacto || null}, ${telefono_contacto || null},
      ${mutualidad || null}, ${tasa_accidentes || 0.95}, ${caja_compensacion || null}
    )
    RETURNING id
  `;

  // Si se pide duplicar plan de cuentas desde otra empresa
  if (duplicar_desde_id) {
    const cuentas = await sql`SELECT * FROM plan_cuentas WHERE empresa_id = ${duplicar_desde_id} AND activa = true`;
    for (const c of cuentas) {
      await sql`
        INSERT INTO plan_cuentas (empresa_id, codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable)
        VALUES (${empresa.id}, ${c.codigo}, ${c.nombre}, ${c.tipo}, ${c.subtipo || null}, ${c.cuenta_padre || null}, ${c.es_imputable})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  return NextResponse.json({ id: empresa.id }, { status: 201 });
}
