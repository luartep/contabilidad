import Link from "next/link";
import { sql } from "@/lib/db";
import NuevoTrabajadorForm from "./NuevoTrabajadorForm";
import EditarEmpresaForm from "./EditarEmpresaForm";
import AccionesEmpresa from "./AccionesEmpresa";

export const dynamic = "force-dynamic";

export default async function EmpresaDetallePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [empresa] = await sql`SELECT * FROM empresas WHERE id = ${id}`;
  const trabajadores = await sql`
    SELECT id, rut, nombres, apellidos, tipo_contrato, cargo, activo
    FROM trabajadores WHERE empresa_id = ${id} ORDER BY apellidos ASC
  `;
  if (!empresa) return <div className="max-w-4xl mx-auto px-4 py-10">Empresa no encontrada.</div>;

  const contratoLabel: Record<string, string> = {
    indefinido: "Indefinido", plazo_fijo: "Plazo fijo",
    por_obra: "Por obra/faena", honorarios: "Honorarios",
  };

  const navLinks = [
    { href: `/empresas/${empresa.id}/remuneraciones`, label: "Remuneraciones" },
    { href: `/empresas/${empresa.id}/previred`,        label: "Previred + LRE" },
    { href: `/empresas/${empresa.id}/f29`,             label: "F29" },
    { href: `/empresas/${empresa.id}/ddjj`,            label: "DJ 1887/1879" },
    { href: `/empresas/${empresa.id}/vacaciones`,      label: "Vacaciones" },
    { href: `/empresas/${empresa.id}/prestamos`,       label: "Préstamos" },
    { href: `/empresas/${empresa.id}/cargas`,          label: "Cargas Fam." },
    { href: `/empresas/${empresa.id}/finiquitos`,      label: "Finiquitos" },
    { href: `/empresas/${empresa.id}/contabilidad`,    label: "Contabilidad" },
    { href: `/empresas/${empresa.id}/activos`,         label: "Activos Fijos" },
    { href: `/empresas/${empresa.id}/conciliacion`,    label: "Conciliación" },
    { href: `/empresas/${empresa.id}/honorarios`,      label: "Honorarios" },
    { href: `/empresas/${empresa.id}/dte`,             label: "DTE" },
    { href: `/empresas/${empresa.id}/centros-costo`,   label: "Centros Costo" },
    { href: `/empresas/${empresa.id}/reportes`,        label: "Reportes" },
    { href: `/empresas/${empresa.id}/recomendaciones`, label: "Recomendaciones" },
  ];

  const activos   = trabajadores.filter((t: any) => t.activo);
  const inactivos = trabajadores.filter((t: any) => !t.activo);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/empresas" className="text-sm text-teal-700 hover:underline">← Empresas</Link>
      <div className="mt-3 mb-2 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{empresa.razon_social}</h1>
            {!empresa.activa && (
              <span className="text-xs bg-slate-200 text-slate-500 rounded-full px-2 py-1">Inactiva</span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {empresa.rut}
            {empresa.regimen_tributario ? ` · ${empresa.regimen_tributario.replace(/_/g," ")}` : ""}
            {empresa.regimen_iva ? ` · IVA: ${empresa.regimen_iva.replace(/_/g," ")}` : ""}
            {empresa.mutualidad ? ` · ${empresa.mutualidad}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EditarEmpresaForm empresa={empresa} />
          <AccionesEmpresa empresa={empresa} />
        </div>
      </div>

      {/* Notas internas */}
      {empresa.notas_internas && (
        <div className="mt-2 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          📝 {empresa.notas_internas}
        </div>
      )}

      <nav className="flex gap-2 my-6 text-sm flex-wrap">
        <span className="px-3 py-1.5 rounded-full bg-teal-700 text-white font-medium text-xs">Trabajadores</span>
        {navLinks.map((l) => (
          <Link key={l.href} href={l.href}
            className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition text-xs font-medium">
            {l.label}
          </Link>
        ))}
      </nav>

      <NuevoTrabajadorForm empresaId={empresa.id} />

      {/* Trabajadores activos */}
      <div className="mt-6 divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
        {activos.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aún no agregas trabajadores activos.</p>
        )}
        {activos.map((t: any) => (
          <Link key={t.id} href={`/empresas/${empresa.id}/trabajadores/${t.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
            <div>
              <p className="font-medium text-slate-900">{t.nombres} {t.apellidos}</p>
              <p className="text-sm text-slate-500">{t.rut}{t.cargo ? ` · ${t.cargo}` : ""}</p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
              {contratoLabel[t.tipo_contrato] || t.tipo_contrato}
            </span>
          </Link>
        ))}
      </div>

      {/* Trabajadores inactivos (colapsado) */}
      {inactivos.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-600 select-none">
            {inactivos.length} trabajador{inactivos.length > 1 ? "es" : ""} inactivo{inactivos.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden opacity-60">
            {inactivos.map((t: any) => (
              <Link key={t.id} href={`/empresas/${empresa.id}/trabajadores/${t.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
                <div>
                  <p className="font-medium text-slate-900">{t.nombres} {t.apellidos}</p>
                  <p className="text-sm text-slate-500">{t.rut}{t.cargo ? ` · ${t.cargo}` : ""}</p>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1">Inactivo</span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
