import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo    = req.nextUrl.searchParams.get("periodo");
  const tipo       = req.nextUrl.searchParams.get("tipo");
  const formato    = req.nextUrl.searchParams.get("formato");
  const id         = req.nextUrl.searchParams.get("id");

  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  // HTML para una boleta individual
  if (id && formato === "html") {
    const [b] = await sql`
      SELECT bh.*, e.razon_social, e.rut as empresa_rut, e.direccion, e.giro, e.actividad_economica
      FROM boletas_honorarios bh
      JOIN empresas e ON e.id = bh.empresa_id
      WHERE bh.id = ${id}
    `;
    if (!b) return new NextResponse("No encontrada", { status: 404 });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta de Honorarios N°${b.folio || "S/N"}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 15mm; }
    @media print { .no-print { display:none; } }
    .btn { position:fixed; top:12px; right:12px; background:#0f766e; color:#fff; border:none;
           padding:8px 18px; border-radius:6px; cursor:pointer; font-size:13px; }
    .header { border: 2px solid #111; margin-bottom: 12px; }
    .header-top { background: #1e293b; color: #fff; padding: 10px 14px; display: grid;
                  grid-template-columns: 1fr auto; gap: 10px; }
    .header-top h1 { font-size: 16px; }
    .header-top .folio { text-align: right; }
    .header-top .folio p { font-size: 22px; font-weight: bold; color: #5eead4; }
    .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 14px; }
    .campo { border-bottom: 1px solid #eee; padding: 3px 0; }
    .campo label { font-weight: bold; margin-right: 4px; font-size: 9px; color: #555; text-transform: uppercase; }
    .montos { padding: 10px 14px; border-top: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; color: #444; }
    td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
    .num { text-align: right; }
    .total-row td { font-weight: bold; font-size: 13px; background: #f8fafc; border-top: 2px solid #333; }
    .footer { margin-top: 16px; font-size: 9px; color: #666; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 30px; }
    .firma { border-top: 1px solid #333; text-align: center; padding-top: 4px; font-size: 9px; color: #555; }
  </style>
</head>
<body>
  <button class="btn no-print" onclick="window.print()">🖨 Imprimir / PDF</button>
  <div class="header">
    <div class="header-top">
      <div>
        <h1>${b.razon_social}</h1>
        <p style="font-size:10px; opacity:0.8">${b.giro || b.actividad_economica || ""}</p>
        <p style="font-size:10px; opacity:0.8">${b.direccion || ""}</p>
        <p style="font-size:10px; opacity:0.8">RUT: ${b.empresa_rut}</p>
      </div>
      <div class="folio">
        <p style="font-size:10px; opacity:0.7">BOLETA DE HONORARIOS ELECTRÓNICA</p>
        <p>N° ${b.folio || "—"}</p>
        <p style="font-size:10px; opacity:0.7">${new Date(b.fecha).toLocaleDateString("es-CL", { year:"numeric", month:"long", day:"numeric" })}</p>
      </div>
    </div>
    <div class="datos">
      <div class="campo"><label>Prestador:</label>${b.nombre_prestador}</div>
      <div class="campo"><label>RUT prestador:</label>${b.rut_prestador}</div>
      <div class="campo"><label>Pagador:</label>${b.nombre_pagador || "—"}</div>
      <div class="campo"><label>RUT pagador:</label>${b.rut_pagador || "—"}</div>
    </div>
    <div class="montos">
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="num">Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Honorarios brutos</td>
            <td class="num">${clp(b.monto_bruto)}</td>
          </tr>
          <tr>
            <td>Retención (${b.tasa_retencion}%)</td>
            <td class="num" style="color:#dc2626">- ${clp(b.monto_retencion)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td>LÍQUIDO A PAGAR</td>
            <td class="num" style="color:#0f766e">${clp(b.monto_liquido)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  <div class="firmas">
    <div class="firma">
      Firma Pagador<br>${b.nombre_pagador || b.razon_social}<br>RUT: ${b.rut_pagador || b.empresa_rut}
    </div>
    <div class="firma">
      Firma Prestador<br>${b.nombre_prestador}<br>RUT: ${b.rut_prestador}
    </div>
  </div>
  <div class="footer">
    <p>Esta boleta de honorarios ha sido emitida de acuerdo al artículo 42 N°2 de la Ley de la Renta.</p>
    <p>La retención del ${b.tasa_retencion}% es de cargo del pagador y debe ser declarada en F29 del período ${b.periodo}.</p>
  </div>
</body>
</html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Listado normal
  const boletas = await sql`
    SELECT * FROM boletas_honorarios
    WHERE empresa_id = ${empresa_id}
      ${periodo ? sql`AND periodo = ${periodo}` : sql``}
      ${tipo ? sql`AND tipo = ${tipo}` : sql``}
    ORDER BY fecha DESC
  `;

  const totales = {
    bruto:    boletas.reduce((s: number, b: any) => s + Number(b.monto_bruto), 0),
    retencion:boletas.reduce((s: number, b: any) => s + Number(b.monto_retencion), 0),
    liquido:  boletas.reduce((s: number, b: any) => s + Number(b.monto_liquido), 0),
  };

  return NextResponse.json({ boletas, totales });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    empresa_id, tipo, periodo, fecha, folio,
    rut_prestador, nombre_prestador, rut_pagador, nombre_pagador,
    monto_bruto, tasa_retencion, observaciones,
  } = body;

  if (!empresa_id || !rut_prestador || !nombre_prestador || !monto_bruto) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const tasa    = Number(tasa_retencion || 13.75);
  const bruto   = Number(monto_bruto);
  const ret     = Math.round(bruto * (tasa / 100));
  const liquido = bruto - ret;

  const [b] = await sql`
    INSERT INTO boletas_honorarios (
      empresa_id, tipo, periodo, fecha, folio,
      rut_prestador, nombre_prestador, rut_pagador, nombre_pagador,
      monto_bruto, tasa_retencion, monto_retencion, monto_liquido, observaciones
    ) VALUES (
      ${empresa_id}, ${tipo || "emitida"},
      ${periodo || new Date().toISOString().slice(0,7)},
      ${fecha || new Date().toISOString().slice(0,10)},
      ${folio || null}, ${rut_prestador}, ${nombre_prestador},
      ${rut_pagador || null}, ${nombre_pagador || null},
      ${bruto}, ${tasa}, ${ret}, ${liquido}, ${observaciones || null}
    ) RETURNING id
  `;
  return NextResponse.json({ id: b.id, monto_retencion: ret, monto_liquido: liquido }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, estado } = await req.json();
  await sql`UPDATE boletas_honorarios SET estado = ${estado} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await sql`UPDATE boletas_honorarios SET estado = 'anulada' WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
