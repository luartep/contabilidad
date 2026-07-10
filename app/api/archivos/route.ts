import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  const periodo = req.nextUrl.searchParams.get("periodo");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const archivos = await sql`
    SELECT * FROM archivos_generados
    WHERE empresa_id = ${empresa_id}
      ${periodo ? sql`AND periodo = ${periodo}` : sql``}
    ORDER BY generado_en DESC
    LIMIT 20
  `;
  return NextResponse.json({ archivos });
}
