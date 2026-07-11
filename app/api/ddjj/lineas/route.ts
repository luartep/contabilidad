import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export async function GET(req: NextRequest) {
  const declaracion_id = req.nextUrl.searchParams.get("declaracion_id");
  const formato = req.nextUrl.searchParams.get("formato"); // 'json' | 'html'

  if (!declaracion_id) return NextResponse.json({ error: "Falta declaracion_id" }, { status: 400 });

  const [dj] = await sql`
    SELECT dj.*, e.razon_social, e.rut as empresa_rut
    FROM declaraciones_juradas dj
    JOIN empresas e ON e.id = dj.empresa_id
    WHERE dj.id = ${declaracion_id}
  `;
  if (!dj) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const lineas = await sql`
    SELECT * FROM ddjj_lineas WHERE declaracion_id = ${declaracion_id} ORDER BY apellidos ASC, nombres ASC
  `;

  if (formato === "html") {
    const es1887 = dj.tipo === "1887";
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${es1887 ? "DJ 1887" : "DJ 1879"} — ${dj.razon_social} — ${dj.anio}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; background:#fff; padding: 10mm; }
    @media print { .no-print { display:none; } body { padding: 8mm; } }
    .btn { position:fixed; top:12px; right:12px; background:#0f766e; color:#fff;
      border:none; padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; }
    h1 { font-size: 14px; margin-bottom: 2px; }
    .sub { font-size: 10px; color: #555; margin-bottom: 10px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px;
      border: 1px solid #ddd; padding: 8px; border-radius: 4px; font-size: 10px; }
    .meta label { color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #1e293b; color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; font-size: 9px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .num { text-align: right; }
    tfoot td { background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1; }
    .firma { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
    .firma-box { border-top: 1px solid #333; padding-top: 4px; font-size: 9px; color: #555; text-align: center; }
  </style>
</head>
<body>
  <button class="btn no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
  <h1>${es1887 ? "Declaración Jurada Anual DJ 1887" : "Declaración Jurada Anual DJ 1879"}</h1>
  <p class="sub">${es1887 ? "Rentas del artículo 42 N°1 (sueldos, salarios y similares)" : "Rentas del artículo 42 N°2 (honorarios)"} — Año tributario ${Number(dj.anio) + 1} (Año comercial ${dj.anio})</p>
  <div class="meta">
    <div><label>Empresa: </label><strong>${dj.razon_social}</strong></div>
    <div><label>RUT: </label><strong>${dj.empresa_rut}</strong></div>
    <div><label>Tipo: </label>DJ ${dj.tipo}</div>
    <div><label>Estado: </label>${dj.estado}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>RUT</th>
        <th>Nombres</th>
        <th>Apellidos</th>
        ${es1887
          ? `<th class="num">Meses trab.</th><th class="num">Renta imponible ($)</th><th class="num">Impuesto retenido ($)</th>`
          : `<th class="num">Honorarios brutos ($)</th><th class="num">Retención ($)</th>`
        }
      </tr>
    </thead>
    <tbody>
      ${lineas.map((l: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.rut}</td>
          <td>${l.nombres}</td>
          <td>${l.apellidos}</td>
          ${es1887
            ? `<td class="num">${l.meses_trabajados}</td><td class="num">${clp(l.monto_renta)}</td><td class="num">${clp(l.impuesto_retenido)}</td>`
            : `<td class="num">${clp(l.monto_honorarios)}</td><td class="num">${clp(l.retencion_honorarios)}</td>`
          }
        </tr>
      `).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${es1887 ? 4 : 4}"><strong>TOTAL</strong></td>
        ${es1887
          ? `<td class="num">&nbsp;</td><td class="num">${clp(dj.total_informado)}</td><td class="num">${clp(dj.total_retenido)}</td>`
          : `<td class="num">${clp(dj.total_informado)}</td><td class="num">${clp(dj.total_retenido)}</td>`
        }
      </tr>
    </tfoot>
  </table>
  <div class="firma">
    <div class="firma-box">Representante Legal / Contribuyente</div>
    <div class="firma-box">Contador / Auditor</div>
  </div>
</body>
</html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return NextResponse.json({ dj, lineas });
}
