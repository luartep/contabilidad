"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

const TIPOS_VOUCHER = [
  { value: "diario", label: "Comprobante Diario" },
  { value: "compra", label: "Compra" },
  { value: "venta", label: "Venta" },
  { value: "remuneracion", label: "Remuneración" },
  { value: "ajuste", label: "Ajuste / Corrección" },
  { value: "cierre", label: "Cierre" },
];

export default function ContabilidadPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [tab, setTab] = useState<"diario" | "mayor" | "balance" | "resultado" | "plan">("diario");
  const [periodo, setPeriodo] = useState(mesActual);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [cuentaMayor, setCuentaMayor] = useState("");
  const [movsMayor, setMovsMayor] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [planIniciado, setPlanIniciado] = useState(false);
  // Nuevo voucher
  const [showVoucher, setShowVoucher] = useState(false);
  const [vForm, setVForm] = useState({ glosa: "", tipo: "diario", lineas: [{ cuenta_codigo: "", cuenta_nombre: "", glosa: "", debe: "", haber: "" }] });
  const [guardandoV, setGuardandoV] = useState(false);
  const [msgV, setMsgV] = useState("");
  const [generandoAuto, setGenerandoAuto] = useState(false);

  async function handleGenerarAuto(tipo: "remuneraciones" | "f29" | "ambos") {
    setGenerandoAuto(true); setMsgV("");
    const res = await fetch("/api/vouchers-auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, periodo, tipo }),
    });
    const data = await res.json();
    setGenerandoAuto(false);
    if (res.ok) {
      setMsgV(`✓ ${data.vouchers.length} voucher(s) generado(s) automáticamente.`);
      cargarDiario();
    } else {
      setMsgV(`Error: ${data.error}`);
    }
  }

  const cargarCuentas = useCallback(async () => {
    const res = await fetch(`/api/contabilidad/plan-cuentas?empresa_id=${id}`);
    const data = await res.json();
    setCuentas(data.cuentas || []);
    setPlanIniciado((data.cuentas || []).length > 0);
  }, [id]);

  const cargarDiario = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/contabilidad/vouchers?empresa_id=${id}&periodo=${periodo}`);
    setVouchers((await res.json()).vouchers || []);
    setCargando(false);
  }, [id, periodo]);

  const cargarBalance = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/reportes?empresa_id=${id}&tipo=balance_general&periodo=${periodo}`);
    setBalance(await res.json());
    setCargando(false);
  }, [id, periodo]);

  const cargarResultado = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/reportes?empresa_id=${id}&tipo=estado_resultados&periodo=${periodo}`);
    setResultado(await res.json());
    setCargando(false);
  }, [id, periodo]);

  const cargarMayor = useCallback(async () => {
    if (!cuentaMayor) return;
    setCargando(true);
    const res = await fetch(`/api/contabilidad/vouchers?empresa_id=${id}&periodo=${periodo}&tipo=mayor&cuenta=${cuentaMayor}`);
    setMovsMayor(await res.json());
    setCargando(false);
  }, [id, periodo, cuentaMayor]);

  useEffect(() => {
    fetch(`/api/empresas/${id}`).then(r => r.json()).then(d => setEmpresa(d.empresa));
    cargarCuentas();
  }, [id, cargarCuentas]);

  useEffect(() => {
    if (tab === "diario") cargarDiario();
    if (tab === "balance") cargarBalance();
    if (tab === "resultado") cargarResultado();
    if (tab === "mayor") cargarMayor();
  }, [tab, periodo, cargarDiario, cargarBalance, cargarResultado, cargarMayor]);

  async function iniciarPlan() {
    await fetch("/api/contabilidad/plan-cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, cargar_base: true }),
    });
    cargarCuentas();
  }

  function addLinea() {
    setVForm({ ...vForm, lineas: [...vForm.lineas, { cuenta_codigo: "", cuenta_nombre: "", glosa: "", debe: "", haber: "" }] });
  }
  function removeLinea(i: number) {
    setVForm({ ...vForm, lineas: vForm.lineas.filter((_, idx) => idx !== i) });
  }
  function updateLinea(i: number, campo: string, valor: string) {
    const nuevas = [...vForm.lineas];
    nuevas[i] = { ...nuevas[i], [campo]: valor };
    // Auto-completar nombre de cuenta
    if (campo === "cuenta_codigo") {
      const cuenta = cuentas.find(c => c.codigo === valor);
      if (cuenta) nuevas[i].cuenta_nombre = cuenta.nombre;
    }
    setVForm({ ...vForm, lineas: nuevas });
  }

  const totalDebe  = vForm.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
  const totalHaber = vForm.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  const cuadrado   = Math.abs(totalDebe - totalHaber) < 1;

  async function handleGuardarVoucher(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoV(true); setMsgV("");
    const res = await fetch("/api/contabilidad/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, periodo, ...vForm }),
    });
    const data = await res.json();
    setGuardandoV(false);
    if (res.ok) {
      setMsgV(data.warning || `✓ Voucher N°${data.numero} guardado`);
      setVForm({ glosa: "", tipo: "diario", lineas: [{ cuenta_codigo: "", cuenta_nombre: "", glosa: "", debe: "", haber: "" }] });
      setShowVoucher(false);
      cargarDiario();
    } else {
      setMsgV(`Error: ${data.error}`);
    }
  }

  async function eliminarVoucher(vId: number) {
    if (!confirm("¿Eliminar este voucher?")) return;
    await fetch(`/api/contabilidad/vouchers?id=${vId}`, { method: "DELETE" });
    cargarDiario();
  }

  const tabs = [
    { key: "diario",    label: "Libro Diario" },
    { key: "mayor",     label: "Libro Mayor" },
    { key: "balance",   label: "Balance" },
    { key: "resultado", label: "Estado de Resultados" },
    { key: "plan",      label: "Plan de Cuentas" },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Contabilidad General</h1>

      {!planIniciado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-amber-800 font-medium mb-2">Esta empresa no tiene plan de cuentas.</p>
          <p className="text-sm text-amber-700 mb-4">Puedes cargar el plan estándar chileno para pymes (45 cuentas) o crear uno propio.</p>
          <button onClick={iniciarPlan}
            className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800">
            Cargar plan de cuentas estándar
          </button>
        </div>
      )}

      {/* Selector período */}
      <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <label className="text-sm font-medium text-slate-700">Período</label>
        <input type="month" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LIBRO DIARIO ────────────────────────────────────────────────────── */}
      {tab === "diario" && (
        <div className="space-y-3">
          {!showVoucher ? (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowVoucher(true)} disabled={!planIniciado}
                className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-50">
                + Nuevo voucher / comprobante
              </button>
              <button onClick={() => handleGenerarAuto("remuneraciones")} disabled={generandoAuto || !planIniciado}
                className="rounded-lg bg-slate-700 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800 disabled:opacity-50">
                {generandoAuto ? "Generando..." : "⚡ Auto: Remuneraciones"}
              </button>
              <button onClick={() => handleGenerarAuto("f29")} disabled={generandoAuto || !planIniciado}
                className="rounded-lg bg-slate-700 text-white text-sm font-medium px-3 py-2 hover:bg-slate-800 disabled:opacity-50">
                {generandoAuto ? "..." : "⚡ Auto: F29"}
              </button>
              <button onClick={() => handleGenerarAuto("ambos")} disabled={generandoAuto || !planIniciado}
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 hover:bg-slate-50 disabled:opacity-50">
                ⚡ Auto: Ambos
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuardarVoucher} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Tipo de comprobante</label>
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={vForm.tipo} onChange={(e) => setVForm({ ...vForm, tipo: e.target.value })}>
                    {TIPOS_VOUCHER.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Glosa general</label>
                  <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={vForm.glosa} onChange={(e) => setVForm({ ...vForm, glosa: e.target.value })}
                    placeholder="Descripción del comprobante" />
                </div>
              </div>

              {/* Líneas */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left pb-2 w-28">Cód. cuenta</th>
                      <th className="text-left pb-2">Nombre cuenta</th>
                      <th className="text-left pb-2">Glosa línea</th>
                      <th className="text-right pb-2 w-28">Debe ($)</th>
                      <th className="text-right pb-2 w-28">Haber ($)</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vForm.lineas.map((l, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1 pr-2">
                          <input list={`cuentas-${i}`} className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            value={l.cuenta_codigo}
                            onChange={(e) => updateLinea(i, "cuenta_codigo", e.target.value)}
                            placeholder="1.1.01" />
                          <datalist id={`cuentas-${i}`}>
                            {cuentas.filter(c => c.es_imputable).map((c: any) => (
                              <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                            ))}
                          </datalist>
                        </td>
                        <td className="py-1 pr-2">
                          <input className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            value={l.cuenta_nombre}
                            onChange={(e) => updateLinea(i, "cuenta_nombre", e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            value={l.glosa} onChange={(e) => updateLinea(i, "glosa", e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" min="0" className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-right"
                            value={l.debe} onChange={(e) => updateLinea(i, "debe", e.target.value)} />
                        </td>
                        <td className="py-1 pr-2">
                          <input type="number" min="0" className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-right"
                            value={l.haber} onChange={(e) => updateLinea(i, "haber", e.target.value)} />
                        </td>
                        <td className="py-1">
                          {vForm.lineas.length > 1 && (
                            <button type="button" onClick={() => removeLinea(i)} className="text-red-400 hover:text-red-700">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`font-bold text-sm border-t-2 ${cuadrado ? "border-teal-300 text-teal-700" : "border-red-300 text-red-700"}`}>
                      <td colSpan={3} className="pt-2">
                        {cuadrado ? "✓ Cuadrado" : "⚠ No cuadrado"}
                      </td>
                      <td className="pt-2 text-right">{clp(totalDebe)}</td>
                      <td className="pt-2 text-right">{clp(totalHaber)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={addLinea}
                  className="rounded-lg border border-slate-300 text-slate-600 text-xs px-3 py-1.5 hover:bg-slate-50">
                  + Línea
                </button>
                <button type="submit" disabled={guardandoV}
                  className="rounded-lg bg-teal-700 text-white text-xs font-medium px-4 py-1.5 hover:bg-teal-800 disabled:opacity-60">
                  {guardandoV ? "Guardando..." : "Guardar voucher"}
                </button>
                <button type="button" onClick={() => setShowVoucher(false)}
                  className="rounded-lg border border-slate-300 text-slate-600 text-xs px-3 py-1.5 hover:bg-slate-50">
                  Cancelar
                </button>
                {msgV && <span className={`text-xs self-center ${msgV.startsWith("Error") ? "text-red-600" : "text-teal-700"}`}>{msgV}</span>}
              </div>
            </form>
          )}

          {cargando ? <p className="text-slate-400 text-sm">Cargando...</p> : (
            <div className="space-y-2">
              {vouchers.map((v: any) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">N°{v.numero}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 rounded px-2 py-0.5">{v.tipo}</span>
                      <span className="text-sm font-medium text-slate-800">{v.glosa}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{new Date(v.fecha).toLocaleDateString("es-CL")}</span>
                      {!v.cuadrado && <span className="text-xs text-red-600 bg-red-50 rounded px-2 py-0.5">⚠ No cuadrado</span>}
                      <button onClick={() => eliminarVoucher(v.id)} className="text-xs text-red-400 hover:text-red-700">✕</button>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {(v.lineas || []).map((l: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="px-4 py-1.5 w-24 text-slate-400 font-mono">{l.cuenta_codigo}</td>
                          <td className="px-2 py-1.5 text-slate-700">{l.cuenta_nombre}</td>
                          <td className="px-2 py-1.5 text-slate-400">{l.glosa}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{Number(l.debe) > 0 ? clp(l.debe) : ""}</td>
                          <td className="px-4 py-1.5 text-right font-medium">{Number(l.haber) > 0 ? clp(l.haber) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-bold text-xs">
                        <td colSpan={3} className="px-4 py-1.5">Total</td>
                        <td className="px-2 py-1.5 text-right">{clp(v.total_debe)}</td>
                        <td className="px-4 py-1.5 text-right">{clp(v.total_haber)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
              {vouchers.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Sin vouchers para este período.</p>}
            </div>
          )}
        </div>
      )}

      {/* ── LIBRO MAYOR ─────────────────────────────────────────────────────── */}
      {tab === "mayor" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Cuenta</label>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-64"
                value={cuentaMayor} onChange={(e) => setCuentaMayor(e.target.value)}>
                <option value="">Seleccionar cuenta...</option>
                {cuentas.filter(c => c.es_imputable).map((c: any) => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>
            </div>
            <button onClick={cargarMayor} disabled={!cuentaMayor}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-50">
              Ver mayor
            </button>
          </div>

          {movsMayor && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between">
                <span className="font-semibold text-slate-700">{cuentaMayor} — {cuentas.find(c => c.codigo === cuentaMayor)?.nombre}</span>
                <div className="flex gap-4 text-sm">
                  <span>Debe: <strong>{clp(movsMayor.saldo_debe)}</strong></span>
                  <span>Haber: <strong>{clp(movsMayor.saldo_haber)}</strong></span>
                  <span className={movsMayor.saldo >= 0 ? "text-teal-700 font-bold" : "text-red-700 font-bold"}>
                    Saldo: {clp(Math.abs(movsMayor.saldo))} {movsMayor.saldo >= 0 ? "D" : "H"}
                  </span>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left px-4 py-2">Fecha</th>
                    <th className="text-left px-2 py-2">N° Voucher</th>
                    <th className="text-left px-2 py-2">Glosa</th>
                    <th className="text-right px-2 py-2">Debe</th>
                    <th className="text-right px-4 py-2">Haber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movsMayor.movimientos.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-1.5">{new Date(m.fecha).toLocaleDateString("es-CL")}</td>
                      <td className="px-2 py-1.5 text-slate-400">N°{m.numero}</td>
                      <td className="px-2 py-1.5 text-slate-600">{m.glosa || m.voucher_glosa}</td>
                      <td className="px-2 py-1.5 text-right">{Number(m.debe) > 0 ? clp(m.debe) : ""}</td>
                      <td className="px-4 py-1.5 text-right">{Number(m.haber) > 0 ? clp(m.haber) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BALANCE ─────────────────────────────────────────────────────────── */}
      {tab === "balance" && balance && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 text-white text-sm font-semibold">ACTIVO</div>
            <div className="divide-y divide-slate-50">
              {balance.activos?.map((a: any) => (
                <div key={a.codigo} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-slate-600">{a.codigo} — {a.nombre}</span>
                  <span className="font-medium">{clp(Math.abs(a.saldo))}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between px-4 py-3 bg-slate-100 font-bold text-sm">
              <span>Total Activo</span><span>{clp(balance.totalActivos)}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-800 text-white text-sm font-semibold">PASIVO</div>
              <div className="divide-y divide-slate-50">
                {balance.pasivos?.map((p: any) => (
                  <div key={p.codigo} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-slate-600">{p.codigo} — {p.nombre}</span>
                    <span className="font-medium">{clp(Math.abs(p.saldo))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-4 py-3 bg-slate-100 font-bold text-sm">
                <span>Total Pasivo</span><span>{clp(balance.totalPasivos)}</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-teal-700 text-white text-sm font-semibold">PATRIMONIO</div>
              <div className="divide-y divide-slate-50">
                {balance.patrimonio?.map((p: any) => (
                  <div key={p.codigo} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-slate-600">{p.codigo} — {p.nombre}</span>
                    <span className="font-medium">{clp(Math.abs(p.saldo))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-4 py-3 bg-teal-50 font-bold text-sm text-teal-800">
                <span>Total Patrimonio</span><span>{clp(balance.totalPatrimonio)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ESTADO DE RESULTADOS ────────────────────────────────────────────── */}
      {tab === "resultado" && resultado && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-800 text-white font-semibold">Estado de Resultados — {periodo}</div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Ingresos</p>
              {resultado.ingresos?.map((c: any) => (
                <div key={c.codigo} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                  <span className="text-slate-600">{c.codigo} — {c.nombre}</span>
                  <span className="font-medium text-teal-700">{clp(Number(c.haber) - Number(c.debe))}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold text-sm bg-teal-50 px-2 rounded mt-1">
                <span>Total Ingresos</span><span className="text-teal-700">{clp(resultado.totalIngresos)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Gastos</p>
              {resultado.egresos?.map((c: any) => (
                <div key={c.codigo} className="flex justify-between py-1.5 border-b border-slate-50 text-sm">
                  <span className="text-slate-600">{c.codigo} — {c.nombre}</span>
                  <span className="font-medium text-red-600">{clp(Number(c.debe) - Number(c.haber))}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold text-sm bg-red-50 px-2 rounded mt-1">
                <span>Total Gastos</span><span className="text-red-700">{clp(resultado.totalEgresos)}</span>
              </div>
            </div>
            <div className={`flex justify-between px-4 py-4 rounded-xl font-bold text-lg ${resultado.resultado >= 0 ? "bg-teal-700 text-white" : "bg-red-700 text-white"}`}>
              <span>{resultado.resultado >= 0 ? "Utilidad del Período" : "Pérdida del Período"}</span>
              <span>{clp(Math.abs(resultado.resultado))}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAN DE CUENTAS ─────────────────────────────────────────────────── */}
      {tab === "plan" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">{cuentas.length} cuentas</span>
          </div>
          <div className="divide-y divide-slate-50">
            {cuentas.map((c: any) => (
              <div key={c.codigo} className={`flex items-center justify-between px-4 py-2 text-sm ${!c.es_imputable ? "bg-slate-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs w-20 ${!c.es_imputable ? "font-bold text-slate-600" : "text-slate-400"}`}>{c.codigo}</span>
                  <span className={!c.es_imputable ? "font-semibold text-slate-700" : "text-slate-600"}>{c.nombre}</span>
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 ${
                  c.tipo === "activo" ? "bg-blue-50 text-blue-700" :
                  c.tipo === "pasivo" ? "bg-red-50 text-red-700" :
                  c.tipo === "patrimonio" ? "bg-purple-50 text-purple-700" :
                  c.tipo === "ingreso" ? "bg-teal-50 text-teal-700" :
                  "bg-orange-50 text-orange-700"
                }`}>{c.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
