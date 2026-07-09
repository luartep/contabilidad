import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function clp(valor: number): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(valor));
}

function mesNombre(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  const nombres = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${nombres[parseInt(mes)]} ${anio}`;
}

export async function GET(req: NextRequest) {
  const liq_id = req.nextUrl.searchParams.get("id");
  const todos = req.nextUrl.searchParams.get("todos"); // ?todos=1&empresa_id=X&periodo=YYYY-MM
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");

  let liquidaciones: any[] = [];

  if (todos && empresa_id && periodo) {
    liquidaciones = await sql`
      SELECT l.*, t.rut, t.nombres, t.apellidos, t.tipo_contrato, t.afp, t.sistema_salud, t.cargo,
             e.razon_social, e.rut as empresa_rut, e.giro, e.direccion
      FROM liquidaciones l
      JOIN trabajadores t ON t.id = l.trabajador_id
      JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
      JOIN empresas e ON e.id = pr.empresa_id
      WHERE pr.empresa_id = ${empresa_id} AND l.periodo = ${periodo}
      ORDER BY t.apellidos ASC
    `;
  } else if (liq_id) {
    liquidaciones = await sql`
      SELECT l.*, t.rut, t.nombres, t.apellidos, t.tipo_contrato, t.afp, t.sistema_salud, t.cargo,
             e.razon_social, e.rut as empresa_rut, e.giro, e.direccion
      FROM liquidaciones l
      JOIN trabajadores t ON t.id = l.trabajador_id
      JOIN periodos_remuneracion pr ON pr.id = l.periodo_rem_id
      JOIN empresas e ON e.id = pr.empresa_id
      WHERE l.id = ${liq_id}
    `;
  }

  if (!liquidaciones.length) {
    return new NextResponse("Sin liquidaciones para generar", { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidaciones de Sueldo</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background:#fff; }
    .page { width:210mm; min-height:148mm; padding:12mm 14mm; margin:0 auto; }
    @media print {
      .no-print { display:none; }
      .page { page-break-after: always; width:100%; padding:10mm 12mm; }
      .page:last-child { page-break-after: avoid; }
    }
    .btn-print { position:fixed; top:16px; right:16px; background:#0f766e; color:#fff;
      border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-size:14px; z-index:999; }
    /* Liquidación */
    .liq-header { border:1.5px solid #111; margin-bottom:4px; }
    .liq-empresa { background:#1e293b; color:#fff; padding:6px 10px; }
    .liq-empresa h2 { font-size:13px; font-weight:bold; }
    .liq-empresa p { font-size:10px; opacity:0.85; margin-top:2px; }
    .liq-titulo { background:#0f766e; color:#fff; text-align:center; padding:5px;
      font-size:12px; font-weight:bold; letter-spacing:1px; }
    .liq-trabajador { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0;
      border-bottom:1px solid #ddd; }
    .liq-campo { padding:5px 8px; border-right:1px solid #ddd; }
    .liq-campo:last-child { border-right:none; }
    .liq-campo label { display:block; font-size:9px; color:#555; text-transform:uppercase; }
    .liq-campo span { font-weight:bold; font-size:11px; }
    .liq-body { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid #ddd; }
    .liq-col { padding:6px 8px; }
    .liq-col:first-child { border-right:1px solid #ddd; }
    .liq-col h4 { font-size:10px; text-transform:uppercase; color:#444; border-bottom:1px solid #eee;
      padding-bottom:3px; margin-bottom:4px; }
    .liq-fila { display:flex; justify-content:space-between; padding:2px 0;
      border-bottom:1px solid #f0f0f0; }
    .liq-fila.subtotal { background:#f8f8f8; font-weight:bold; }
    .liq-totales { border-top:1.5px solid #111; display:grid;
      grid-template-columns:1fr 1fr 1fr; }
    .liq-total-box { padding:8px; text-align:center; border-right:1px solid #ddd; }
    .liq-total-box:last-child { border-right:none; }
    .liq-total-box label { display:block; font-size:9px; color:#555; text-transform:uppercase; }
    .liq-total-box .monto { font-size:15px; font-weight:bold; color:#0f766e; }
    .liq-total-box.liquido { background:#0f766e; color:#fff; }
    .liq-total-box.liquido label { color:#cde; }
    .liq-total-box.liquido .monto { color:#fff; font-size:17px; }
    .liq-firmas { display:grid; grid-template-columns:1fr 1fr; gap:20px;
      padding:10px 20px; border-top:1px solid #ddd; margin-top:4px; }
    .firma-box { text-align:center; }
    .firma-linea { border-top:1px solid #333; margin-top:30px; padding-top:4px; font-size:10px; }
    .liq-metadata { padding:4px 8px; background:#f8fafc; border-top:1px solid #eee;
      font-size:9px; color:#888; display:flex; justify-content:space-between; }
    .spacer { margin-bottom:8mm; }
  </style>
</head>
<body>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  ${liquidaciones.map((l) => `
  <div class="page">
    <div class="liq-header">
      <div class="liq-empresa">
        <h2>${l.razon_social}</h2>
        <p>RUT: ${l.empresa_rut}${l.giro ? ` · ${l.giro}` : ""}${l.direccion ? ` · ${l.direccion}` : ""}</p>
      </div>
      <div class="liq-titulo">LIQUIDACIÓN DE SUELDO — ${mesNombre(l.periodo).toUpperCase()}</div>
      <div class="liq-trabajador">
        <div class="liq-campo">
          <label>Trabajador</label>
          <span>${l.nombres} ${l.apellidos}</span>
        </div>
        <div class="liq-campo">
          <label>RUT</label>
          <span>${l.rut}</span>
        </div>
        <div class="liq-campo">
          <label>Cargo</label>
          <span>${l.cargo || "—"}</span>
        </div>
        <div class="liq-campo">
          <label>AFP</label>
          <span>${l.afp || "—"}</span>
        </div>
        <div class="liq-campo">
          <label>Salud</label>
          <span>${l.sistema_salud === "isapre" ? "Isapre" : "Fonasa"}</span>
        </div>
        <div class="liq-campo">
          <label>Contrato</label>
          <span>${l.tipo_contrato?.replace("_"," ") || "—"}</span>
        </div>
      </div>

      <div class="liq-body">
        <div class="liq-col">
          <h4>Haberes</h4>
          ${l.sueldo_base > 0 ? `<div class="liq-fila"><span>Sueldo Base</span><span>${clp(l.sueldo_base)}</span></div>` : ""}
          ${l.gratificacion > 0 ? `<div class="liq-fila"><span>Gratificación Legal</span><span>${clp(l.gratificacion)}</span></div>` : ""}
          ${l.horas_extra_monto > 0 ? `<div class="liq-fila"><span>Horas Extra</span><span>${clp(l.horas_extra_monto)}</span></div>` : ""}
          ${l.comisiones > 0 ? `<div class="liq-fila"><span>Comisiones</span><span>${clp(l.comisiones)}</span></div>` : ""}
          ${l.bono_imponible > 0 ? `<div class="liq-fila"><span>Bono (imponible)</span><span>${clp(l.bono_imponible)}</span></div>` : ""}
          ${l.otros_imponibles > 0 ? `<div class="liq-fila"><span>Otros Haberes Imponibles</span><span>${clp(l.otros_imponibles)}</span></div>` : ""}
          <div class="liq-fila subtotal"><span>Total Imponible</span><span>${clp(l.total_haberes_imponibles)}</span></div>
          ${l.colacion > 0 ? `<div class="liq-fila"><span>Colación</span><span>${clp(l.colacion)}</span></div>` : ""}
          ${l.movilizacion > 0 ? `<div class="liq-fila"><span>Movilización</span><span>${clp(l.movilizacion)}</span></div>` : ""}
          ${l.asignacion_familiar > 0 ? `<div class="liq-fila"><span>Asignación Familiar</span><span>${clp(l.asignacion_familiar)}</span></div>` : ""}
          ${l.bono_no_imponible > 0 ? `<div class="liq-fila"><span>Bono (no imponible)</span><span>${clp(l.bono_no_imponible)}</span></div>` : ""}
          ${l.otros_no_imponibles > 0 ? `<div class="liq-fila"><span>Otros No Imponibles</span><span>${clp(l.otros_no_imponibles)}</span></div>` : ""}
          ${l.total_haberes_no_imponibles > 0 ? `<div class="liq-fila subtotal"><span>Total No Imponible</span><span>${clp(l.total_haberes_no_imponibles)}</span></div>` : ""}
        </div>

        <div class="liq-col">
          <h4>Descuentos</h4>
          ${l.afp_trabajador > 0 ? `<div class="liq-fila"><span>AFP (10%)</span><span>${clp(l.afp_trabajador)}</span></div>` : ""}
          ${l.afp_adicional > 0 ? `<div class="liq-fila"><span>Comisión AFP (${l.afp_nombre || ""})</span><span>${clp(l.afp_adicional)}</span></div>` : ""}
          ${l.salud_trabajador > 0 ? `<div class="liq-fila"><span>Salud (${l.sistema_salud === "isapre" ? "Isapre" : "Fonasa 7%"})</span><span>${clp(l.salud_trabajador)}</span></div>` : ""}
          ${l.cesantia_trabajador > 0 ? `<div class="liq-fila"><span>Cesantía Trabajador</span><span>${clp(l.cesantia_trabajador)}</span></div>` : ""}
          ${l.impuesto_unico > 0 ? `<div class="liq-fila"><span>Impuesto Único 2ª Cat.</span><span>${clp(l.impuesto_unico)}</span></div>` : ""}
          <div class="liq-fila subtotal"><span>Total Descuentos Legales</span><span>${clp(l.total_descuentos_legales)}</span></div>
          ${l.descuentos_varios > 0 ? `<div class="liq-fila"><span>Otros Descuentos</span><span>${clp(l.descuentos_varios)}</span></div>` : ""}
          ${l.anticipo > 0 ? `<div class="liq-fila"><span>Anticipo</span><span>${clp(l.anticipo)}</span></div>` : ""}

          <h4 style="margin-top:10px;">Aportes Empleador</h4>
          ${l.cesantia_empleador > 0 ? `<div class="liq-fila"><span>Cesantía Empleador</span><span>${clp(l.cesantia_empleador)}</span></div>` : ""}
          ${l.sis_empleador > 0 ? `<div class="liq-fila"><span>SIS (Seguro Invalidez)</span><span>${clp(l.sis_empleador)}</span></div>` : ""}
          ${l.accidente_empleador > 0 ? `<div class="liq-fila"><span>Seguro Accidentes</span><span>${clp(l.accidente_empleador)}</span></div>` : ""}
        </div>
      </div>

      <div class="liq-totales">
        <div class="liq-total-box">
          <label>Total Haberes</label>
          <div class="monto">${clp(l.total_haberes)}</div>
        </div>
        <div class="liq-total-box">
          <label>Total Descuentos</label>
          <div class="monto" style="color:#dc2626">${clp(l.total_descuentos)}</div>
        </div>
        <div class="liq-total-box liquido">
          <label>Líquido a Pagar</label>
          <div class="monto">${clp(l.liquido_a_pagar)}</div>
        </div>
      </div>

      <div class="liq-firmas">
        <div class="firma-box">
          <div class="firma-linea">Firma Empleador</div>
        </div>
        <div class="firma-box">
          <div class="firma-linea">Firma Trabajador: ${l.nombres} ${l.apellidos}</div>
        </div>
      </div>

      <div class="liq-metadata">
        <span>UF: ${clp(l.uf_usada)} · UTM: ${clp(l.utm_usada)} · IMM: ${clp(l.imm_usado)}</span>
        <span>Base AFP: ${clp(l.base_imponible_afp)} · Base Tributable: ${clp(l.base_tributable)}</span>
        ${l.editado_manualmente ? "<span style='color:#b45309'>⚠ Editada manualmente</span>" : ""}
      </div>
    </div>
    <div class="spacer"></div>
  </div>
  `).join("")}
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
