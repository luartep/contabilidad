import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { CAUSALES_TERMINO } from "@/lib/calculoFiniquito";

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export async function GET(req: NextRequest) {
  const fin_id = req.nextUrl.searchParams.get("id");
  if (!fin_id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const [f] = await sql`
    SELECT fin.*, t.nombres, t.apellidos, t.rut, t.cargo, t.fecha_ingreso,
           e.razon_social, e.rut as empresa_rut, e.direccion, e.representante_legal
    FROM finiquitos fin
    JOIN trabajadores t ON t.id = fin.trabajador_id
    JOIN empresas e ON e.id = fin.empresa_id
    WHERE fin.id = ${fin_id}
  `;
  if (!f) return new NextResponse("No encontrado", { status: 404 });

  const causalLabel = CAUSALES_TERMINO[f.causal] || f.causal;
  const fechaTermino = new Date(f.fecha_termino).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Finiquito — ${f.nombres} ${f.apellidos}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 15mm; }
    @media print { .no-print { display:none; } }
    .btn { position:fixed; top:12px; right:12px; background:#0f766e; color:#fff; border:none; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; }
    h1 { font-size: 16px; font-weight: bold; text-align: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
    .meta div { padding: 4px 0; border-bottom: 1px solid #eee; }
    .meta label { font-weight: bold; margin-right: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #1e293b; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    .num { text-align: right; }
    .total-row td { font-weight: bold; background: #f1f5f9; border-top: 2px solid #333; font-size: 13px; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px; }
    .firma { border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 10px; color: #555; }
    .nota { margin-top: 16px; font-size: 9px; color: #666; border: 1px solid #ddd; padding: 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <button class="btn no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
  <h1>FINIQUITO DE TRABAJO</h1>

  <div class="meta">
    <div><label>Empresa:</label>${f.razon_social}</div>
    <div><label>RUT empresa:</label>${f.empresa_rut}</div>
    <div><label>Trabajador:</label>${f.nombres} ${f.apellidos}</div>
    <div><label>RUT trabajador:</label>${f.rut}</div>
    <div><label>Cargo:</label>${f.cargo || "—"}</div>
    <div><label>Fecha ingreso:</label>${f.fecha_ingreso ? new Date(f.fecha_ingreso).toLocaleDateString("es-CL") : "—"}</div>
    <div><label>Fecha término:</label>${fechaTermino}</div>
    <div><label>Antigüedad:</label>${f.anios_servicio} año(s)</div>
    <div class="col-span-2"><label>Causal:</label>${causalLabel}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th class="num">Monto ($)</th>
      </tr>
    </thead>
    <tbody>
      ${Number(f.proporcional_mes) > 0 ? `<tr><td>Proporcional del mes</td><td class="num">${clp(f.proporcional_mes)}</td></tr>` : ""}
      ${Number(f.vacaciones_pendientes_monto) > 0 ? `<tr><td>Vacaciones pendientes (${f.vacaciones_pendientes_dias} días)</td><td class="num">${clp(f.vacaciones_pendientes_monto)}</td></tr>` : ""}
      ${Number(f.indemnizacion_anios) > 0 ? `<tr><td>Indemnización por años de servicio</td><td class="num">${clp(f.indemnizacion_anios)}</td></tr>` : ""}
      ${Number(f.indemnizacion_anios_meses) > 0 ? `<tr><td>Sustitutiva de aviso previo (30 días)</td><td class="num">${clp(f.indemnizacion_anios_meses)}</td></tr>` : ""}
      ${Number(f.otros_haberes) > 0 ? `<tr><td>Otros haberes</td><td class="num">${clp(f.otros_haberes)}</td></tr>` : ""}
      ${Number(f.descuentos_finiquito) > 0 ? `<tr><td>Descuentos</td><td class="num">-${clp(f.descuentos_finiquito)}</td></tr>` : ""}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td>TOTAL FINIQUITO</td>
        <td class="num">${clp(f.total_finiquito)}</td>
      </tr>
    </tfoot>
  </table>

  <p style="margin-top:12px; font-size:10px;">
    En ${f.direccion || "____________"}, a ${fechaTermino}, las partes acuerdan poner término al contrato de trabajo,
    dejando constancia que el trabajador recibe la suma de <strong>${clp(f.total_finiquito)}</strong> por los
    conceptos indicados, declarando no tener más que reclamar por ningún motivo derivado del contrato de trabajo.
  </p>

  <div class="firmas">
    <div class="firma">
      Firma Empleador<br>${f.representante_legal || f.razon_social}<br>RUT: ${f.empresa_rut}
    </div>
    <div class="firma">
      Firma Trabajador<br>${f.nombres} ${f.apellidos}<br>RUT: ${f.rut}
    </div>
  </div>

  <div class="nota">
    Este finiquito debe ser ratificado ante Notario, Inspector del Trabajo o funcionario de la
    Dirección del Trabajo, para tener mérito ejecutivo. Plazo para objetar: 7 días hábiles.
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
