import Link from "next/link";
import { sql } from "@/lib/db";
import NuevaEmpresaForm from "./NuevaEmpresaForm";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const empresas = await sql`
    SELECT id, rut, razon_social, nombre_fantasia, regimen_tributario, activa
    FROM empresas
    ORDER BY razon_social ASC
  `;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500">Tus empresas clientes</p>
        </div>
      </div>

      <NuevaEmpresaForm />

      <div className="mt-8 divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
        {empresas.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aún no agregas empresas.</p>
        )}
        {empresas.map((e: any) => (
          <Link
            key={e.id}
            href={`/empresas/${e.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
          >
            <div>
              <p className="font-medium text-slate-900">{e.razon_social}</p>
              <p className="text-sm text-slate-500">
                {e.rut} {e.nombre_fantasia ? `· ${e.nombre_fantasia}` : ""}
              </p>
            </div>
            <span className="text-xs text-slate-400">{e.regimen_tributario || "—"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
