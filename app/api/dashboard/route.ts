import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const periodo = req.nextUrl.searchParams.get("periodo") || new Date().toISOString().slice(0, 7);
  const [anio, mes] = periodo.split("-").map(Number);

  // Todas las empresas activas
  const empresas = await sql`SELECT * FROM empresas WHERE activa = true ORDER BY razon_social ASC`;

  // Resumen de remuneraciones por empresa del período
  const remPeriodo = await sql`
    SELECT pr.empresa_id,
      COUNT(DISTINCT l.trabajador_id)    AS trabajadores,
      SUM(l.total_haberes)               AS total_haberes,
      SUM(l.liquido_a_pagar)             AS liquido,
      SUM(l.afp_trabajador + l.afp_adicional + l.salud_trabajador +
          l.cesantia_trabajador + l.cesantia_empleador + l.sis_empleador + l.accidente_empleador)
                                         AS total_previred,
      SUM(l.impuesto_unico)              AS impuesto_unico,
      pr.estado                          AS estado_periodo
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE l.periodo = ${periodo}
    GROUP BY pr.empresa_id, pr.estado
  `;

  // F29 por empresa del período
  const f29Periodo = await sql`
    SELECT empresa_id, total_a_pagar, iva_a_pagar, estado
    FROM periodos_f29
    WHERE periodo = ${periodo}
  `;

  // Vencimientos del período siguiente
  const mesV  = mes === 12 ? 1 : mes + 1;
  const anioV = mes === 12 ? anio + 1 : anio;
  const meses = ["","Enero","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const mesNombre = meses[mesV];

  // Alertas globales
  const alertas: { empresa_id: number; empresa: string; tipo: string; mensaje: string }[] = [];

  for (const e of empresas) {
    const rem = remPeriodo.find((r: any) => r.empresa_id === e.id);
    const f29 = f29Periodo.find((f: any) => f.empresa_id === e.id);

    if (!rem) {
      alertas.push({ empresa_id: e.id, empresa: e.razon_social, tipo: "warning", mensaje: "Sin liquidaciones calculadas este período" });
    } else if (rem.estado_periodo !== "cerrado") {
      alertas.push({ empresa_id: e.id, empresa: e.razon_social, tipo: "info", mensaje: "Período de remuneraciones abierto (no cerrado)" });
    }
    if (!f29) {
      alertas.push({ empresa_id: e.id, empresa: e.razon_social, tipo: "warning", mensaje: "F29 no calculado para este período" });
    } else if (f29.estado !== "presentado") {
      alertas.push({ empresa_id: e.id, empresa: e.razon_social, tipo: "warning", mensaje: `F29 pendiente de presentar: $${Number(f29.total_a_pagar).toLocaleString("es-CL")}` });
    }
  }

  // Totales globales
  const totalLiquido   = remPeriodo.reduce((s: number, r: any) => s + Number(r.liquido || 0), 0);
  const totalPrevired  = remPeriodo.reduce((s: number, r: any) => s + Number(r.total_previred || 0), 0);
  const totalF29       = f29Periodo.reduce((s: number, f: any) => s + Number(f.total_a_pagar || 0), 0);
  const totalTrabajadores = remPeriodo.reduce((s: number, r: any) => s + Number(r.trabajadores || 0), 0);

  // Comparativa últimos 6 meses (todas las empresas)
  const ultimos6 = await sql`
    SELECT l.periodo,
      SUM(l.liquido_a_pagar)       AS liquido,
      SUM(l.total_haberes)         AS haberes,
      COUNT(DISTINCT l.trabajador_id) AS trabajadores
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE l.periodo >= ${`${anio}-01`} AND l.periodo <= ${periodo}
    GROUP BY l.periodo
    ORDER BY l.periodo ASC
  `;

  return NextResponse.json({
    periodo,
    empresas,
    remPeriodo,
    f29Periodo,
    totales: { totalLiquido, totalPrevired, totalF29, totalTrabajadores, totalEmpresas: empresas.length },
    vencimientos: [
      { nombre: "Previred", fecha: `Día 10 de ${mesNombre} ${anioV}`, urgencia: "alta" },
      { nombre: "F29 (SII)", fecha: `Día 12 de ${mesNombre} ${anioV}`, urgencia: "alta" },
      { nombre: "LRE (DT)", fecha: `15 días hábiles de ${mesNombre} ${anioV}`, urgencia: "normal" },
    ],
    alertas,
    ultimos6,
  });
}
