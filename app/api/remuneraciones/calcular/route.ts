import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { calcularLiquidacion, InputTrabajador, ParametrosPeriodo } from "@/lib/calculoRemuneraciones";

export async function POST(req: NextRequest) {
  const { empresa_id, periodo } = await req.json();
  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan empresa_id y periodo" }, { status: 400 });
  }

  // 1. Obtener parámetros del período
  const [params] = await sql`SELECT * FROM parametros_periodo WHERE periodo = ${periodo}`;
  if (!params) {
    return NextResponse.json(
      { error: `No hay parámetros configurados para el período ${periodo}. Ve a Parámetros del período y configúralo primero.` },
      { status: 400 }
    );
  }
  const tramos = await sql`
    SELECT * FROM tramos_impuesto_unico WHERE periodo = ${periodo} ORDER BY tramo ASC
  `;
  const comisiones_afp = await sql`
    SELECT * FROM comisiones_afp WHERE periodo = ${periodo}
  `;

  // 2. Obtener o crear el período de remuneraciones
  const [perRem] = await sql`
    INSERT INTO periodos_remuneracion (empresa_id, periodo)
    VALUES (${empresa_id}, ${periodo})
    ON CONFLICT (empresa_id, periodo) DO UPDATE SET periodo = EXCLUDED.periodo
    RETURNING *
  `;

  // 3. Obtener empresa (para tasa accidentes)
  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;

  // 4. Obtener trabajadores activos de la empresa
  const trabajadores = await sql`
    SELECT t.*, cd.*,
      vs_sb.monto as vs_sueldo_base,
      vs_he.monto as vs_horas_extra,
      vs_com.monto as vs_comisiones,
      vs_bon.monto as vs_bono_imponible,
      vs_col.monto as vs_colacion,
      vs_mov.monto as vs_movilizacion,
      vs_asf.monto as vs_asignacion_familiar,
      vs_bni.monto as vs_bono_no_imponible,
      vs_oi.monto as vs_otros_imponibles,
      vs_oni.monto as vs_otros_no_imponibles
    FROM trabajadores t
    LEFT JOIN config_descuentos cd ON cd.trabajador_id = t.id
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'sueldo_base'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_sb ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'horas_extra'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_he ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'comisiones'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_com ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'bono_imponible'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_bon ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'colacion'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_col ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'movilizacion'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_mov ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'asignacion_familiar'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_asf ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'bono_no_imponible'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_bni ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'otros_imponibles'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_oi ON true
    LEFT JOIN LATERAL (
      SELECT monto FROM variables_sueldo WHERE trabajador_id = t.id AND concepto = 'otros_no_imponibles'
        AND vigente_desde <= CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      ORDER BY vigente_desde DESC LIMIT 1
    ) vs_oni ON true
    WHERE t.empresa_id = ${empresa_id} AND t.activo = true AND t.tipo_contrato != 'honorarios'
  `;

  const paramsPeriodo: ParametrosPeriodo = {
    uf: Number(params.uf),
    utm: Number(params.utm),
    imm: Number(params.imm || 510966),
    tope_imponible_afp_salud_uf: Number(params.tope_imponible_afp_salud_uf),
    tope_imponible_cesantia_uf: Number(params.tope_imponible_cesantia_uf),
    tasa_afc_indefinido_trabajador: Number(params.tasa_afc_indefinido_trabajador),
    tasa_afc_indefinido_empleador: Number(params.tasa_afc_indefinido_empleador),
    tasa_afc_plazo_fijo_empleador: Number(params.tasa_afc_plazo_fijo_empleador),
    tasa_salud_fonasa: Number(params.tasa_salud_fonasa),
    tramos: tramos.map((t: any) => ({
      tramo: t.tramo,
      desde: Number(t.desde),
      hasta: t.hasta ? Number(t.hasta) : null,
      factor: Number(t.factor),
      rebaja: Number(t.rebaja),
    })),
  };

  const resultados = [];

  for (const t of trabajadores) {
    // Buscar tasa AFP del trabajador en la tabla de comisiones
    const afpRow = comisiones_afp.find(
      (c: any) => c.nombre_afp?.toLowerCase() === t.afp?.toLowerCase()
    );
    const tasa_comision = afpRow ? Number(afpRow.comision_pct) : 0.58;
    const tasa_afp_total = 10 + tasa_comision;

    const input: InputTrabajador = {
      tipo_contrato: t.tipo_contrato,
      afp: t.afp,
      tasa_afp: tasa_afp_total,
      tasa_afp_adicional: tasa_comision,
      sistema_salud: t.sistema_salud,
      isapre_plan_uf: t.isapre_plan_uf ? Number(t.isapre_plan_uf) : null,
      sueldo_base: Number(t.vs_sueldo_base || 0),
      horas_extra_monto: Number(t.vs_horas_extra || 0),
      comisiones: Number(t.vs_comisiones || 0),
      bono_imponible: Number(t.vs_bono_imponible || 0),
      otros_imponibles: Number(t.vs_otros_imponibles || 0),
      colacion: Number(t.vs_colacion || t.colacion_monto || 0),
      movilizacion: Number(t.vs_movilizacion || t.movilizacion_monto || 0),
      asignacion_familiar: Number(t.vs_asignacion_familiar || 0),
      bono_no_imponible: Number(t.vs_bono_no_imponible || 0),
      otros_no_imponibles: Number(t.vs_otros_no_imponibles || 0),
      gratificacion_tipo: perRem.gratificacion_tipo || 'garantizada',
      descuentos_varios: 0,
      anticipo: 0,
      afp_automatico: t.afp_automatico ?? true,
      salud_automatico: t.salud_automatico ?? true,
      cesantia_automatico: t.cesantia_automatico ?? true,
      impuesto_automatico: t.impuesto_automatico ?? true,
      afp_manual: 0,
      salud_manual: 0,
      cesantia_manual: 0,
      impuesto_manual: 0,
      tasa_accidentes: Number(empresa.tasa_accidentes || 0.95),
      tasa_sis: 1.87,
    };

    const resultado = calcularLiquidacion(input, paramsPeriodo);

    // Upsert en liquidaciones
    await sql`
      INSERT INTO liquidaciones (
        periodo_rem_id, trabajador_id, periodo,
        sueldo_base, horas_extra_monto, comisiones, bono_imponible, gratificacion,
        otros_imponibles, colacion, movilizacion, asignacion_familiar,
        bono_no_imponible, otros_no_imponibles,
        total_haberes_imponibles, total_haberes_no_imponibles, total_haberes,
        base_imponible_afp, base_imponible_salud, base_imponible_cesantia, base_tributable,
        afp_trabajador, afp_adicional, salud_trabajador, cesantia_trabajador, impuesto_unico,
        cesantia_empleador, sis_empleador, accidente_empleador,
        descuentos_varios, anticipo,
        total_descuentos_legales, total_descuentos, liquido_a_pagar,
        tasa_afp_usada, afp_nombre, sistema_salud_usado, isapre_plan_uf_usado,
        uf_usada, utm_usada, imm_usado
      ) VALUES (
        ${perRem.id}, ${t.id}, ${periodo},
        ${resultado.sueldo_base}, ${resultado.horas_extra_monto}, ${resultado.comisiones},
        ${resultado.bono_imponible}, ${resultado.gratificacion}, ${resultado.otros_imponibles},
        ${resultado.colacion}, ${resultado.movilizacion}, ${resultado.asignacion_familiar},
        ${resultado.bono_no_imponible}, ${resultado.otros_no_imponibles},
        ${resultado.total_haberes_imponibles}, ${resultado.total_haberes_no_imponibles}, ${resultado.total_haberes},
        ${resultado.base_imponible_afp}, ${resultado.base_imponible_salud}, ${resultado.base_imponible_cesantia},
        ${resultado.base_tributable}, ${resultado.afp_trabajador}, ${resultado.afp_adicional},
        ${resultado.salud_trabajador}, ${resultado.cesantia_trabajador}, ${resultado.impuesto_unico},
        ${resultado.cesantia_empleador}, ${resultado.sis_empleador}, ${resultado.accidente_empleador},
        0, 0,
        ${resultado.total_descuentos_legales}, ${resultado.total_descuentos}, ${resultado.liquido_a_pagar},
        ${resultado.tasa_afp_usada}, ${resultado.afp_nombre}, ${resultado.sistema_salud_usado},
        ${t.isapre_plan_uf || null}, ${paramsPeriodo.uf}, ${paramsPeriodo.utm}, ${paramsPeriodo.imm}
      )
      ON CONFLICT (periodo_rem_id, trabajador_id) DO UPDATE SET
        sueldo_base = EXCLUDED.sueldo_base,
        horas_extra_monto = EXCLUDED.horas_extra_monto,
        comisiones = EXCLUDED.comisiones,
        bono_imponible = EXCLUDED.bono_imponible,
        gratificacion = EXCLUDED.gratificacion,
        otros_imponibles = EXCLUDED.otros_imponibles,
        colacion = EXCLUDED.colacion,
        movilizacion = EXCLUDED.movilizacion,
        asignacion_familiar = EXCLUDED.asignacion_familiar,
        bono_no_imponible = EXCLUDED.bono_no_imponible,
        otros_no_imponibles = EXCLUDED.otros_no_imponibles,
        total_haberes_imponibles = EXCLUDED.total_haberes_imponibles,
        total_haberes_no_imponibles = EXCLUDED.total_haberes_no_imponibles,
        total_haberes = EXCLUDED.total_haberes,
        base_imponible_afp = EXCLUDED.base_imponible_afp,
        base_imponible_salud = EXCLUDED.base_imponible_salud,
        base_imponible_cesantia = EXCLUDED.base_imponible_cesantia,
        base_tributable = EXCLUDED.base_tributable,
        afp_trabajador = EXCLUDED.afp_trabajador,
        afp_adicional = EXCLUDED.afp_adicional,
        salud_trabajador = EXCLUDED.salud_trabajador,
        cesantia_trabajador = EXCLUDED.cesantia_trabajador,
        impuesto_unico = EXCLUDED.impuesto_unico,
        cesantia_empleador = EXCLUDED.cesantia_empleador,
        sis_empleador = EXCLUDED.sis_empleador,
        accidente_empleador = EXCLUDED.accidente_empleador,
        total_descuentos_legales = EXCLUDED.total_descuentos_legales,
        total_descuentos = EXCLUDED.total_descuentos,
        liquido_a_pagar = EXCLUDED.liquido_a_pagar,
        tasa_afp_usada = EXCLUDED.tasa_afp_usada,
        afp_nombre = EXCLUDED.afp_nombre,
        sistema_salud_usado = EXCLUDED.sistema_salud_usado,
        uf_usada = EXCLUDED.uf_usada,
        utm_usada = EXCLUDED.utm_usada,
        imm_usado = EXCLUDED.imm_usado,
        actualizado_en = now()
      WHERE liquidaciones.editado_manualmente = false
    `;

    resultados.push({ trabajador_id: t.id, nombre: `${t.nombres} ${t.apellidos}`, ...resultado });
  }

  return NextResponse.json({ ok: true, total: resultados.length, liquidaciones: resultados });
}
