"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);

function clp(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v));
}

function mesLabel(periodo: string) {
  const [, m] = periodo.split("-");
  return ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(m)];
}

export default function RecomendacionesPage() {
  const { id } = useParams<{ id: string }>();
  const [periodo, setPeriodo] = useState(mesActual);
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/recomendaciones?empresa_id=${id}&periodo=${periodo}`);
      const d = await res.json();
      setData(d);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, [id, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const urgenciaColor: Record<string, string> = {
    alta: "bg-red-50 border-red-200 text-red-700",
    normal: "bg-amber-50 border-amber-200 text-amber-700",
    baja: "bg-slate-50 border-slate-200 text-slate-500",
  };

  const alertaColor: Record<string, string> = {
    danger: "bg-red-50 border-red-300 text-red-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
    info: "bg-blue-50 border-blue-300 text-blue-800",
  };

  const alertaIcono: Record<string, string> = {
    danger: "🔴", warning: "⚠️", info: "💡",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← {data?.empresa?.razon_social || "Empresa"}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Recomendaciones</h1>

      {/* Selector período */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Período a analizar</label>
          <input type="month"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)} />
        </div>
      </div>

      {cargando && <p className="text-slate-400 text-sm">Analizando...</p>}

      {data && !cargando && (
        <>
          {/* Resumen del período */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Resumen del período</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Trabajadores", value: data.resumen.trabajadores, unit: "" },
                { label: "Total haberes", value: clp(data.resumen.total_haberes), unit: "" },
                { label: "Líquido a pagar", value: clp(data.resumen.liquido_a_pagar), unit: "" },
                { label: "Carga empleador", value: clp(data.resumen.carga_empleador), unit: "" },
                { label: "Impuesto único", value: clp(data.resumen.impuesto_unico), unit: "" },
                { label: "IVA a pagar", value: clp(data.resumen.iva_a_pagar), unit: "" },
                { label: "PPM", value: clp(data.resumen.ppm_monto), unit: "" },
                { label: "Total F29", value: clp(data.resumen.total_f29), unit: "" },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Variaciones */}
            <div className="flex gap-4 mt-4 text-xs">
              {data.resumen.variacion_liquidaciones !== null && (
                <span className={`rounded-full px-2 py-1 ${
                  Math.abs(data.resumen.variacion_liquidaciones) < 5
                    ? "bg-green-50 text-green-700"
                    : data.resumen.variacion_liquidaciones > 0
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
                }`}>
                  Remuneraciones vs mes ant.: {data.resumen.variacion_liquidaciones > 0 ? "+" : ""}
                  {data.resumen.variacion_liquidaciones.toFixed(1)}%
                </span>
              )}
              {data.resumen.variacion_iva !== null && (
                <span className={`rounded-full px-2 py-1 ${
                  data.resumen.variacion_iva > 20
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700"
                }`}>
                  IVA vs mes ant.: {data.resumen.variacion_iva > 0 ? "+" : ""}
                  {data.resumen.variacion_iva.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Vencimientos */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Vencimientos del período</h2>
            <div className="space-y-2">
              {data.vencimientos.map((v: any, i: number) => (
                <div key={i} className={`flex items-start justify-between rounded-lg border px-4 py-3 ${urgenciaColor[v.urgencia]}`}>
                  <div>
                    <p className="font-semibold text-sm">{v.nombre}</p>
                    <p className="text-xs mt-0.5">{v.descripcion}</p>
                    <p className="text-xs font-medium mt-1">📅 {v.fecha}</p>
                  </div>
                  {v.monto !== null && (
                    <p className="font-bold text-sm shrink-0 ml-4">
                      {clp(v.monto)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Alertas y recomendaciones */}
          {data.alertas.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Alertas y recomendaciones</h2>
              <div className="space-y-2">
                {data.alertas.map((a: any, i: number) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 ${alertaColor[a.tipo]}`}>
                    <p className="font-semibold text-sm">
                      {alertaIcono[a.tipo]} {a.titulo}
                    </p>
                    <p className="text-xs mt-1">{a.detalle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparativa mes a mes — Remuneraciones */}
          {data.comparativa_remuneraciones?.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                Comparativa mensual — Remuneraciones {new Date(periodo).getFullYear()}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left pb-2">Mes</th>
                      <th className="text-right pb-2">Trabajadores</th>
                      <th className="text-right pb-2">Total haberes</th>
                      <th className="text-right pb-2">Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.comparativa_remuneraciones.map((r: any) => (
                      <tr key={r.periodo} className={r.periodo === periodo ? "bg-teal-50 font-semibold" : ""}>
                        <td className="py-2">{mesLabel(r.periodo)} {r.periodo.split("-")[0]}</td>
                        <td className="py-2 text-right">{r.trabajadores}</td>
                        <td className="py-2 text-right">{clp(r.haberes)}</td>
                        <td className="py-2 text-right">{clp(r.liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comparativa mes a mes — F29 */}
          {data.comparativa_f29?.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                Comparativa mensual — F29 {new Date(periodo).getFullYear()}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left pb-2">Mes</th>
                      <th className="text-right pb-2">IVA a pagar</th>
                      <th className="text-right pb-2">PPM</th>
                      <th className="text-right pb-2">Total F29</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.comparativa_f29.map((r: any) => (
                      <tr key={r.periodo} className={r.periodo === periodo ? "bg-teal-50 font-semibold" : ""}>
                        <td className="py-2">{mesLabel(r.periodo)} {r.periodo.split("-")[0]}</td>
                        <td className="py-2 text-right">{clp(r.iva_a_pagar)}</td>
                        <td className="py-2 text-right">{clp(r.ppm_monto)}</td>
                        <td className="py-2 text-right">{clp(r.total_a_pagar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
