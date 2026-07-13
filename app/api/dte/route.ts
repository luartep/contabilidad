import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const TIPOS_DTE: Record<number, string> = {
  33: "Factura Afecta",
  34: "Factura Exenta",
  39: "Boleta Afecta",
  41: "Boleta Exenta",
  46: "Liquidación-Factura",
  52: "Guía de Despacho",
  56: "Nota de Débito",
  61: "Nota de Crédito",
  110: "Factura Exportación",
};

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo    = req.nextUrl.searchParams.get("periodo");
  const tipo_dte   = req.nextUrl.searchParams.get("tipo_dte");

  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const folios = await sql`
    SELECT * FROM folios_dte WHERE empresa_id = ${empresa_id} AND activo = true
    ORDER BY tipo_dte ASC
  `;

  const documentos = await sql`
    SELECT * FROM documentos_dte
    WHERE empresa_id = ${empresa_id}
      ${periodo ? sql`AND periodo = ${periodo}` : sql``}
      ${tipo_dte ? sql`AND tipo_dte = ${tipo_dte}` : sql``}
    ORDER BY fecha DESC, folio DESC
    LIMIT 200
  `;

  const resumen = await sql`
    SELECT tipo_dte, tipo_nombre,
      COUNT(*) as cantidad,
      SUM(monto_neto) as neto,
      SUM(monto_iva) as iva,
      SUM(monto_total) as total
    FROM documentos_dte
    WHERE empresa_id = ${empresa_id}
      ${periodo ? sql`AND periodo = ${periodo}` : sql``}
      AND estado = 'vigente'
    GROUP BY tipo_dte, tipo_nombre
    ORDER BY tipo_dte ASC
  `;

  return NextResponse.json({ folios, documentos, resumen });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const accion = body.accion;

  // Crear/actualizar rango de folios
  if (accion === "crear_folio") {
    const { empresa_id, tipo_dte, folio_desde, folio_hasta, vencimiento } = body;
    await sql`
      INSERT INTO folios_dte (empresa_id, tipo_dte, folio_desde, folio_hasta, folio_actual, vencimiento)
      VALUES (${empresa_id}, ${tipo_dte}, ${folio_desde}, ${folio_hasta}, ${folio_desde}, ${vencimiento || null})
      ON CONFLICT (empresa_id, tipo_dte) DO UPDATE SET
        folio_desde = EXCLUDED.folio_desde,
        folio_hasta = EXCLUDED.folio_hasta,
        folio_actual = EXCLUDED.folio_desde,
        vencimiento = EXCLUDED.vencimiento,
        activo = true
    `;
    return NextResponse.json({ ok: true });
  }

  // Registrar documento DTE
  const {
    empresa_id, tipo_dte, folio, periodo, fecha,
    rut_receptor, razon_social_receptor,
    monto_neto, monto_iva, monto_exento, monto_total,
    referencia_id, observaciones,
  } = body;

  const tipo_nombre = TIPOS_DTE[Number(tipo_dte)] || `DTE ${tipo_dte}`;
  const neto    = Number(monto_neto || 0);
  const iva     = monto_iva !== undefined ? Number(monto_iva) : Math.round(neto * 0.19);
  const exento  = Number(monto_exento || 0);
  const total   = monto_total !== undefined ? Number(monto_total) : neto + iva + exento;

  // Usar folio manual o el siguiente del rango
  let folioUsado = folio;
  if (!folioUsado) {
    const [fRow] = await sql`
      SELECT folio_actual FROM folios_dte
      WHERE empresa_id = ${empresa_id} AND tipo_dte = ${tipo_dte} AND activo = true
    `;
    if (!fRow) return NextResponse.json({ error: "No hay rango de folios configurado para este tipo DTE" }, { status: 400 });
    folioUsado = fRow.folio_actual;
    // Avanzar folio
    await sql`
      UPDATE folios_dte SET folio_actual = folio_actual + 1
      WHERE empresa_id = ${empresa_id} AND tipo_dte = ${tipo_dte}
    `;
  }

  const [doc] = await sql`
    INSERT INTO documentos_dte (
      empresa_id, tipo_dte, tipo_nombre, folio, periodo, fecha,
      rut_receptor, razon_social_receptor,
      monto_neto, monto_iva, monto_exento, monto_total,
      referencia_id, observaciones
    ) VALUES (
      ${empresa_id}, ${tipo_dte}, ${tipo_nombre}, ${folioUsado},
      ${periodo || new Date().toISOString().slice(0,7)},
      ${fecha || new Date().toISOString().slice(0,10)},
      ${rut_receptor || null}, ${razon_social_receptor || null},
      ${neto}, ${iva}, ${exento}, ${total},
      ${referencia_id || null}, ${observaciones || null}
    )
    ON CONFLICT (empresa_id, tipo_dte, folio) DO NOTHING
    RETURNING id
  `;

  return NextResponse.json({ id: doc?.id, folio: folioUsado }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, estado } = await req.json();
  await sql`UPDATE documentos_dte SET estado = ${estado} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
