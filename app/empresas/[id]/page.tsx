import Link from "next/link";
import { sql } from "@/lib/db";
import NuevoTrabajadorForm from "./NuevoTrabajadorForm";

export const dynamic = "force-dynamic";

export default async function EmpresaDetallePage({ params }: { params: { id: string } }) {
  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${params.id}`;
  const trabajadores = await sql`
    SELECT id, rut, nombres, apellidos, tipo_contrato, cargo, activo
    FROM trabajadores WHERE empresa_id = ${params.id} ORDER BY apellidos ASC
  `;

  if (!empresa) {
    return <div className="max-w-4xl mx-auto px-4 py-10">Empresa no encontrada.</div>;
  }

  const contratoLabel: Record<string, string> = {
    indefinido: "Indefinido",
    plazo_fijo: "Plazo fijo",
    por_obra: "Por obra/faena",
    honorarios: "Honorarios",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link href="/empresas" className="text-sm text-teal-700 hover:underline">
        ← Empresas
      </Link>

      <div className="mt-3 mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">{empresa.razon_social}</h1>
        <p className="text-sm text-slate-500">
          {empresa.rut} · {empresa.regimen_tributario || "Régimen no definido"}
        </p>
      </div>

      <nav className="flex gap-3 mb-8 text-sm">
        <span className="px-3 py-1.5 rounded-full bg-teal-700 text-white">Trabajadores</span>
        <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-400">
          Remuneraciones (Fase 2)
        </span>
        <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-400">
          F29 (Fase 4)
        </span>
      </nav>

      <NuevoTrabajadorForm empresaId={empresa.id} />

      <div className="mt-8 divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
        {trabajadores.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aún no agregas trabajadores para esta empresa.</p>
        )}
        {trabajadores.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium text-slate-900">
                {t.nombres} {t.apellidos}
              </p>
              <p className="text-sm text-slate-500">
                {t.rut} {t.cargo ? `· ${t.cargo}` : ""}
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
              {contratoLabel[t.tipo_contrato] || t.tipo_contrato}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
