import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id    = req.nextUrl.searchParams.get("empresa_id");
  const trabajador_id = req.nextUrl.searchParams.get("trabajador_id");

  if (trabajador_id) {
    const prestamos = await sql`
      SELECT p.*, 
        (SELECT json_agg(pc ORDER BY pc.pagado_en DESC) FROM prestamo_cuotas pc WHERE pc.prestamo_id = p.id) as cuotas
      FROM prestamos p
      WHERE p.trabajador_id = ${trabajador_id}
      ORDER BY p.creado_en DESC
    `;
    return NextResponse.json({ prestamos });
  }

  if (empresa_id) {
    const prestamos = await sql`
      SELECT p.*, t.nombres, t.apellidos, t.rut
      FROM prestamos p
      JOIN trabajadores t ON t.id = p.trabajador_id
      WHERE t.empresa_id = ${empresa_id} AND p.activo = true AND p.saldo_pendiente > 0
      ORDER BY t.apellidos ASC
    `;
    return NextResponse.json({ prestamos });
  }
  return NextResponse.json({ error: "Falta parámetro" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { trabajador_id, tipo, monto_total, cuotas, fecha_inicio, observaciones } = await req.json();
  const cuota_mensual = Math.round(Number(monto_total) / Number(cuotas));
  const [p] = await sql`
    INSERT INTO prestamos (trabajador_id, tipo, monto_total, cuotas, cuota_mensual, saldo_pendiente, fecha_inicio, observaciones)
    VALUES (${trabajador_id}, ${tipo || "prestamo"}, ${monto_total}, ${cuotas}, ${cuota_mensual},
            ${monto_total}, ${fecha_inicio || new Date().toISOString().slice(0,10)}, ${observaciones || null})
    RETURNING id
  `;
  return NextResponse.json({ id: p.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { prestamo_id, periodo, monto, liquidacion_id } = await req.json();
  // Registrar pago de cuota
  await sql`
    INSERT INTO prestamo_cuotas (prestamo_id, periodo, monto, liquidacion_id)
    VALUES (${prestamo_id}, ${periodo}, ${monto}, ${liquidacion_id || null})
  `;
  // Actualizar saldo y cuotas pagadas
  await sql`
    UPDATE prestamos SET
      cuotas_pagadas = cuotas_pagadas + 1,
      saldo_pendiente = saldo_pendiente - ${monto},
      activo = CASE WHEN saldo_pendiente - ${monto} <= 0 THEN false ELSE true END
    WHERE id = ${prestamo_id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await sql`UPDATE prestamos SET activo = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
