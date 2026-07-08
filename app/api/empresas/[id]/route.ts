import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${params.id}`;
  if (!empresa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ empresa });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const fields = [
    "rut", "razon_social", "nombre_fantasia", "giro", "regimen_tributario",
    "representante_legal", "direccion", "email_contacto", "telefono_contacto",
    "mutualidad", "tasa_accidentes", "caja_compensacion", "activa",
  ];

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = $${i}`);
      values.push(body[f]);
      i++;
    }
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }
  values.push(params.id);

  const query = `UPDATE empresas SET ${updates.join(", ")} WHERE id = $${i}`;
  await sql(query, values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await sql`UPDATE empresas SET activa = false WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
