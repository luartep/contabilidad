import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Protección con secret para el cron de Vercel
const CRON_SECRET = process.env.CRON_SECRET;

// ─── Scraper de indicadores Previred ───────────────────────────────────────
async function scrapearPrevired() {
  const res = await fetch("https://www.previred.com/indicadores-previsionales/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ContaPyme/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Previred respondió ${res.status}`);
  const html = await res.text();

  // Helpers de extracción
  const num = (pattern: RegExp): number | null => {
    const m = html.match(pattern);
    if (!m) return null;
    return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  };
  const pct = (pattern: RegExp): number | null => {
    const m = html.match(pattern);
    if (!m) return null;
    return parseFloat(m[1].replace(",", "."));
  };

  // UF (última disponible del mes actual)
  const uf = num(/Al \d+ de \w+ del \d+:\s*\$\s*([\d.,]+)/);

  // UTM
  const utm = num(/UTM.*?\$\s*([\d.,]+)/s);

  // IMM (Renta mínima imponible dependientes)
  const imm = num(/Trab\. Dependientes.*?:\s*\$\s*([\d.,]+)/);

  // Topes imponibles en UF
  // AFP/Salud = 90 UF, Cesantía = 135.2 UF (valores legales estables, se leen del HTML si cambian)
  const tope_afp_salud_uf = num(/AFP.*?90 UF/s) ? 90 : 90;
  const tope_cesantia_uf  = num(/Cesantía.*?135,?2 UF/is) ? 135.2 : 135.2;

  // AFC (Seguro Cesantía)
  const afc_indef_empleador  = pct(/Plazo Indefinido\s+(\d+,?\d*)%\s+R\.I\.\s+\d+,?\d*%/);
  const afc_indef_trabajador = pct(/Plazo Indefinido\s+\d+,?\d*%\s+R\.I\.\s+(\d+,?\d*)%/);
  const afc_plazo_fijo       = pct(/Plazo Fijo\s+(\d+,?\d*)%\s+R\.I\./);

  // SIS
  const tasa_sis = pct(/Tasa SIS\s+([\d,]+)%/);

  // Asignación familiar tramos
  const af1_monto  = num(/1 \(A\)\s*\$\s*([\d.,]+)/);
  const af1_hasta  = num(/Renta < ó = \$\s*([\d.,]+)/);
  const af2_monto  = num(/2 \(B\)\s*\$\s*([\d.,]+)/);
  const af2_hasta  = num(/Renta > \$\s*([\d.,]+)\s*<\s*= \$\s*([\d.,]+)/)
                     ?? num(/< = \$\s*([\d.,]+).*?< = \$\s*([\d.,]+)/s);
  const af3_monto  = num(/3 \(C\)\s*\$\s*([\d.,]+)/);
  const af3_hasta  = num(/Renta > \$[\d.,]+ < = \$\s*([\d.,]+)\s*3 \(D\)/s);

  // Comisiones AFP (dependientes, cargo trabajador)
  const afpRegex = (nombre: string) => {
    const r = new RegExp(nombre + "\\s+([\\d,]+)%\\s+([\\d,]+)%", "i");
    const m = html.match(r);
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  };
  const comisiones: Record<string, number | null> = {
    Capital:  afpRegex("Capital"),
    Cuprum:   afpRegex("Cuprum"),
    Habitat:  afpRegex("Habitat"),
    PlanVital:afpRegex("PlanVital"),
    ProVida:  afpRegex("ProVida"),
    Modelo:   afpRegex("Modelo"),
    Uno:      afpRegex("Uno"),
  };

  return {
    uf,
    utm,
    imm,
    tope_imponible_afp_salud_uf: tope_afp_salud_uf,
    tope_imponible_cesantia_uf: tope_cesantia_uf,
    tasa_afc_indefinido_empleador:  afc_indef_empleador  ?? 2.4,
    tasa_afc_indefinido_trabajador: afc_indef_trabajador ?? 0.6,
    tasa_afc_plazo_fijo_empleador:  afc_plazo_fijo       ?? 3.0,
    tasa_salud_fonasa: 7.0, // legalmente fija
    tasa_sis:   tasa_sis   ?? 1.62,
    af_tramo1_monto: af1_monto, af_tramo1_hasta: af1_hasta,
    af_tramo2_monto: af2_monto, af_tramo2_hasta: af2_hasta,
    af_tramo3_monto: af3_monto, af_tramo3_hasta: af3_hasta,
    af_tramo4_monto: 0,
    comisiones,
  };
}

// ─── Tramos impuesto único junio 2026 (SII — no están en Previred) ────────
// Se mantienen aquí como fallback; el endpoint /api/parametros/tramos-sii
// puede actualizarlos cuando el SII los publique.
const TRAMOS_IUSC_DEFAULT = [
  { tramo: 1, desde: 0,         hasta: 939558,  factor: 0,      rebaja: 0       },
  { tramo: 2, desde: 939558,    hasta: 2088795, factor: 0.04,   rebaja: 37582   },
  { tramo: 3, desde: 2088795,   hasta: 3481325, factor: 0.08,   rebaja: 121134  },
  { tramo: 4, desde: 3481325,   hasta: 4872055, factor: 0.135,  rebaja: 312581  },
  { tramo: 5, desde: 4872055,   hasta: 6262785, factor: 0.23,   rebaja: 775654  },
  { tramo: 6, desde: 6262785,   hasta: 8350380, factor: 0.304,  rebaja: 1238892 },
  { tramo: 7, desde: 8350380,   hasta: 16700760,factor: 0.355,  rebaja: 1664805 },
  { tramo: 8, desde: 16700760,  hasta: null,    factor: 0.40,   rebaja: 2417841 },
];

// ─── Handler principal ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Verificar secret (llamado desde cron de Vercel o desde la UI con el secret)
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Determinar período: el cron corre el 10 de cada mes para el mes anterior
  const body = await req.json().catch(() => ({}));
  let periodo: string = body.periodo ?? "";
  if (!periodo) {
    const ahora = new Date();
    // Si estamos después del día 9, el período es el mes anterior
    // (los indicadores son para remuneraciones del mes anterior)
    const mes = ahora.getDate() >= 10
      ? new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
      : new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
    periodo = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
  }

  try {
    const datos = await scrapearPrevired();

    if (!datos.uf || !datos.utm) {
      return NextResponse.json(
        { error: "No se pudo extraer UF o UTM de Previred", datos },
        { status: 502 }
      );
    }

    // Guardar/actualizar parámetros del período
    await sql`
      INSERT INTO parametros_periodo (
        periodo, uf, utm, imm,
        tope_imponible_afp_salud_uf, tope_imponible_cesantia_uf,
        tasa_afc_indefinido_trabajador, tasa_afc_indefinido_empleador,
        tasa_afc_plazo_fijo_empleador, tasa_salud_fonasa,
        af_tramo1_monto, af_tramo1_hasta,
        af_tramo2_monto, af_tramo2_hasta,
        af_tramo3_monto, af_tramo3_hasta,
        af_tramo4_monto
      ) VALUES (
        ${periodo},
        ${datos.uf}, ${datos.utm}, ${datos.imm ?? 539000},
        ${datos.tope_imponible_afp_salud_uf}, ${datos.tope_imponible_cesantia_uf},
        ${datos.tasa_afc_indefinido_trabajador}, ${datos.tasa_afc_indefinido_empleador},
        ${datos.tasa_afc_plazo_fijo_empleador}, ${datos.tasa_salud_fonasa},
        ${datos.af_tramo1_monto ?? 22007}, ${datos.af_tramo1_hasta ?? 631976},
        ${datos.af_tramo2_monto ?? 13505}, ${datos.af_tramo2_hasta ?? 923067},
        ${datos.af_tramo3_monto ?? 4267},  ${datos.af_tramo3_hasta ?? 1439668},
        ${datos.af_tramo4_monto ?? 0}
      )
      ON CONFLICT (periodo) DO UPDATE SET
        uf                             = EXCLUDED.uf,
        utm                            = EXCLUDED.utm,
        imm                            = EXCLUDED.imm,
        tope_imponible_afp_salud_uf    = EXCLUDED.tope_imponible_afp_salud_uf,
        tope_imponible_cesantia_uf     = EXCLUDED.tope_imponible_cesantia_uf,
        tasa_afc_indefinido_trabajador = EXCLUDED.tasa_afc_indefinido_trabajador,
        tasa_afc_indefinido_empleador  = EXCLUDED.tasa_afc_indefinido_empleador,
        tasa_afc_plazo_fijo_empleador  = EXCLUDED.tasa_afc_plazo_fijo_empleador,
        tasa_salud_fonasa              = EXCLUDED.tasa_salud_fonasa,
        af_tramo1_monto = EXCLUDED.af_tramo1_monto,
        af_tramo1_hasta = EXCLUDED.af_tramo1_hasta,
        af_tramo2_monto = EXCLUDED.af_tramo2_monto,
        af_tramo2_hasta = EXCLUDED.af_tramo2_hasta,
        af_tramo3_monto = EXCLUDED.af_tramo3_monto,
        af_tramo3_hasta = EXCLUDED.af_tramo3_hasta,
        af_tramo4_monto = EXCLUDED.af_tramo4_monto
    `;

    // Tramos IUSC: solo insertar si no existen (no los sobreescribimos porque
    // el SII puede haberlos actualizado manualmente)
    const existentes = await sql`
      SELECT COUNT(*) as c FROM tramos_impuesto_unico WHERE periodo = ${periodo}
    `;
    if (Number(existentes[0].c) === 0) {
      for (const t of TRAMOS_IUSC_DEFAULT) {
        await sql`
          INSERT INTO tramos_impuesto_unico (periodo, tramo, desde, hasta, factor, rebaja)
          VALUES (${periodo}, ${t.tramo}, ${t.desde}, ${t.hasta ?? null}, ${t.factor}, ${t.rebaja})
          ON CONFLICT (periodo, tramo) DO NOTHING
        `;
      }
    }

    // Comisiones AFP
    await sql`DELETE FROM comisiones_afp WHERE periodo = ${periodo}`;
    for (const [afp, tasa] of Object.entries(datos.comisiones)) {
      if (tasa !== null) {
        await sql`
          INSERT INTO comisiones_afp (periodo, nombre_afp, comision_pct)
          VALUES (${periodo}, ${afp}, ${tasa})
          ON CONFLICT (periodo, nombre_afp) DO UPDATE SET comision_pct = EXCLUDED.comision_pct
        `;
      }
    }

    return NextResponse.json({
      ok: true,
      periodo,
      datos: {
        uf: datos.uf,
        utm: datos.utm,
        imm: datos.imm,
        tasa_sis: datos.tasa_sis,
        af_tramo1: { monto: datos.af_tramo1_monto, hasta: datos.af_tramo1_hasta },
        af_tramo2: { monto: datos.af_tramo2_monto, hasta: datos.af_tramo2_hasta },
        af_tramo3: { monto: datos.af_tramo3_monto, hasta: datos.af_tramo3_hasta },
        comisiones: datos.comisiones,
      },
    });
  } catch (err: any) {
    console.error("Error sincronizando Previred:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: útil para disparar manualmente desde el navegador durante desarrollo
export async function GET(req: NextRequest) {
  return POST(req);
}
