import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo    = req.nextUrl.searchParams.get("periodo"); // YYYY-MM
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const [anio, mes] = periodo.split("-").map(Number);
  const periodoAnterior = mes === 1
    ? `${anio - 1}-12`
    : `${anio}-${String(mes - 1).padStart(2, "0")}`;

  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;

  // ── Datos del período actual ──────────────────────────────────────────────
  const liqActual = await sql`
    SELECT l.*
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
  `;

  const liqAnterior = await sql`
    SELECT l.*
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodoAnterior}
  `;

  const f29Actual = await sql`
    SELECT * FROM periodos_f29 WHERE empresa_id = ${empresa_id} AND periodo = ${periodo}
  `;

  const f29Anterior = await sql`
    SELECT * FROM periodos_f29 WHERE empresa_id = ${empresa_id} AND periodo = ${periodoAnterior}
  `;

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const sumaLiq = (arr: any[], campo: string) =>
    arr.reduce((s, l) => s + Number(l[campo] || 0), 0);

  const totalLiqActual    = sumaLiq(liqActual, "total_haberes");
  const totalLiqAnterior  = sumaLiq(liqAnterior, "totalhaberes");
  const liquidoActual     = sumaLiq(liqActual, "liquido_a_pagar");
  const liquidoAnterior   = sumaLiq(liqAnterior, "liquido_a_pagar");
  const impUnicoActual    = sumaLiq(liqActual, "impuesto_unico");
  const cotizActual       = sumaLiq(liqActual, "afp_trabajador") +
                            sumaLiq(liqActual, "afp_adicional") +
                            sumaLiq(liqActual, "salud_trabajador") +
                            sumaLiq(liqActual, "cesantia_trabajador");
  const cargaEmp          = sumaLiq(liqActual, "cesantia_empleador") +
                            sumaLiq(liqActual, "sis_empleador") +
                            sumaLiq(liqActual, "accidente_empleador");

  const ivaActual   = f29Actual[0] ? Number(f29Actual[0].iva_a_pagar) : null;
  const ppmActual   = f29Actual[0] ? Number(f29Actual[0].ppm_monto) : null;
  const totalF29    = f29Actual[0] ? Number(f29Actual[0].total_a_pagar) : null;
  const ivaAnterior = f29Anterior[0] ? Number(f29Anterior[0].iva_a_pagar) : null;

  const variacionLiquidaciones = liqAnterior.length > 0
    ? ((liquidoActual - liquidoAnterior) / (liquidoAnterior || 1)) * 100
    : null;

  const variacionIVA = ivaAnterior !== null && ivaActual !== null && ivaAnterior > 0
    ? ((ivaActual - ivaAnterior) / ivaAnterior) * 100
    : null;

  // ── Vencimientos del período ───────────────────────────────────────────────
  const mesV  = mes === 12 ? 1 : mes + 1;
  const anioV = mes === 12 ? anio + 1 : anio;
  const mesNombre = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][mesV];

  const vencimientos = [
    {
      nombre: "Previred",
      fecha: `Día 10 de ${mesNombre} ${anioV}`,
      descripcion: "Cotizaciones previsionales del período",
      monto: sumaLiq(liqActual, "afp_trabajador") + sumaLiq(liqActual, "afp_adicional") +
             sumaLiq(liqActual, "salud_trabajador") + sumaLiq(liqActual, "cesantia_trabajador") + cargaEmp,
      urgencia: "normal",
    },
    {
      nombre: "F29",
      fecha: `Día 12 de ${mesNombre} ${anioV}`,
      descripcion: "IVA, PPM e impuesto único de trabajadores",
      monto: totalF29,
      urgencia: totalF29 && totalF29 > 0 ? "alta" : "normal",
    },
    {
      nombre: "LRE (Dirección del Trabajo)",
      fecha: `Primeros 15 días hábiles de ${mesNombre} ${anioV}`,
      descripcion: "Libro de Remuneraciones Electrónico",
      monto: null,
      urgencia: liqActual.length >= 5 ? "alta" : "baja",
    },
  ];

  // ── Alertas y recomendaciones (motor de reglas) ────────────────────────────
  const alertas: { tipo: "info" | "warning" | "danger"; titulo: string; detalle: string }[] = [];

  // 1. Alerta de alza en costo de remuneraciones
  if (variacionLiquidaciones !== null && variacionLiquidaciones > 10) {
    alertas.push({
      tipo: "warning",
      titulo: `Aumento en costo de remuneraciones: +${variacionLiquidaciones.toFixed(1)}%`,
      detalle: `El líquido a pagar este mes es ${new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(liquidoActual))} vs ${new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(liquidoAnterior))} el mes anterior. Verifica si hay horas extra, bonos o nuevos trabajadores.`,
    });
  }

  // 2. Impuesto único alto (> 5% del total haberes)
  if (impUnicoActual > 0 && totalLiqActual > 0 && impUnicoActual / totalLiqActual > 0.05) {
    alertas.push({
      tipo: "info",
      titulo: "Impuesto único representa más del 5% del total de haberes",
      detalle: `Impuesto único este mes: ${new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(impUnicoActual))}. Evalúa si algún trabajador podría beneficiarse de cotizaciones APV para reducir la base tributable.`,
    });
  }

  // 3. IVA mayor al mes anterior
  if (variacionIVA !== null && variacionIVA > 20) {
    alertas.push({
      tipo: "warning",
      titulo: `IVA a pagar subió ${variacionIVA.toFixed(1)}% respecto al mes anterior`,
      detalle: `IVA este período: ${new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(ivaActual!))}. Verifica si hay facturas de compra pendientes de registrar que podrían aumentar el crédito fiscal.`,
    });
  }

  // 4. Sin liquidaciones calculadas
  if (liqActual.length === 0) {
    alertas.push({
      tipo: "danger",
      titulo: "No hay liquidaciones calculadas para este período",
      detalle: "Ve al módulo de Remuneraciones y calcula las liquidaciones antes de generar Previred y LRE.",
    });
  }

  // 5. Sin F29 calculado
  if (!f29Actual.length) {
    alertas.push({
      tipo: "warning",
      titulo: "F29 no calculado para este período",
      detalle: "Importa el RCV desde el SII o agrega los documentos manualmente y calcula el F29.",
    });
  }

  // 6. Remanente crédito fiscal
  if (f29Actual[0] && Number(f29Actual[0].remanente_credito) > 0) {
    alertas.push({
      tipo: "info",
      titulo: `Remanente de crédito fiscal: ${new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(Number(f29Actual[0].remanente_credito)))}`,
      detalle: "Recuerda ingresar este remanente en el F29 del mes siguiente para no perderlo.",
    });
  }

  // 7. PPM y optimización Pro Pyme
  if (empresa.regimen_tributario === "pro_pyme" && ppmActual && ppmActual > 0) {
    alertas.push({
      tipo: "info",
      titulo: "Optimización: PPM puede imputarse al impuesto anual",
      detalle: `El PPM pagado este mes (${new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(ppmActual))}) se imputa al impuesto de primera categoría. Lleva un registro acumulado del año para estimar el impuesto anual.`,
    });
  }

  // ── Comparativa mes a mes ─────────────────────────────────────────────────
  const ultimos6 = await sql`
    SELECT
      l.periodo,
      SUM(l.liquido_a_pagar)       as liquido,
      SUM(l.total_haberes)         as haberes,
      SUM(l.total_descuentos)      as descuentos,
      COUNT(DISTINCT l.trabajador_id) as trabajadores
    FROM liquidaciones l
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    WHERE pr.empresa_id = ${empresa_id}
      AND l.periodo >= ${`${anio}-01`}
    GROUP BY l.periodo
    ORDER BY l.periodo ASC
  `;

  const ultimos6F29 = await sql`
    SELECT periodo, total_a_pagar, iva_a_pagar, ppm_monto
    FROM periodos_f29
    WHERE empresa_id = ${empresa_id}
      AND periodo >= ${`${anio}-01`}
    ORDER BY periodo ASC
  `;

  return NextResponse.json({
    empresa,
    periodo,
    resumen: {
      trabajadores: liqActual.length,
      total_haberes: totalLiqActual,
      liquido_a_pagar: liquidoActual,
      cotizaciones_trabajadores: cotizActual,
      carga_empleador: cargaEmp,
      impuesto_unico: impUnicoActual,
      iva_a_pagar: ivaActual,
      ppm_monto: ppmActual,
      total_f29: totalF29,
      variacion_liquidaciones: variacionLiquidaciones,
      variacion_iva: variacionIVA,
    },
    vencimientos,
    alertas,
    comparativa_remuneraciones: ultimos6,
    comparativa_f29: ultimos6F29,
  });
}
