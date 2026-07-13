import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Plan de cuentas estándar Chile para pymes (simplificado)
export const PLAN_CUENTAS_BASE = [
  // ACTIVO
  { codigo: "1", nombre: "ACTIVO", tipo: "activo", es_imputable: false },
  { codigo: "1.1", nombre: "Activo Corriente", tipo: "activo", subtipo: "corriente", es_imputable: false },
  { codigo: "1.1.01", nombre: "Caja", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.02", nombre: "Banco", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.03", nombre: "Clientes", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.04", nombre: "Documentos por Cobrar", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.05", nombre: "IVA Crédito Fiscal", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.06", nombre: "PPM por Recuperar", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.07", nombre: "Existencias / Inventario", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.1.08", nombre: "Otros Activos Corrientes", tipo: "activo", subtipo: "corriente", cuenta_padre: "1.1" },
  { codigo: "1.2", nombre: "Activo No Corriente", tipo: "activo", subtipo: "no_corriente", es_imputable: false },
  { codigo: "1.2.01", nombre: "Maquinaria y Equipos", tipo: "activo", subtipo: "no_corriente", cuenta_padre: "1.2" },
  { codigo: "1.2.02", nombre: "Vehículos", tipo: "activo", subtipo: "no_corriente", cuenta_padre: "1.2" },
  { codigo: "1.2.03", nombre: "Muebles y Útiles", tipo: "activo", subtipo: "no_corriente", cuenta_padre: "1.2" },
  { codigo: "1.2.04", nombre: "Equipos Computacionales", tipo: "activo", subtipo: "no_corriente", cuenta_padre: "1.2" },
  { codigo: "1.2.09", nombre: "Depreciación Acumulada", tipo: "activo", subtipo: "no_corriente", cuenta_padre: "1.2" },
  // PASIVO
  { codigo: "2", nombre: "PASIVO", tipo: "pasivo", es_imputable: false },
  { codigo: "2.1", nombre: "Pasivo Corriente", tipo: "pasivo", subtipo: "corriente", es_imputable: false },
  { codigo: "2.1.01", nombre: "Proveedores", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.02", nombre: "Documentos por Pagar", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.03", nombre: "IVA Débito Fiscal", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.04", nombre: "Remuneraciones por Pagar", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.05", nombre: "Cotizaciones Previsionales por Pagar", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.06", nombre: "Impuestos por Pagar", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.07", nombre: "Vacaciones por Pagar", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.1.08", nombre: "Otros Pasivos Corrientes", tipo: "pasivo", subtipo: "corriente", cuenta_padre: "2.1" },
  { codigo: "2.2", nombre: "Pasivo No Corriente", tipo: "pasivo", subtipo: "no_corriente", es_imputable: false },
  { codigo: "2.2.01", nombre: "Préstamos Bancarios Largo Plazo", tipo: "pasivo", subtipo: "no_corriente", cuenta_padre: "2.2" },
  // PATRIMONIO
  { codigo: "3", nombre: "PATRIMONIO", tipo: "patrimonio", es_imputable: false },
  { codigo: "3.1.01", nombre: "Capital", tipo: "patrimonio", cuenta_padre: "3" },
  { codigo: "3.1.02", nombre: "Utilidades Retenidas", tipo: "patrimonio", cuenta_padre: "3" },
  { codigo: "3.1.03", nombre: "Utilidad / Pérdida del Ejercicio", tipo: "patrimonio", cuenta_padre: "3" },
  // INGRESOS
  { codigo: "4", nombre: "INGRESOS", tipo: "ingreso", es_imputable: false },
  { codigo: "4.1.01", nombre: "Ventas de Servicios", tipo: "ingreso", cuenta_padre: "4" },
  { codigo: "4.1.02", nombre: "Ventas de Productos", tipo: "ingreso", cuenta_padre: "4" },
  { codigo: "4.1.03", nombre: "Otros Ingresos Operacionales", tipo: "ingreso", cuenta_padre: "4" },
  { codigo: "4.2.01", nombre: "Ingresos Financieros", tipo: "ingreso", cuenta_padre: "4" },
  { codigo: "4.2.02", nombre: "Otros Ingresos No Operacionales", tipo: "ingreso", cuenta_padre: "4" },
  // EGRESOS / GASTOS
  { codigo: "5", nombre: "GASTOS", tipo: "egreso", es_imputable: false },
  { codigo: "5.1.01", nombre: "Sueldos y Salarios", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.1.02", nombre: "Cotizaciones Previsionales Empleador", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.1.03", nombre: "Gratificaciones", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.1.04", nombre: "Honorarios", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.2.01", nombre: "Arriendo", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.2.02", nombre: "Servicios Básicos", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.2.03", nombre: "Gastos de Oficina", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.2.04", nombre: "Comunicaciones", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.2.05", nombre: "Gastos de Vehículo", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.2.06", nombre: "Depreciación del Ejercicio", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.3.01", nombre: "Gastos Financieros / Intereses", tipo: "egreso", cuenta_padre: "5" },
  { codigo: "5.3.02", nombre: "Otros Gastos No Operacionales", tipo: "egreso", cuenta_padre: "5" },
];

export async function GET(req: NextRequest) {
  const empresa_id = req.nextUrl.searchParams.get("empresa_id");
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  const cuentas = await sql`
    SELECT * FROM plan_cuentas WHERE empresa_id = ${empresa_id} AND activa = true
    ORDER BY codigo ASC
  `;
  return NextResponse.json({ cuentas });
}

export async function POST(req: NextRequest) {
  const { empresa_id, cargar_base } = await req.json();
  if (!empresa_id) return NextResponse.json({ error: "Falta empresa_id" }, { status: 400 });

  if (cargar_base) {
    // Cargar el plan base si la empresa no tiene ninguno
    const existentes = await sql`SELECT COUNT(*) as c FROM plan_cuentas WHERE empresa_id = ${empresa_id}`;
    if (Number(existentes[0].c) > 0) {
      return NextResponse.json({ error: "La empresa ya tiene un plan de cuentas. Agrega cuentas individualmente." }, { status: 400 });
    }
    for (const c of PLAN_CUENTAS_BASE) {
      await sql`
        INSERT INTO plan_cuentas (empresa_id, codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable)
        VALUES (${empresa_id}, ${c.codigo}, ${c.nombre}, ${c.tipo}, ${(c as any).subtipo || null},
                ${(c as any).cuenta_padre || null}, ${c.es_imputable !== false})
        ON CONFLICT (empresa_id, codigo) DO NOTHING
      `;
    }
    return NextResponse.json({ ok: true, cuentas: PLAN_CUENTAS_BASE.length });
  }

  // Agregar una cuenta individual
  const { codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable } = await req.json();
  await sql`
    INSERT INTO plan_cuentas (empresa_id, codigo, nombre, tipo, subtipo, cuenta_padre, es_imputable)
    VALUES (${empresa_id}, ${codigo}, ${nombre}, ${tipo}, ${subtipo || null},
            ${cuenta_padre || null}, ${es_imputable !== false})
    ON CONFLICT (empresa_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre, activa = true
  `;
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { empresa_id, codigo, nombre, activa } = await req.json();
  await sql`
    UPDATE plan_cuentas SET
      nombre = COALESCE(${nombre ?? null}, nombre),
      activa = COALESCE(${activa ?? null}, activa)
    WHERE empresa_id = ${empresa_id} AND codigo = ${codigo}
  `;
  return NextResponse.json({ ok: true });
}
