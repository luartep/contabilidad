"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function VacacionesPage() {
  const { id } = useParams<{ id: string }>();
  const [resumen, setResumen] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [selTrab, setSelTrab] = useState<any>(null);
  const [registros, setRegistros] = useState<any[]>([]);
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", dias_habiles: "", tipo: "tomada", observaciones: "" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const [eRes, rRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/vacaciones?empresa_id=${id}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setResumen((await rRes.json()).resumen || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function abrirTrabajador(t: any) {
    setSelTrab(t);
    const res = await fetch(`/api/vacaciones?trabajador_id=${t.id}`);
    const data = await res.json();
    setRegistros(data.registros || []);
  }

  function calcularDiasGanados(t: any) {
    if (!t.fecha_ingreso) return 0;
    const ingreso = new Date(t.fecha_ingreso);
    const hoy = new Date();
    const anios = (hoy.getTime() - ingreso.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return Math.floor(anios * (t.dias_vacaciones_base || 15));
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/vacaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trabajador_id: selTrab.id, ...form }),
    });
    setGuardando(false);
    setForm({ fecha_inicio: "", fecha_fin: "", dias_habiles: "", tipo: "tomada", observaciones: "" });
    setMsg("✓ Vacaciones registradas");
    abrirTrabajador(selTrab);
    cargar();
  }

  async function handleEliminar(regId: number) {
    await fetch(`/api/vacaciones?id=${regId}`, { method: "DELETE" });
    abrirTrabajador(selTrab);
    cargar();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Control de Vacaciones</h1>

      <div className="grid grid-cols-1 gap-3">
        {resumen.map((t: any) => {
          const ganados  = calcularDiasGanados(t);
          const saldo    = ganados - Number(t.dias_tomados || 0);
          return (
            <div key={t.id}
              onClick={() => abrirTrabajador(t)}
              className={`bg-white border rounded-xl p-4 cursor-pointer hover:border-teal-400 transition ${selTrab?.id === t.id ? "border-teal-500 ring-1 ring-teal-400" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{t.nombres} {t.apellidos}</p>
                  <p className="text-xs text-slate-400">{t.rut}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Ganados</p>
                    <p className="font-bold text-slate-700">{ganados}d</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tomados</p>
                    <p className="font-bold text-slate-700">{t.dias_tomados || 0}d</p>
                  </div>
                  <div className={`rounded-lg px-3 py-1 ${saldo < 0 ? "bg-red-50" : "bg-teal-50"}`}>
                    <p className="text-xs text-slate-400">Saldo</p>
                    <p className={`font-bold ${saldo < 0 ? "text-red-700" : "text-teal-700"}`}>{saldo}d</p>
                  </div>
                </div>
              </div>

              {selTrab?.id === t.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <form onSubmit={handleAgregar} className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Tipo</label>
                      <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                        <option value="tomada">Vacaciones tomadas</option>
                        <option value="progresiva">Feriado progresivo</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Días hábiles</label>
                      <input type="number" min="1" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={form.dias_habiles} onChange={(e) => setForm({ ...form, dias_habiles: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Fecha inicio</label>
                      <input type="date" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Fecha fin</label>
                      <input type="date" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button type="submit" disabled={guardando}
                        className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-teal-800 disabled:opacity-60">
                        {guardando ? "Guardando..." : "+ Registrar"}
                      </button>
                    </div>
                  </form>
                  {registros.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {registros.map((r: any) => (
                        <div key={r.id} className="flex justify-between items-center py-1.5 text-xs">
                          <span className="text-slate-600">{r.tipo} · {r.dias_habiles}d hábiles</span>
                          <span className="text-slate-400">{new Date(r.fecha_inicio).toLocaleDateString("es-CL")} → {new Date(r.fecha_fin).toLocaleDateString("es-CL")}</span>
                          <button onClick={() => handleEliminar(r.id)} className="text-red-400 hover:text-red-700">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg && <p className="text-xs text-teal-700">{msg}</p>}
                </div>
              )}
            </div>
          );
        })}
        {resumen.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No hay trabajadores activos.</p>}
      </div>
    </div>
  );
}
