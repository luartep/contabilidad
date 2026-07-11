"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ImportadorRCV from "./ImportadorRCV";

const mesActual = new Date().toISOString().slice(0, 7);

function clp(v: number | string) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
    Math.round(Number(v) || 0)
  );
}

const TIPOS_DOC_VENTA = [
  { value: "factura",             label: "Factura afecta (con IVA)" },
  { value: "boleta",              label: "Boleta afecta" },
  { value: "factura_exenta",      label: "Factura exenta (sin IVA)" },
  { value: "boleta_exenta",       label: "Boleta exenta" },
  { value: "liquidacion_factura", label: "Liquidación-Factura" },
  { value: "nota_debito",         label: "Nota de débito" },
  { value: "nota_credito",        label: "Nota de crédito (resta débito)" },
];

const TIPOS_DOC_COMPRA = [
  { value: "factura",             label: "Factura afecta (con IVA)" },
  { value: "factura_exenta",      label: "Factura exenta (sin IVA)" },
  { value: "liquidacion_factura", label: "Liquidación-Factura" },
  { value: "nota_debito",         label: "Nota de débito" },
  { value: "nota_credito",        label: "Nota de crédito (resta crédito)" },
];

const docDefault = {
  tipo: "venta", tipo_documento: "factura", folio: "",
  rut_contraparte: "", razon_social_contraparte: "",
  fecha: new Date().toISOString().slice(0, 10),
  monto_neto: "", monto_iva: "", monto_exento: "",
  retencion_honorario: "", es_nota_credito: false, observaciones: "",
};

export default function F29Page() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [periodo, setPeriodo] = useState(mesActual);
  const [periodoF29, setPeriodoF29] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [impuestoUnico, setImpuestoUnico] = useState(0);
  const [resultado, setResultado] = useState<any>(null);
  const [remAnt, setRemAnt] = useState("0");
  const [cargando, setCargando] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(docDefault);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"ventas" | "compras" | "honorarios">("ventas");
  const [mostrarImportador, setMostrarImportador] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/f29?empresa_id=${id}&periodo=${periodo}`);
      const data = await res.json();
      setEmpresa(data.empresa);
      setPeriodoF29(data.periodo_f29);
      setDocumentos(data.documentos || []);
      setImpuestoUnico(data.impuesto_unico_trab || 0);
      if (data.periodo_f29) {
        setResultado({
          debito_fiscal: data.periodo_f29.debito_fiscal,
          credito_fiscal: data.periodo_f29.credito_fiscal,
          iva_a_pagar: data.periodo_f29.iva_a_pagar,
          remanente_credito: data.periodo_f29.remanente_credito,
          ppm_base: data.periodo_f29.ppm_base,
          ppm_monto: data.periodo_f29.ppm_monto,
          retenciones_honorarios: data.periodo_f29.retenciones_honorarios,
          impuesto_unico_trab: data.periodo_f29.impuesto_unico_trab,
          total_a_pagar: data.periodo_f29.total_a_pagar,
          total_ventas_netas: 0,
          total_compras_netas: 0,
        });
      } else {
        setResultado(null);
      }
    } catch { setMsg("Error al cargar datos."); }
    finally { setCargando(false); }
  }, [id, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCalcular() {
    setCalculando(true); setMsg("");
    try {
      const res = await fetch("/api/f29", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: id, periodo, remanente_anterior: Number(remAnt) }),
      });
      const data = await res.json();
      if (res.ok) { setResultado(data.resultado); cargar(); }
      else setMsg(`Error: ${data.error}`);
    } catch { setMsg("Error al calcular."); }
    finally { setCalculando(false); }
  }

  async function handleAgregarDoc(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const neto = Number(form.monto_neto) || 0;
    const esExenta = form.tipo_documento.includes("exenta");
    const iva = form.monto_iva !== "" ? Number(form.monto_iva) : (esExenta ? 0 : Math.round(neto * 0.19));
    const exento = Number(form.monto_exento) || 0;

    await fetch("/api/f29/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresa_id: id, periodo, ...form,
        monto_neto: neto, monto_iva: iva, monto_exento: exento,
        monto_total: neto + iva + exento,
        es_nota_credito: form.tipo_documento === "nota_credito",
        retencion_honorario: Number(form.retencion_honorario) || 0,
      }),
    });
    setGuardando(false);
    setForm(docDefault); setShowForm(false);
    setMsg("✓ Documento agregado.");
    cargar();
  }

  async function handleEliminar(docId: number) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/f29/documentos?id=${docId}`, { method: "DELETE" });
    cargar();
  }

  async function handleMarcarPresentado() {
    await fetch("/api/f29", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, periodo, estado: "presentado" }),
    });
    setMsg("✓ Período marcado como presentado.");
    cargar();
  }

  const ventas    = documentos.filter((d) => d.tipo === "venta");
  const compras   = documentos.filter((d) => d.tipo === "compra");
  const honorarios = documentos.filter((d) => d.tipo === "honorario_recibido");
  const tabDocs   = tab === "ventas" ? ventas : tab === "compras" ? compras : honorarios;

  const regimenLabel: Record<string, string> = {
    general: "Régimen General IVA",
    pro_pyme_trans: "Pro Pyme Transparente",
    primera_categ: "Primera Categoría + PPM",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← {empresa?.razon_social || "Empresa"}
      </Link>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2">Formulario 29 (F29)</h1>
          {empresa && (
            <p className="text-sm text-slate-500">
              {regimenLabel[empresa.regimen_iva] || empresa.regimen_iva}
              {empresa.tasa_ppm ? ` · PPM ${empresa.tasa_ppm}%` : ""}
            </p>
          )}
        </div>
        {periodoF29?.estado === "presentado" && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-3 py-1.5 mt-3">✓ Presentado</span>
        )}
      </div>

      {/* Selector período + remanente */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Período</label>
            <input type="month"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={periodo}
              onChange={(e) => { setPeriodo(e.target.value); setResultado(null); setMsg(""); }} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Remanente crédito mes anterior ($)</label>
            <input type="number" min="0"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-48"
              value={remAnt} onChange={(e) => setRemAnt(e.target.value)} placeholder="0" />
          </div>
        </div>
        {impuestoUnico > 0 && (
          <p className="mt-3 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
            💡 Impuesto único trabajadores del período: <strong>{clp(impuestoUnico)}</strong> — incluido automáticamente desde Remuneraciones
          </p>
        )}
      </div>

      {/* Importador RCV */}
      <div>
        <button
          onClick={() => setMostrarImportador(!mostrarImportador)}
          className="text-sm text-blue-700 font-medium mb-2 flex items-center gap-1"
        >
          {mostrarImportador ? "▼" : "▶"} Importar desde RCV del SII
        </button>
        {mostrarImportador && (
          <ImportadorRCV
            empresaId={id}
            periodo={periodo}
            onImportado={() => { cargar(); setResultado(null); setMsg("✓ RCV importado. Revisa los documentos y calcula el F29."); }}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-200">
          {(["ventas","compras","honorarios"] as const).map((t) => (
            <button key={t}
              onClick={() => { setTab(t); setShowForm(false); setForm({ ...docDefault, tipo: t === "ventas" ? "venta" : t === "compras" ? "compra" : "honorario_recibido" }); }}
              className={`flex-1 py-3 text-sm font-medium transition ${tab === t ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {t === "ventas" ? `Ventas (${ventas.length})` : t === "compras" ? `Compras (${compras.length})` : `Honorarios (${honorarios.length})`}
            </button>
          ))}
        </div>

        <div className="p-5">
          {!showForm ? (
            <button onClick={() => { setShowForm(true); setForm({ ...docDefault, tipo: tab === "ventas" ? "venta" : tab === "compras" ? "compra" : "honorario_recibido" }); }}
              className="rounded-lg border border-dashed border-slate-300 text-slate-500 text-sm px-4 py-2 hover:border-teal-400 hover:text-teal-700 transition w-full mb-4">
              + Agregar {tab === "ventas" ? "venta" : tab === "compras" ? "compra" : "honorario"} manualmente
            </button>
          ) : (
            <form onSubmit={handleAgregarDoc} className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3 bg-slate-50">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Tipo de documento</label>
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.tipo_documento}
                    onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
                    {(tab === "ventas" ? TIPOS_DOC_VENTA : tab === "compras" ? TIPOS_DOC_COMPRA : [{ value: "boleta_honorarios", label: "Boleta de honorarios" }]).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Fecha</label>
                  <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">RUT contraparte</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.rut_contraparte} onChange={(e) => setForm({ ...form, rut_contraparte: e.target.value })}
                    placeholder="76.123.456-7" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Razón social</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.razon_social_contraparte}
                    onChange={(e) => setForm({ ...form, razon_social_contraparte: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Folio</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.folio} onChange={(e) => setForm({ ...form, folio: e.target.value })} />
                </div>
                {tab !== "honorarios" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Monto neto ($)</label>
                      <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={form.monto_neto} onChange={(e) => setForm({ ...form, monto_neto: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">IVA ($) — auto 19% si vacío</label>
                      <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={form.monto_iva} onChange={(e) => setForm({ ...form, monto_iva: e.target.value })} placeholder="Auto" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Monto exento ($)</label>
                      <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={form.monto_exento} onChange={(e) => setForm({ ...form, monto_exento: e.target.value })} placeholder="0" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Monto bruto boleta ($)</label>
                      <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={form.monto_neto} onChange={(e) => setForm({ ...form, monto_neto: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Retención (13.75%)</label>
                      <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={form.retencion_honorario}
                        onChange={(e) => setForm({ ...form, retencion_honorario: e.target.value })}
                        placeholder={String(Math.round(Number(form.monto_neto || 0) * 0.1375))} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={guardando}
                  className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition disabled:opacity-60">
                  {guardando ? "Guardando..." : "Agregar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Tabla documentos */}
          {tabDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left pb-2 font-medium">Tipo</th>
                    <th className="text-left pb-2 font-medium">Contraparte</th>
                    <th className="text-left pb-2 font-medium">Fecha</th>
                    <th className="text-right pb-2 font-medium">Neto</th>
                    <th className="text-right pb-2 font-medium">IVA / Ret.</th>
                    <th className="text-right pb-2 font-medium">Total</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tabDocs.map((d: any) => (
                    <tr key={d.id} className={d.es_nota_credito ? "text-red-600 bg-red-50" : ""}>
                      <td className="py-2 pr-3">
                        <span className="text-xs bg-slate-100 rounded px-2 py-0.5">
                          {d.tipo_documento.replace(/_/g, " ")}
                        </span>
                        {d.es_nota_credito && <span className="text-xs text-red-500 ml-1">NC</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-600 max-w-[180px] truncate">
                        {d.razon_social_contraparte || d.rut_contraparte || "—"}
                        {d.folio && <span className="text-slate-400 ml-1">#{d.folio}</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(d.fecha).toLocaleDateString("es-CL")}
                      </td>
                      <td className="py-2 pr-3 text-right">{clp(d.monto_neto)}</td>
                      <td className="py-2 pr-3 text-right">{clp(d.monto_iva || d.retencion_honorario)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{clp(d.monto_total)}</td>
                      <td className="py-2">
                        <button onClick={() => handleEliminar(d.id)}
                          className="text-xs text-red-400 hover:text-red-700">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200">
                  <tr className="font-semibold text-slate-700 bg-slate-50">
                    <td colSpan={3} className="pt-2 pb-1 pl-2 text-xs text-slate-500">Totales</td>
                    <td className="pt-2 pb-1 text-right">{clp(tabDocs.reduce((s: number, d: any) => s + Number(d.monto_neto), 0))}</td>
                    <td className="pt-2 pb-1 text-right">{clp(tabDocs.reduce((s: number, d: any) => s + Number(d.monto_iva || d.retencion_honorario), 0))}</td>
                    <td className="pt-2 pb-1 text-right">{clp(tabDocs.reduce((s: number, d: any) => s + Number(d.monto_total), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              {cargando ? "Cargando..." : `Sin documentos. Importa el RCV del SII o agrega manualmente.`}
            </div>
          )}
        </div>
      </div>

      {/* Calcular y resumen */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Resumen F29</h2>
          <button onClick={handleCalcular} disabled={calculando}
            className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition disabled:opacity-60">
            {calculando ? "Calculando..." : "▶ Calcular F29"}
          </button>
        </div>

        {resultado ? (
          <>
            <div className="grid grid-cols-2 gap-x-8 text-sm">
              <div className="space-y-1 border-r border-slate-100 pr-8">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Débito Fiscal</p>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Ventas netas</span>
                  <span>{clp(resultado.total_ventas_netas || 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 font-semibold">
                  <span>Débito fiscal (IVA ventas)</span>
                  <span>{clp(resultado.debito_fiscal)}</span>
                </div>
                {resultado.ppm_monto > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">PPM ({empresa?.tasa_ppm}%)</span>
                    <span>{clp(resultado.ppm_monto)}</span>
                  </div>
                )}
                {resultado.retenciones_honorarios > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Retenciones honorarios</span>
                    <span>{clp(resultado.retenciones_honorarios)}</span>
                  </div>
                )}
                {resultado.impuesto_unico_trab > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Impuesto único trabajadores</span>
                    <span>{clp(resultado.impuesto_unico_trab)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 pl-8">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Crédito Fiscal</p>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Compras netas</span>
                  <span>{clp(resultado.total_compras_netas || 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 font-semibold">
                  <span>Crédito fiscal (IVA compras)</span>
                  <span>{clp(resultado.credito_fiscal)}</span>
                </div>
                {Number(remAnt) > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Remanente mes anterior</span>
                    <span>{clp(remAnt)}</span>
                  </div>
                )}
                {resultado.remanente_credito > 0 && (
                  <div className="flex justify-between py-1 text-blue-700 font-semibold">
                    <span>Remanente próximo mes</span>
                    <span>{clp(resultado.remanente_credito)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={`mt-5 rounded-xl p-4 flex items-center justify-between
              ${resultado.total_a_pagar > 0 ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-700"}`}>
              <div>
                <p className={`text-xs ${resultado.total_a_pagar > 0 ? "text-teal-100" : "text-slate-400"}`}>
                  Total a pagar en F29 — {periodo}
                </p>
                {resultado.total_a_pagar === 0 && resultado.remanente_credito > 0 && (
                  <p className="text-xs text-blue-600 mt-0.5">Crédito mayor al débito — sin pago este mes</p>
                )}
              </div>
              <p className={`text-2xl font-bold ${resultado.total_a_pagar > 0 ? "text-white" : "text-slate-700"}`}>
                {clp(resultado.total_a_pagar)}
              </p>
            </div>

            <div className="flex gap-3 mt-4 flex-wrap">
              <a href="https://homer.sii.cl" target="_blank" rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition">
                🔗 Presentar en SII (HOMER)
              </a>
              {periodoF29?.estado !== "presentado" && (
                <button onClick={handleMarcarPresentado}
                  className="rounded-lg border border-green-300 text-green-700 text-sm font-medium px-4 py-2.5 hover:bg-green-50 transition">
                  ✓ Marcar como presentado
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">
            Importa el RCV o agrega documentos manualmente, luego presiona "Calcular F29".
          </p>
        )}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm border ${msg.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-teal-50 border-teal-200 text-teal-700"}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
