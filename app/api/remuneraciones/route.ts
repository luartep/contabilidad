import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET: listar liquidaciones de un período
export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const liquidaciones = await sql`
    SELECT l.*,
           t.rut, t.nombres, t.apellidos, t.tipo_contrato, t.afp, t.sistema_salud, t.cargo
    FROM liquidaciones l
    JOIN trabajadores t ON t.id = l.trabajador_id
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
    ORDER BY t.apellidos ASC
  `;

  return NextResponse.json({ liquidaciones });
}

// PATCH: editar manualmente una liquidación
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...campos } = body;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  // Recalcular totales si se editan haberes o descuentos
  const liq = campos;
  const total_haberes_imponibles =
    (liq.sueldo_base || 0) + (liq.gratificacion || 0) + (liq.horas_extra_monto || 0) +
    (liq.comisiones || 0) + (liq.bono_imponible || 0) + (liq.otros_imponibles || 0);
  const total_haberes_no_imponibles =
    (liq.colacion || 0) + (liq.movilizacion || 0) + (liq.asignacion_familiar || 0) +
    (liq.bono_no_imponible || 0) + (liq.otros_no_imponibles || 0);
  const total_haberes = total_haberes_imponibles + total_haberes_no_imponibles;
  const total_descuentos_legales =
    (liq.afp_trabajador || 0) + (liq.afp_adicional || 0) + (liq.salud_trabajador || 0) +
    (liq.cesantia_trabajador || 0) + (liq.impuesto_unico || 0);
  const total_descuentos =
    total_descuentos_legales + (liq.descuentos_varios || 0) + (liq.anticipo || 0);
  const liquido_a_pagar = Math.max(0, total_haberes - total_descuentos);

  await sql`
    UPDATE liquidaciones SET
      sueldo_base = COALESCE(${liq.sueldo_base ?? null}, sueldo_base),
      gratificacion = COALESCE(${liq.gratificacion ?? null}, gratificacion),
      horas_extra_monto = COALESCE(${liq.horas_extra_monto ?? null}, horas_extra_monto),
      comisiones = COALESCE(${liq.comisiones ?? null}, comisiones),
      bono_imponible = COALESCE(${liq.bono_imponible ?? null}, bono_imponible),
      otros_imponibles = COALESCE(${liq.otros_imponibles ?? null}, otros_imponibles),
      colacion = COALESCE(${liq.colacion ?? null}, colacion),
      movilizacion = COALESCE(${liq.movilizacion ?? null}, movilizacion),
      asignacion_familiar = COALESCE(${liq.asignacion_familiar ?? null}, asignacion_familiar),
      bono_no_imponible = COALESCE(${liq.bono_no_imponible ?? null}, bono_no_imponible),
      otros_no_imponibles = COALESCE(${liq.otros_no_imponibles ?? null}, otros_no_imponibles),
      afp_trabajador = COALESCE(${liq.afp_trabajador ?? null}, afp_trabajador),
      afp_adicional = COALESCE(${liq.afp_adicional ?? null}, afp_adicional),
      salud_trabajador = COALESCE(${liq.salud_trabajador ?? null}, salud_trabajador),
      cesantia_trabajador = COALESCE(${liq.cesantia_trabajador ?? null}, cesantia_trabajador),
      impuesto_unico = COALESCE(${liq.impuesto_unico ?? null}, impuesto_unico),
      descuentos_varios = COALESCE(${liq.descuentos_varios ?? null}, descuentos_varios),
      anticipo = COALESCE(${liq.anticipo ?? null}, anticipo),
      notas = COALESCE(${liq.notas ?? null}, notas),
      total_haberes_imponibles = ${total_haberes_imponibles},
      total_haberes_no_imponibles = ${total_haberes_no_imponibles},
      total_haberes = ${total_haberes},
      total_descuentos_legales = ${total_descuentos_legales},
      total_descuentos = ${total_descuentos},
      liquido_a_pagar = ${liquido_a_pagar},
      editado_manualmente = true,
      actualizado_en = now()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true, liquido_a_pagar });
}
