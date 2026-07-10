import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  generarArchivoPrevired,
  PreviredTrabajador,
  getCodigoAfp,
  getCodigoSalud,
} from "@/lib/generadorPrevired";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");

  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  // Obtener empresa
  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  // Obtener liquidaciones del período con datos del trabajador
  const liquidaciones = await sql`
    SELECT
      l.*,
      t.rut, t.nombres, t.apellidos, t.tipo_contrato,
      t.afp, t.sistema_salud, t.isapre_plan_uf,
      t.sexo, t.fecha_nacimiento, t.nacionalidad,
      t.discapacidad, t.pensionado,
      apv.tiene_apv, apv.modalidad_apv, apv.monto_apv,
      apv.codigo_institucion as codigo_institucion_apv
    FROM liquidaciones l
    JOIN trabajadores t ON t.id = l.trabajador_id
    JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
    LEFT JOIN apv_trabajador apv ON apv.trabajador_id = t.id
    WHERE pr.empresa_id = ${empresa_id}
      AND l.periodo = ${periodo}
      AND t.tipo_contrato != 'honorarios'
    ORDER BY t.apellidos ASC
  `;

  if (!liquidaciones.length) {
    return NextResponse.json(
      { error: "No hay liquidaciones calculadas para este período. Calcula las remuneraciones primero." },
      { status: 400 }
    );
  }

  const trabajadores: PreviredTrabajador[] = liquidaciones.map((l: any) => {
    const apellidos = (l.apellidos || "").split(" ");
    const apellido_paterno = apellidos[0] || "";
    const apellido_materno = apellidos.slice(1).join(" ") || "";

    // Calcular cotización expectativa de vida (0.9% del base AFP, cargo empleador, Ley 21.735)
    const cotizacion_expectativa_vida = Math.round(Number(l.base_imponible_afp) * 0.009);

    return {
      rut_trabajador: l.rut,
      rut_empresa: empresa.rut,
      periodo,
      nombres: l.nombres,
      apellido_paterno,
      apellido_materno,
      sexo: l.sexo || "M",
      fecha_nacimiento: l.fecha_nacimiento || "",
      nacionalidad: l.nacionalidad || "CHL",
      tipo_contrato: l.tipo_contrato,
      discapacidad: l.discapacidad || false,
      pensionado: l.pensionado || false,
      dias_trabajados: 30,
      renta_imponible_afp: Number(l.base_imponible_afp),
      renta_imponible_salud: Number(l.base_imponible_salud),
      renta_imponible_cesantia: Number(l.base_imponible_cesantia),
      codigo_afp: getCodigoAfp(l.afp || ""),
      cotizacion_obligatoria_afp: Number(l.afp_trabajador),
      cotizacion_adicional_afp: Number(l.afp_adicional),
      cotizacion_expectativa_vida,
      codigo_salud: getCodigoSalud(l.sistema_salud || "fonasa", l.isapre_plan_uf ? "consalud" : ""),
      cotizacion_salud: Number(l.salud_trabajador),
      cotizacion_isapre_adicional: 0,
      cotizacion_cesantia_trabajador: Number(l.cesantia_trabajador),
      cotizacion_cesantia_empleador: Number(l.cesantia_empleador),
      tiene_apv: l.tiene_apv || false,
      modalidad_apv: l.modalidad_apv || "A",
      monto_apv: Number(l.monto_apv || 0),
      codigo_institucion_apv: l.codigo_institucion_apv || "",
      sis_empleador: Number(l.sis_empleador),
      tasa_accidentes: Number(empresa.tasa_accidentes || 0.95),
      cotizacion_accidentes: Number(l.accidente_empleador),
    };
  });

  const contenido = generarArchivoPrevired(trabajadores);
  const periodoStr = periodo.replace("-", "");
  const nombreArchivo = `previred_${empresa.rut.replace(/[^0-9kK]/g, "")}_${periodoStr}.txt`;

  // Registrar generación
  await sql`
    INSERT INTO archivos_generados (empresa_id, periodo, tipo, nombre_archivo)
    VALUES (${empresa_id}, ${periodo}, 'previred', ${nombreArchivo})
  `;

  return new NextResponse(contenido, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
