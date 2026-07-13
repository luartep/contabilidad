"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CAUSALES_TERMINO } from "@/lib/calculoFiniquito";

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function FiniquitosPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [finiquitos, setFiniquitos] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [form, setForm] = useState({
    trabajador_id: "", fecha_termino: new Date().toISOString().slice(0, 10),
    causal: "art_159_4", promedio_ultimos_3_meses: "",
    vacaciones_pendientes_dias: "", dias_trabajados_mes_termino: "",
    dias_mes_termino: "30", otros_haberes: "0",
    descuentos: "0", tiene_aviso_previo: false, observaciones: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const [eRes, fRes, tRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/finiquitos?empresa_id=${id}`),
      fetch(`/api/trabajadores?empresa_id=${id}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setFiniquitos((await fRes.json()).finiquitos || []);
    setTrabajadores((await tRes.json()).trabajadores?.filter((t: any) => t.tipo_contrato !== "honorarios") || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCalcular(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true); setMsg("");
    const res = await fetch("/api/finiquitos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, ...form }),
    });
    const data = await res.json();
    setGuardando(false);
    if (res.ok) {
      setResultado(data.resultado);
      setMsg("✓ Finiquito calculado.");
      cargar();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  function abrirHTML(finiqId: number) {
    window.open(`/api/finiquitos/html?id=${finiqId}`, "_blank");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-2xl font-semibold text-slate-900">Finiquitos</h1>
        <button onClick={() => { setShowForm(!showForm); setResultado(null); }}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800">
          + Nuevo finiquito
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCalcular} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Calcular finiquito</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Trabajador</label>
              <select required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {trabajadores.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.nombres} {t.apellidos} — {t.rut}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha de término</label>
              <input type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.fecha_termino} onChange={(e) => setForm({ ...form, fecha_termino: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-600">Causal de término</label>
              <select required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.causal} onChange={(e) => setForm({ ...form, causal: e.target.value })}>
                {Object.entries(CAUSALES_TERMINO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Promedio últimas 3 remuneraciones ($)</label>
              <input type="number" min="0" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.promedio_ultimos_3_meses}
                onChange={(e) => setForm({ ...form, promedio_ultimos_3_meses: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Vacaciones pendientes (días hábiles)</label>
              <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.vacaciones_pendientes_dias}
                onChange={(e) => setForm({ ...form, vacaciones_pendientes_dias: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Días trabajados en el mes de término</label>
              <input type="number" min="0" max="31" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.dias_trabajados_mes_termino}
                onChange={(e) => setForm({ ...form, dias_trabajados_mes_termino: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Días totales del mes</label>
              <input type="number" min="28" max="31" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.dias_mes_termino}
                onChange={(e) => setForm({ ...form, dias_mes_termino: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Otros haberes ($)</label>
              <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.otros_haberes} onChange={(e) => setForm({ ...form, otros_haberes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Descuentos ($)</label>
              <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.descuentos} onChange={(e) => setForm({ ...form, descuentos: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.tiene_aviso_previo}
              onChange={(e) => setForm({ ...form, tiene_aviso_previo: e.target.checked })}
              className="rounded border-slate-300 text-teal-600" />
            Pagar sustitutiva de aviso previo (30 días)
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 disabled:opacity-60">
              {guardando ? "Calculando..." : "Calcular finiquito"}
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Resultado del cálculo</h3>
              <p className="text-xs text-slate-500">
                Antigüedad: {resultado.anios_servicio} año(s), {resultado.meses_servicio} mes(es), {resultado.dias_servicio} día(s)
              </p>
              <div className="space-y-1">
                {resultado.desglose.map((d: any, i: number) => (
                  <div key={i} className={`flex justify-between text-sm py-1 border-b border-slate-50 ${d.monto < 0 ? "text-red-600" : ""}`}>
                    <span className="text-slate-600">{d.concepto}</span>
                    <span className="font-medium">{clp(Math.abs(d.monto))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-teal-700 text-white rounded-xl px-4 py-3">
                <span className="font-semibold">Total Finiquito</span>
                <span className="text-xl font-bold">{clp(resultado.total_finiquito)}</span>
              </div>
            </div>
          )}
          {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-teal-700"}`}>{msg}</p>}
        </form>
      )}

      {/* Historial */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Historial de finiquitos</h2>
        {finiquitos.map((f: any) => (
          <div key={f.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">{f.nombres} {f.apellidos}</p>
              <p className="text-xs text-slate-400">
                {f.rut} · Término: {new Date(f.fecha_termino).toLocaleDateString("es-CL")} · {CAUSALES_TERMINO[f.causal] || f.causal}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Total</p>
                <p className="font-bold text-teal-700">{clp(f.total_finiquito)}</p>
              </div>
              <span className={`text-xs rounded-full px-2 py-0.5 ${f.estado === "firmado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {f.estado === "firmado" ? "✓ Firmado" : "Borrador"}
              </span>
            </div>
          </div>
        ))}
        {finiquitos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Sin finiquitos registrados.</p>
        )}
      </div>
    </div>
  );
}
