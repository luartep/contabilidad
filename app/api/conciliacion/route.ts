import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import * as XLSX from "xlsx";

// Parser de cartola bancaria — detecta formato automáticamente
function parsearCartola(buffer: Buffer, nombre: string): {
  fecha: string; descripcion: string; cargo: number; abono: number; saldo: number | null;
}[] {
  const esExcel = nombre.toLowerCase().endsWith(".xlsx") || nombre.toLowerCase().endsWith(".xls");
  let filas: any[][];

  if (esExcel) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  } else {
    const texto = buffer.toString("latin1");
    const lineas = texto.split(/\r?\n/).filter(l => l.trim());
    const sep = lineas[0]?.includes(";") ? ";" : ",";
    filas = lineas.map(l => l.split(sep).map(c => c.replace(/^"|"$/g, "").trim()));
  }

  if (filas.length < 2) return [];

  function norm(h: string) {
    return h?.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
  }

  // Buscar headers
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, filas.length); i++) {
    const row = filas[i].map(h => norm(String(h)));
    if (row.some(h => h.includes("fecha") || h.includes("descripcion") || h.includes("cargo"))) {
      headerIdx = i; break;
    }
  }
  const headers = filas[headerIdx].map(h => String(h));

  function findCol(aliases: string[]): number {
    const norm_headers = headers.map(h => norm(h));
    for (const a of aliases) {
      const i = norm_headers.findIndex(h => h.includes(a));
      if (i >= 0) return i;
    }
    return -1;
  }

  const idx = {
    fecha: findCol(["fecha"]),
    desc:  findCol(["descripcion","glosa","detalle","concepto","movimiento"]),
    cargo: findCol(["cargo","debito","debe","monto cargo","egreso"]),
    abono: findCol(["abono","credito","haber","monto abono","ingreso"]),
    saldo: findCol(["saldo","balance"]),
  };

  function parseMonto(v: any): number {
    if (!v) return 0;
    return Math.round(Number(String(v).replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,"")) || 0);
  }

  function parseFecha(v: any): string {
    const s = String(v).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d,m,y] = s.split("/"); return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    if (!isNaN(Number(s))) {
      const d = XLSX.SSF.parse_date_code(Number(s));
      if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
    }
    return new Date().toISOString().slice(0,10);
  }

  const movimientos = [];
  for (let i = headerIdx + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.every(c => !c)) continue;
    if (idx.fecha < 0) continue;
    const cargo = idx.cargo >= 0 ? parseMonto(fila[idx.cargo]) : 0;
    const abono = idx.abono >= 0 ? parseMonto(fila[idx.abono]) : 0;
    if (cargo === 0 && abono === 0) continue;
    movimientos.push({
      fecha:       parseFecha(fila[idx.fecha]),
      descripcion: idx.desc >= 0 ? String(fila[idx.desc]).trim() : "Sin descripción",
      cargo, abono,
      saldo: idx.saldo >= 0 ? parseMonto(fila[idx.saldo]) : null,
    });
  }
  return movimientos;
}

export async function GET(req: NextRequest) {
  const empresa_id      = req.nextUrl.searchParams.get("empresa_id");
  const cuenta_id       = req.nextUrl.searchParams.get("cuenta_id");
  const periodo         = req.nextUrl.searchParams.get("periodo");
  const solo_cuentas    = req.nextUrl.searchParams.get("solo_cuentas");

  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const cuentas = await sql`
    SELECT * FROM cuentas_bancarias WHERE empresa_id = ${empresa_id} AND activa = true ORDER BY banco ASC
  `;

  if (solo_cuentas) return NextResponse.json({ cuentas });

  let movimientos: any[] = [];
  if (cuenta_id && periodo) {
    movimientos = await sql`
      SELECT m.*, v.glosa as voucher_glosa, v.numero as voucher_numero
      FROM movimientos_bancarios m
      LEFT JOIN vouchers v ON v.id = m.voucher_id
      WHERE m.cuenta_bancaria_id = ${cuenta_id} AND m.periodo = ${periodo}
      ORDER BY m.fecha ASC
    `;
  }

  const totalCargos  = movimientos.reduce((s, m) => s + Number(m.cargo), 0);
  const totalAbonos  = movimientos.reduce((s, m) => s + Number(m.abono), 0);
  const conciliados  = movimientos.filter(m => m.conciliado).length;
  const pendientes   = movimientos.filter(m => !m.conciliado).length;

  return NextResponse.json({ cuentas, movimientos, totalCargos, totalAbonos, conciliados, pendientes });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  // Crear cuenta bancaria
  if (contentType.includes("application/json")) {
    const { empresa_id, banco, numero_cuenta, tipo, cuenta_contable } = await req.json();
    const [c] = await sql`
      INSERT INTO cuentas_bancarias (empresa_id, banco, numero_cuenta, tipo, cuenta_contable)
      VALUES (${empresa_id}, ${banco}, ${numero_cuenta}, ${tipo || "corriente"}, ${cuenta_contable || null})
      RETURNING id
    `;
    return NextResponse.json({ id: c.id }, { status: 201 });
  }

  // Importar cartola
  const formData = await req.formData();
  const empresa_id  = formData.get("empresa_id") as string;
  const cuenta_id   = formData.get("cuenta_id") as string;
  const periodo     = formData.get("periodo") as string;
  const archivo     = formData.get("archivo") as File;

  if (!empresa_id || !cuenta_id || !periodo || !archivo) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  let movimientos;
  try {
    movimientos = parsearCartola(buffer, archivo.name);
  } catch (e: any) {
    return NextResponse.json({ error: `Error al leer la cartola: ${e.message}` }, { status: 400 });
  }
  if (!movimientos.length) {
    return NextResponse.json({ error: "No se encontraron movimientos en la cartola." }, { status: 400 });
  }

  // Limpiar movimientos anteriores del período para esta cuenta (reimportación)
  await sql`
    DELETE FROM movimientos_bancarios
    WHERE cuenta_bancaria_id = ${cuenta_id} AND periodo = ${periodo} AND origen = 'cartola'
  `;

  let insertados = 0;
  for (const m of movimientos) {
    await sql`
      INSERT INTO movimientos_bancarios (cuenta_bancaria_id, empresa_id, periodo, fecha, descripcion, cargo, abono, saldo, origen)
      VALUES (${cuenta_id}, ${empresa_id}, ${periodo}, ${m.fecha}, ${m.descripcion},
              ${m.cargo}, ${m.abono}, ${m.saldo || null}, 'cartola')
    `;
    insertados++;
  }

  return NextResponse.json({ ok: true, insertados, mensaje: `Se importaron ${insertados} movimientos.` });
}

// PATCH: conciliar o desconciliar un movimiento, o asignar voucher
export async function PATCH(req: NextRequest) {
  const { id, conciliado, voucher_id } = await req.json();
  await sql`
    UPDATE movimientos_bancarios
    SET conciliado = COALESCE(${conciliado ?? null}, conciliado),
        voucher_id = COALESCE(${voucher_id ?? null}, voucher_id)
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
