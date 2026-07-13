import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { calcularFiniquito, calcularVacacionesPendientes, InputFiniquito } from "@/lib/calculoFiniquito";

export async function GET(req: NextRequest) {
  const empresa_id   = req.nextUrl.searchParams.get("empresa_id");
  const trabajador_id = req.nextUrl.searchParams.get("trabajador_id");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const finiquitos = await sql`
    SELECT f.*, t.nombres, t.apellidos, t.rut, t.fecha_ingreso
    FROM finiquitos f
    JOIN trabajadores t ON t.id = f.trabajador_id
    WHERE f.empresa_id = ${empresa_id}
      ${trabajador_id ? sql`AND f.trabajador_id = ${trabajador_id}` : sql``}
    ORDER BY f.creado_en DESC
  `;
  return NextResponse.json({ finiquitos });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    empresa_id, trabajador_id, fecha_termino, causal,
    promedio_ultimos_3_meses, vacaciones_pendientes_dias,
    dias_trabajados_mes_termino, dias_mes_termino,
    otros_haberes, descuentos, tiene_aviso_previo, observaciones,
  } = body;

  const [trab] = await sql`SELECT * FROM trabajadores WHERE id = ${trabajador_id}`;
  if (!trab) return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });

  const input: InputFiniquito = {
    fecha_ingreso: trab.fecha_ingreso?.toISOString?.()?.slice(0, 10) || trab.fecha_ingreso,
    fecha_termino,
    causal,
    sueldo_base: 0,
    promedio_ultimos_3_meses: Number(promedio_ultimos_3_meses) || 0,
    vacaciones_pendientes_dias: Number(vacaciones_pendientes_dias) || 0,
    dias_trabajados_mes_termino: Number(dias_trabajados_mes_termino) || 30,
    dias_mes_termino: Number(dias_mes_termino) || 30,
    otros_haberes: Number(otros_haberes) || 0,
    descuentos: Number(descuentos) || 0,
    tiene_aviso_previo: tiene_aviso_previo === true || tiene_aviso_previo === "true",
  };

  const resultado = calcularFiniquito(input);

  const [fin] = await sql`
    INSERT INTO finiquitos (
      trabajador_id, empresa_id, fecha_termino, causal,
      anios_servicio, sueldo_base_promedio,
      indemnizacion_anios, indemnizacion_anios_meses,
      aviso_previo, vacaciones_pendientes_dias, vacaciones_pendientes_monto,
      proporcional_mes, otros_haberes, descuentos_finiquito,
      total_finiquito, observaciones
    ) VALUES (
      ${trabajador_id}, ${empresa_id}, ${fecha_termino}, ${causal},
      ${resultado.anios_servicio}, ${resultado.sueldo_base_promedio},
      ${resultado.indemnizacion_anios}, ${resultado.indemnizacion_sustitutiva_aviso},
      ${resultado.indemnizacion_sustitutiva_aviso}, ${resultado.vacaciones_pendientes_monto > 0 ? input.vacaciones_pendientes_dias : 0},
      ${resultado.vacaciones_pendientes_monto}, ${resultado.proporcional_mes},
      ${resultado.otros_haberes}, ${resultado.descuentos},
      ${resultado.total_finiquito}, ${observaciones || null}
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  return NextResponse.json({ ok: true, id: fin?.id, resultado });
}

export async function PATCH(req: NextRequest) {
  const { id, estado } = await req.json();
  await sql`UPDATE finiquitos SET estado = ${estado} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
