import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generarArchivoLRE, LRETrabajador } from "@/lib/generadorLRE";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");

  if (!empresa_id || !periodo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${empresa_id}`;
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const liquidaciones = await sql`
    SELECT
      l.*,
      t.rut, t.nombres, t.apellidos, t.tipo_contrato, t.cargo,
      t.afp, t.sistema_salud,
      apv.monto_apv
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
      { error: "No hay liquidaciones calculadas para este período." },
      { status: 400 }
    );
  }

  const trabajadores: LRETrabajador[] = liquidaciones.map((l: any) => {
    const apellidos = (l.apellidos || "").split(" ");
    return {
      rut_empresa: empresa.rut,
      razon_social: empresa.razon_social,
      periodo,
      rut_trabajador: l.rut,
      nombres: l.nombres,
      apellido_paterno: apellidos[0] || "",
      apellido_materno: apellidos.slice(1).join(" ") || "",
      tipo_contrato: l.tipo_contrato,
      dias_trabajados: 30,
      cargo: l.cargo || "",
      sueldo_base: Number(l.sueldo_base),
      gratificacion: Number(l.gratificacion),
      horas_extra_monto: Number(l.horas_extra_monto),
      comisiones: Number(l.comisiones),
      bono_imponible: Number(l.bono_imponible),
      otros_imponibles: Number(l.otros_imponibles),
      colacion: Number(l.colacion),
      movilizacion: Number(l.movilizacion),
      asignacion_familiar: Number(l.asignacion_familiar),
      bono_no_imponible: Number(l.bono_no_imponible),
      otros_no_imponibles: Number(l.otros_no_imponibles),
      total_haberes_imponibles: Number(l.total_haberes_imponibles),
      total_haberes_no_imponibles: Number(l.total_haberes_no_imponibles),
      total_haberes: Number(l.total_haberes),
      afp_trabajador: Number(l.afp_trabajador),
      afp_adicional: Number(l.afp_adicional),
      salud_trabajador: Number(l.salud_trabajador),
      cesantia_trabajador: Number(l.cesantia_trabajador),
      impuesto_unico: Number(l.impuesto_unico),
      apv_trabajador: Number(l.monto_apv || 0),
      cesantia_empleador: Number(l.cesantia_empleador),
      sis_empleador: Number(l.sis_empleador),
      accidente_empleador: Number(l.accidente_empleador),
      descuentos_varios: Number(l.descuentos_varios),
      anticipo: Number(l.anticipo),
      total_descuentos_legales: Number(l.total_descuentos_legales),
      total_descuentos: Number(l.total_descuentos),
      liquido_a_pagar: Number(l.liquido_a_pagar),
      base_imponible_afp: Number(l.base_imponible_afp),
      base_tributable: Number(l.base_tributable),
      afp_nombre: l.afp || "",
      sistema_salud: l.sistema_salud || "fonasa",
    };
  });

  const contenido = generarArchivoLRE(trabajadores);
  const periodoStr = periodo.replace("-", "");
  const nombreArchivo = `lre_${empresa.rut.replace(/[^0-9kK]/g, "")}_${periodoStr}.csv`;

  await sql`
    INSERT INTO archivos_generados (empresa_id, periodo, tipo, nombre_archivo)
    VALUES (${empresa_id}, ${periodo}, 'lre', ${nombreArchivo})
  `;

  return new NextResponse(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
