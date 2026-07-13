import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { VIDAS_UTILES_SII } from "@/lib/activosSII";

function calcularDepreciacion(
  valorAdquisicion: number, valorResidual: number,
  vidaUtilAnios: number, metodo: string,
  aniosTranscurridos: number
): { mensual: number; acumulada: number; valorLibro: number } {
  const base = valorAdquisicion - valorResidual;
  if (metodo === "acelerada") {
    // Depreciación acelerada: vida útil / 3 (mínimo 1 año)
    const vidaAcelerada = Math.max(1, Math.floor(vidaUtilAnios / 3));
    const anual = base / vidaAcelerada;
    const mensual = anual / 12;
    const acumulada = Math.min(base, mensual * aniosTranscurridos * 12);
    return { mensual: Math.round(mensual), acumulada: Math.round(acumulada), valorLibro: Math.max(valorResidual, valorAdquisicion - acumulada) };
  }
  // Lineal
  const anual = base / vidaUtilAnios;
  const mensual = anual / 12;
  const acumulada = Math.min(base, mensual * aniosTranscurridos * 12);
  return { mensual: Math.round(mensual), acumulada: Math.round(acumulada), valorLibro: Math.max(valorResidual, valorAdquisicion - acumulada) };
}

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo    = req.nextUrl.searchParams.get("periodo");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const activos = await sql`
    SELECT a.*,
      (SELECT SUM(d.monto_depreciacion) FROM depreciaciones d WHERE d.activo_id = a.id) as dep_acumulada_total
    FROM activos_fijos a
    WHERE a.empresa_id = ${empresa_id} AND a.activo = true
    ORDER BY a.fecha_adquisicion ASC
  `;

  // Calcular depreciación mensual proyectada para cada activo
  const hoy = new Date();
  const activosConDep = activos.map((a: any) => {
    const adq = new Date(a.fecha_adquisicion);
    const aniosTranscurridos = (hoy.getTime() - adq.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const dep = calcularDepreciacion(
      Number(a.valor_adquisicion), Number(a.valor_residual),
      a.vida_util_anios, a.metodo_depreciacion, aniosTranscurridos
    );
    return { ...a, dep_mensual: dep.mensual, valor_libro_actual: dep.valorLibro };
  });

  return NextResponse.json({ activos: activosConDep });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { empresa_id, nombre, descripcion, categoria, numero_serie, fecha_adquisicion,
          valor_adquisicion, valor_residual, vida_util_anios, metodo_depreciacion,
          cuenta_activo, cuenta_depreciacion, cuenta_dep_acumulada } = body;

  const vidaUtil = vida_util_anios || VIDAS_UTILES_SII[categoria] || 10;

  const [activo] = await sql`
    INSERT INTO activos_fijos (
      empresa_id, nombre, descripcion, categoria, numero_serie, fecha_adquisicion,
      valor_adquisicion, valor_residual, vida_util_anios, metodo_depreciacion,
      cuenta_activo, cuenta_depreciacion, cuenta_dep_acumulada
    ) VALUES (
      ${empresa_id}, ${nombre}, ${descripcion || null}, ${categoria},
      ${numero_serie || null}, ${fecha_adquisicion},
      ${valor_adquisicion}, ${valor_residual || 0}, ${vidaUtil},
      ${metodo_depreciacion || "lineal"},
      ${cuenta_activo || null}, ${cuenta_depreciacion || null}, ${cuenta_dep_acumulada || null}
    ) RETURNING id
  `;
  return NextResponse.json({ id: activo.id }, { status: 201 });
}

// POST /api/activos/depreciar — registra depreciación del período y genera voucher
export async function PATCH(req: NextRequest) {
  const { empresa_id, periodo } = await req.json();
  if (!empresa_id || !periodo) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const activos = await sql`
    SELECT * FROM activos_fijos
    WHERE empresa_id = ${empresa_id} AND activo = true
  `;

  const hoy = new Date();
  let registradas = 0;

  for (const a of activos) {
    // Verificar si ya se depreció este período
    const [existente] = await sql`
      SELECT id FROM depreciaciones WHERE activo_id = ${a.id} AND periodo = ${periodo}
    `;
    if (existente) continue;

    const adq = new Date(a.fecha_adquisicion);
    const aniosTranscurridos = (hoy.getTime() - adq.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const dep = calcularDepreciacion(
      Number(a.valor_adquisicion), Number(a.valor_residual),
      a.vida_util_anios, a.metodo_depreciacion, aniosTranscurridos
    );

    if (dep.mensual <= 0) continue;

    await sql`
      INSERT INTO depreciaciones (activo_id, empresa_id, periodo, monto_depreciacion, depreciacion_acumulada, valor_libro)
      VALUES (${a.id}, ${empresa_id}, ${periodo}, ${dep.mensual}, ${dep.acumulada}, ${dep.valorLibro})
    `;
    registradas++;
  }

  return NextResponse.json({ ok: true, registradas });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const fecha_baja = req.nextUrl.searchParams.get("fecha");
  await sql`
    UPDATE activos_fijos SET activo = false, fecha_baja = ${fecha_baja || new Date().toISOString().slice(0,10)}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
