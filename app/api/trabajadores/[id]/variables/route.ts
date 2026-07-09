import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// Upsert de todas las variables de sueldo de un trabajador
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { variables } = await req.json();
  // variables: [{ concepto, monto, es_imponible, es_tributable }]

  for (const v of variables) {
    if (!v.concepto) continue;
    if (v.monto === 0 || v.monto === "" || v.monto === null) {
      // Si el monto es 0 o vacío, vencer la variable existente
      await sql`
        UPDATE variables_sueldo
        SET vigente_hasta = CURRENT_DATE - INTERVAL '1 day'
        WHERE trabajador_id = ${id} AND concepto = ${v.concepto}
          AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      `;
    } else {
      // Vencer la anterior y crear una nueva
      await sql`
        UPDATE variables_sueldo
        SET vigente_hasta = CURRENT_DATE - INTERVAL '1 day'
        WHERE trabajador_id = ${id} AND concepto = ${v.concepto}
          AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      `;
      await sql`
        INSERT INTO variables_sueldo (trabajador_id, concepto, monto, es_imponible, es_tributable)
        VALUES (${id}, ${v.concepto}, ${v.monto}, ${v.es_imponible ?? true}, ${v.es_tributable ?? true})
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
