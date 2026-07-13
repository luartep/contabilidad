"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const TIPOS_CARGA = [
  { value: "hijo", label: "Hijo/a" },
  { value: "conyuge", label: "Cónyuge / Conviviente civil" },
  { value: "madre_hijo", label: "Madre de hijo de filiación no matrimonial" },
  { value: "otro", label: "Otro familiar a cargo" },
];

export default function CargasPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [resumen, setResumen] = useState<any[]>([]);
  const [selTrab, setSelTrab] = useState<number | null>(null);
  const [cargas, setCargas] = useState<any[]>([]);
  const [form, setForm] = useState({ tipo: "hijo", nombre: "", rut: "", fecha_nacimiento: "" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const [eRes, rRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/cargas?empresa_id=${id}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setResumen((await rRes.json()).resumen || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function abrirTrab(trabId: number) {
    setSelTrab(trabId);
    const res = await fetch(`/api/cargas?trabajador_id=${trabId}`);
    setCargas((await res.json()).cargas || []);
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/cargas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trabajador_id: selTrab, ...form }),
    });
    setGuardando(false);
    setForm({ tipo: "hijo", nombre: "", rut: "", fecha_nacimiento: "" });
    setMsg("✓ Carga agregada");
    if (selTrab) abrirTrab(selTrab);
    cargar();
  }

  async function handleEliminar(cargaId: number) {
    await fetch(`/api/cargas?id=${cargaId}`, { method: "DELETE" });
    if (selTrab) abrirTrab(selTrab);
    cargar();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Cargas Familiares</h1>
      <p className="text-sm text-slate-500">
        Registro de cargas para asignación familiar. La asignación se calcula según el tramo de renta del trabajador
        y los parámetros del período.
      </p>

      <div className="space-y-2">
        {resumen.map((t: any) => (
          <div key={t.id}
            className={`bg-white border rounded-xl overflow-hidden transition ${selTrab === t.id ? "border-teal-400" : "border-slate-200"}`}>
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50"
              onClick={() => selTrab === t.id ? setSelTrab(null) : abrirTrab(t.id)}>
              <div>
                <p className="font-medium text-slate-900">{t.nombres} {t.apellidos}</p>
                <p className="text-xs text-slate-400">{t.rut}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  {Number(t.total_cargas) === 0
                    ? "Sin cargas"
                    : `${t.total_cargas} carga(s)`}
                </span>
                {Number(t.total_cargas) > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {(t.cargas || []).map((c: any, i: number) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                        {TIPOS_CARGA.find(x => x.value === c.tipo)?.label || c.tipo}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-slate-400 text-sm">{selTrab === t.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {selTrab === t.id && (
              <div className="px-5 pb-5 border-t border-slate-100">
                {/* Cargas existentes */}
                {cargas.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {cargas.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
                        <div>
                          <span className="font-medium text-slate-800">{c.nombre}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            {TIPOS_CARGA.find(x => x.value === c.tipo)?.label}
                            {c.rut && ` · ${c.rut}`}
                            {c.fecha_nacimiento && ` · Nac: ${new Date(c.fecha_nacimiento).toLocaleDateString("es-CL")}`}
                          </span>
                        </div>
                        <button onClick={() => handleEliminar(c.id)}
                          className="text-xs text-red-400 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario nueva carga */}
                <form onSubmit={handleAgregar} className="mt-4 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Tipo de carga</label>
                    <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                      {TIPOS_CARGA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Nombre completo</label>
                    <input required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">RUT (opcional)</label>
                    <input className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} placeholder="12.345.678-9" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Fecha de nacimiento</label>
                    <input type="date" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button type="submit" disabled={guardando}
                      className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-teal-800 disabled:opacity-60">
                      {guardando ? "Guardando..." : "+ Agregar carga"}
                    </button>
                    {msg && <span className="text-xs text-teal-700 self-center">{msg}</span>}
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
        {resumen.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">No hay trabajadores activos.</p>
        )}
      </div>
    </div>
  );
}
