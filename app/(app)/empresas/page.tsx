"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NuevaEmpresaForm from "./NuevaEmpresaForm";

export default function EmpresasPage() {
  const [empresas, setEmpresas]         = useState<any[]>([]);
  const [busqueda, setBusqueda]         = useState("");
  const [mostrarInactivas, setMostrar]  = useState(false);
  const [cargando, setCargando]         = useState(true);
  const [eliminando, setEliminando]     = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/empresas${mostrarInactivas ? "?todas=1" : ""}`);
    const data = await res.json();
    setEmpresas(data.empresas || []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [mostrarInactivas]);

  async function handleEliminar(e: any) {
    const accion = confirm(
      `¿Eliminar "${e.razon_social}"?\n\nElige:\n• Cancelar → no hacer nada\n• Aceptar → se te pedirá confirmación adicional`
    );
    if (!accion) return;

    const definitivo = confirm(
      `⚠️ ELIMINACIÓN DEFINITIVA\n\n"${e.razon_social}"\n\nEsto borrará TODOS los datos de la empresa (trabajadores, liquidaciones, F29, contabilidad, etc.) de forma IRREVERSIBLE.\n\n¿Confirmas el borrado definitivo?`
    );

    setEliminando(e.id);
    await fetch(`/api/empresas/${e.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ definitivo }),
    });
    setEliminando(null);
    cargar();
  }

  async function handleReactivar(e: any) {
    await fetch(`/api/empresas/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: true }),
    });
    cargar();
  }

  const filtradas = empresas.filter((e) => {
    const q = busqueda.toLowerCase();
    return (
      e.razon_social?.toLowerCase().includes(q) ||
      e.rut?.toLowerCase().includes(q) ||
      e.nombre_fantasia?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
          <p className="text-sm text-slate-500">Tus empresas clientes</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mostrarInactivas}
            onChange={(e) => setMostrar(e.target.checked)}
            className="rounded border-slate-300 text-teal-600"
          />
          Mostrar inactivas
        </label>
      </div>

      <NuevaEmpresaForm onCreada={cargar} />

      {/* Búsqueda */}
      <div className="mt-6 mb-3">
        <input
          type="text"
          placeholder="Buscar por razón social, RUT o nombre fantasía..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {cargando && <p className="text-sm text-slate-400 py-6">Cargando...</p>}

      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
        {!cargando && filtradas.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            {busqueda ? "Sin resultados para la búsqueda." : "Aún no agregas empresas."}
          </p>
        )}
        {filtradas.map((e: any) => (
          <div key={e.id} className={`flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition ${!e.activa ? "opacity-50" : ""}`}>
            <Link href={`/empresas/${e.id}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 truncate">{e.razon_social}</p>
                {!e.activa && (
                  <span className="text-xs bg-slate-200 text-slate-500 rounded-full px-2 py-0.5 shrink-0">Inactiva</span>
                )}
                {e.notas_internas && (
                  <span title={e.notas_internas} className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 shrink-0 cursor-help">📝</span>
                )}
              </div>
              <p className="text-sm text-slate-500 truncate">
                {e.rut}{e.nombre_fantasia ? ` · ${e.nombre_fantasia}` : ""}
              </p>
            </Link>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <span className="text-xs text-slate-400 hidden sm:block">{e.regimen_tributario || "—"}</span>
              {!e.activa ? (
                <button
                  onClick={() => handleReactivar(e)}
                  className="text-xs text-teal-700 hover:underline"
                >
                  Reactivar
                </button>
              ) : (
                <button
                  onClick={() => handleEliminar(e)}
                  disabled={eliminando === e.id}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-40"
                >
                  {eliminando === e.id ? "..." : "Eliminar"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
