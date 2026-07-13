import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo    = req.nextUrl.searchParams.get("periodo");
  const cuenta     = req.nextUrl.searchParams.get("cuenta"); // para libro mayor
  const tipo       = req.nextUrl.searchParams.get("tipo");   // 'diario' | 'mayor' | 'balance'

  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  if (tipo === "mayor" && cuenta) {
    // Libro Mayor de una cuenta
    const movimientos = await sql`
      SELECT vl.*, v.fecha, v.numero, v.glosa as voucher_glosa, v.tipo as voucher_tipo, v.periodo
      FROM voucher_lineas vl
      JOIN vouchers v ON v.id = vl.voucher_id
      WHERE v.empresa_id = ${empresa_id}
        AND vl.cuenta_codigo = ${cuenta}
        ${periodo ? sql`AND v.periodo = ${periodo}` : sql``}
      ORDER BY v.fecha ASC, v.numero ASC, vl.orden ASC
    `;
    const saldo_debe  = movimientos.reduce((s: number, m: any) => s + Number(m.debe), 0);
    const saldo_haber = movimientos.reduce((s: number, m: any) => s + Number(m.haber), 0);
    return NextResponse.json({ movimientos, saldo_debe, saldo_haber, saldo: saldo_debe - saldo_haber });
  }

  if (tipo === "balance") {
    // Balance de comprobación y saldos
    const saldos = await sql`
      SELECT 
        vl.cuenta_codigo as codigo,
        pc.nombre,
        pc.tipo,
        pc.subtipo,
        SUM(vl.debe)  as total_debe,
        SUM(vl.haber) as total_haber,
        SUM(vl.debe) - SUM(vl.haber) as saldo
      FROM voucher_lineas vl
      JOIN vouchers v ON v.id = vl.voucher_id
      JOIN plan_cuentas pc ON pc.empresa_id = v.empresa_id AND pc.codigo = vl.cuenta_codigo
      WHERE v.empresa_id = ${empresa_id}
        ${periodo ? sql`AND v.periodo = ${periodo}` : sql``}
      GROUP BY vl.cuenta_codigo, pc.nombre, pc.tipo, pc.subtipo
      ORDER BY vl.cuenta_codigo ASC
    `;
    return NextResponse.json({ saldos });
  }

  // Libro Diario (default)
  const vouchers = await sql`
    SELECT v.*,
      json_agg(vl ORDER BY vl.orden ASC) as lineas
    FROM vouchers v
    LEFT JOIN voucher_lineas vl ON vl.voucher_id = v.id
    WHERE v.empresa_id = ${empresa_id}
      ${periodo ? sql`AND v.periodo = ${periodo}` : sql``}
    GROUP BY v.id
    ORDER BY v.fecha ASC, v.numero ASC
  `;
  return NextResponse.json({ vouchers });
}

export async function POST(req: NextRequest) {
  const { empresa_id, periodo, fecha, tipo, glosa, lineas } = await req.json();
  if (!empresa_id || !glosa || !lineas?.length) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Validar cuadre
  const total_debe  = lineas.reduce((s: number, l: any) => s + Number(l.debe || 0), 0);
  const total_haber = lineas.reduce((s: number, l: any) => s + Number(l.haber || 0), 0);
  const cuadrado    = Math.abs(total_debe - total_haber) < 1;

  // Obtener correlativo
  const [{ max_num }] = await sql`
    SELECT COALESCE(MAX(numero), 0) as max_num FROM vouchers
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo || new Date().toISOString().slice(0,7)}
  `;
  const numero = Number(max_num) + 1;

  const [voucher] = await sql`
    INSERT INTO vouchers (empresa_id, periodo, fecha, numero, tipo, glosa, total_debe, total_haber, cuadrado)
    VALUES (
      ${empresa_id},
      ${periodo || new Date().toISOString().slice(0,7)},
      ${fecha || new Date().toISOString().slice(0,10)},
      ${numero}, ${tipo || "diario"}, ${glosa},
      ${total_debe}, ${total_haber}, ${cuadrado}
    )
    RETURNING id
  `;

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    await sql`
      INSERT INTO voucher_lineas (voucher_id, cuenta_codigo, cuenta_nombre, glosa, debe, haber, orden)
      VALUES (${voucher.id}, ${l.cuenta_codigo}, ${l.cuenta_nombre || ""}, ${l.glosa || null},
              ${Number(l.debe) || 0}, ${Number(l.haber) || 0}, ${i + 1})
    `;
  }

  if (!cuadrado) {
    return NextResponse.json(
      { ok: true, id: voucher.id, warning: `Voucher no cuadrado: Debe ${total_debe} ≠ Haber ${total_haber}` },
      { status: 201 }
    );
  }
  return NextResponse.json({ ok: true, id: voucher.id, numero }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  await sql`DELETE FROM vouchers WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
