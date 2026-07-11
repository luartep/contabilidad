import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { parsearRCV } from "@/lib/parserRCV";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const empresa_id = formData.get("empresa_id") as string;
  const periodo = formData.get("periodo") as string;
  const tipo = formData.get("tipo") as "venta" | "compra"; // 'venta' o 'compra'
  const archivo = formData.get("archivo") as File;

  if (!empresa_id || !periodo || !tipo || !archivo) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  if (!["venta", "compra"].includes(tipo)) {
    return NextResponse.json({ error: "tipo debe ser 'venta' o 'compra'" }, { status: 400 });
  }

  const bytes = await archivo.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let documentos;
  try {
    documentos = parsearRCV(buffer, tipo, archivo.name);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Error al leer el archivo: ${e.message}. Verifica que sea el CSV o Excel exportado desde el RCV del SII.` },
      { status: 400 }
    );
  }

  if (!documentos.length) {
    return NextResponse.json(
      { error: "No se encontraron documentos en el archivo. Verifica que el archivo corresponda al período y al libro correcto (ventas o compras)." },
      { status: 400 }
    );
  }

  // Eliminar documentos previos del mismo tipo y período (reimportación limpia)
  await sql`
    DELETE FROM documentos_f29
    WHERE empresa_id = ${empresa_id} AND periodo = ${periodo} AND tipo = ${tipo}
  `;

  // Insertar todos los documentos del RCV
  let insertados = 0;
  let omitidos = 0;

  for (const doc of documentos) {
    // Saltar documentos con monto total 0 y sin neto ni exento
    if (doc.monto_total === 0 && doc.monto_neto === 0 && doc.monto_exento === 0) {
      omitidos++;
      continue;
    }

    await sql`
      INSERT INTO documentos_f29 (
        empresa_id, periodo, tipo, tipo_documento,
        folio, rut_contraparte, razon_social_contraparte,
        fecha, monto_neto, monto_iva, monto_exento, monto_total,
        retencion_honorario, es_nota_credito
      ) VALUES (
        ${empresa_id}, ${periodo}, ${tipo}, ${doc.tipo_documento},
        ${doc.folio || null}, ${doc.rut_contraparte || null}, ${doc.razon_social || null},
        ${doc.fecha}, ${doc.monto_neto}, ${doc.monto_iva}, ${doc.monto_exento}, ${doc.monto_total},
        0, ${doc.es_nota_credito}
      )
    `;
    insertados++;
  }

  return NextResponse.json({
    ok: true,
    insertados,
    omitidos,
    mensaje: `Se importaron ${insertados} documentos de ${tipo === "venta" ? "ventas" : "compras"}${omitidos > 0 ? ` (${omitidos} omitidos por monto cero)` : ""}.`,
  });
}
