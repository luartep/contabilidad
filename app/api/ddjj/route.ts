import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const anio = req.nextUrl.searchParams.get("anio");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const ddjjs = await sql`
    SELECT dj.*, 
      (SELECT COUNT(*) FROM ddjj_lineas WHERE declaracion_id = dj.id) as lineas
    FROM declaraciones_juradas dj
    WHERE dj.empresa_id = ${empresa_id}
      ${anio ? sql`AND dj.anio = ${anio}` : sql``}
    ORDER BY dj.anio DESC, dj.tipo ASC
  `;
  return NextResponse.json({ ddjjs });
}

// Genera la DJ desde los datos de liquidaciones/honorarios del año
export async function POST(req: NextRequest) {
  const { empresa_id, anio, tipo } = await req.json();
  if (!empresa_id || !anio || !tipo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const periodoInicio = `${anio}-01`;
  const periodoFin    = `${anio}-12`;

  if (tipo === "1887") {
    // DJ 1887: sueldos — agrupa liquidaciones del año por trabajador
    const datos = await sql`
      SELECT
        t.rut, t.nombres, t.apellidos,
        SUM(l.total_haberes_imponibles) as monto_renta,
        SUM(l.impuesto_unico)          as impuesto_retenido,
        COUNT(DISTINCT l.periodo)      as meses_trabajados
      FROM liquidaciones l
      JOIN trabajadores t ON t.id = l.trabajador_id
      JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
      WHERE pr.empresa_id = ${empresa_id}
        AND l.periodo >= ${periodoInicio}
        AND l.periodo <= ${periodoFin}
        AND t.tipo_contrato != 'honorarios'
      GROUP BY t.id, t.rut, t.nombres, t.apellidos
      HAVING SUM(l.total_haberes_imponibles) > 0
      ORDER BY t.apellidos ASC
    `;

    if (!datos.length) {
      return NextResponse.json(
        { error: `No hay liquidaciones de remuneraciones para el año ${anio}. Calcula los períodos mensuales primero.` },
        { status: 400 }
      );
    }

    const totalRenta    = datos.reduce((s: number, d: any) => s + Number(d.monto_renta), 0);
    const totalRetenido = datos.reduce((s: number, d: any) => s + Number(d.impuesto_retenido), 0);

    const [dj] = await sql`
      INSERT INTO declaraciones_juradas (empresa_id, anio, tipo, total_informado, total_retenido, cantidad_informados)
      VALUES (${empresa_id}, ${anio}, '1887', ${totalRenta}, ${totalRetenido}, ${datos.length})
      ON CONFLICT (empresa_id, anio, tipo) DO UPDATE SET
        total_informado   = EXCLUDED.total_informado,
        total_retenido    = EXCLUDED.total_retenido,
        cantidad_informados = EXCLUDED.cantidad_informados,
        estado = 'borrador'
      RETURNING id
    `;

    await sql`DELETE FROM ddjj_lineas WHERE declaracion_id = ${dj.id}`;
    for (const d of datos) {
      await sql`
        INSERT INTO ddjj_lineas (declaracion_id, rut, nombres, apellidos, monto_renta, impuesto_retenido, meses_trabajados, tipo)
        VALUES (${dj.id}, ${d.rut}, ${d.nombres}, ${d.apellidos}, ${d.monto_renta}, ${d.impuesto_retenido}, ${d.meses_trabajados}, '1887')
      `;
    }
    return NextResponse.json({ ok: true, id: dj.id, lineas: datos.length });
  }

  if (tipo === "1879") {
    // DJ 1879: honorarios — agrupa documentos_f29 tipo honorario_recibido del año
    const datos = await sql`
      SELECT
        d.rut_contraparte as rut,
        d.razon_social_contraparte as nombre,
        SUM(d.monto_neto)                as monto_honorarios,
        SUM(d.retencion_honorario)       as retencion_honorarios
      FROM documentos_f29 d
      WHERE d.empresa_id = ${empresa_id}
        AND d.tipo = 'honorario_recibido'
        AND d.periodo >= ${periodoInicio}
        AND d.periodo <= ${periodoFin}
      GROUP BY d.rut_contraparte, d.razon_social_contraparte
      HAVING SUM(d.monto_neto) > 0
      ORDER BY d.razon_social_contraparte ASC
    `;

    if (!datos.length) {
      return NextResponse.json(
        { error: `No hay boletas de honorarios registradas para el año ${anio}. Agrégalas en el módulo F29 de cada mes.` },
        { status: 400 }
      );
    }

    const totalHon = datos.reduce((s: number, d: any) => s + Number(d.monto_honorarios), 0);
    const totalRet = datos.reduce((s: number, d: any) => s + Number(d.retencion_honorarios), 0);

    const [dj] = await sql`
      INSERT INTO declaraciones_juradas (empresa_id, anio, tipo, total_informado, total_retenido, cantidad_informados)
      VALUES (${empresa_id}, ${anio}, '1879', ${totalHon}, ${totalRet}, ${datos.length})
      ON CONFLICT (empresa_id, anio, tipo) DO UPDATE SET
        total_informado     = EXCLUDED.total_informado,
        total_retenido      = EXCLUDED.total_retenido,
        cantidad_informados = EXCLUDED.cantidad_informados,
        estado = 'borrador'
      RETURNING id
    `;

    await sql`DELETE FROM ddjj_lineas WHERE declaracion_id = ${dj.id}`;
    for (const d of datos) {
      const partes = (d.nombre || "").split(" ");
      await sql`
        INSERT INTO ddjj_lineas (declaracion_id, rut, nombres, apellidos, monto_honorarios, retencion_honorarios, tipo)
        VALUES (${dj.id}, ${d.rut || ""}, ${partes.slice(0,2).join(" ")}, ${partes.slice(2).join(" ")}, ${d.monto_honorarios}, ${d.retencion_honorarios}, '1879')
      `;
    }
    return NextResponse.json({ ok: true, id: dj.id, lineas: datos.length });
  }

  return NextResponse.json({ error: "Tipo debe ser '1887' o '1879'" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const { id, estado } = await req.json();
  await sql`
    UPDATE declaraciones_juradas
    SET estado = ${estado}, presentada_en = ${estado === "presentada" ? new Date().toISOString() : null}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
