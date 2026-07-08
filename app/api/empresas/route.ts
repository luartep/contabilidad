import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const empresas = await sql`
    SELECT id, rut, razon_social, nombre_fantasia, regimen_tributario, activa
    FROM empresas
    ORDER BY razon_social ASC
  `;
  return NextResponse.json({ empresas });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    rut,
    razon_social,
    nombre_fantasia,
    giro,
    regimen_tributario,
    representante_legal,
    direccion,
    email_contacto,
    telefono_contacto,
    mutualidad,
    tasa_accidentes,
    caja_compensacion,
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

  return NextResponse.json({ id: empresa.id }, { status: 201 });
}
