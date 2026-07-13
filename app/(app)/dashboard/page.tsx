"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}
function mesLabel(p: string) {
  const [, m] = p.split("-");
  return ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][parseInt(m)];
}

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState(mesActual);
  const [data, setData]       = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/dashboard?periodo=${periodo}`);
      setData(await res.json());
    } finally { setCargando(false); }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const alertaColor: Record<string, string> = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info:    "bg-blue-50 border-blue-200 text-blue-800",
    danger:  "bg-red-50 border-red-200 text-red-800",
  };
  const alertaIcono: Record<string, string> = { warning: "⚠️", info: "💡", danger: "🔴" };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen global de todas las empresas</p>
        </div>
        <input type="month"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      </div>

      {cargando && <p className="text-slate-400 text-sm">Cargando...</p>}

      {data && !cargando && (
        <>
          {/* KPIs globales */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Empresas activas",    value: data.totales.totalEmpresas,    fmt: (v: number) => String(v) },
              { label: "Trabajadores",         value: data.totales.totalTrabajadores, fmt: (v: number) => String(v) },
              { label: "Total líquido a pagar",value: data.totales.totalLiquido,    fmt: clp },
              { label: "Total Previred",        value: data.totales.totalPrevired,   fmt: clp },
              { label: "Total F29",             value: data.totales.totalF29,        fmt: clp },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">{k.label}</p>
                <p className="font-bold text-slate-900 text-lg mt-0.5">{k.fmt(k.value)}</p>
              </div>
            ))}
            <div className="bg-teal-700 rounded-xl p-4 text-center text-white">
              <p className="text-xs text-teal-100">Total obligaciones del período</p>
              <p className="font-bold text-xl mt-0.5">
                {clp(data.totales.totalPrevired + data.totales.totalF29)}
              </p>
            </div>
          </div>

          {/* Vencimientos */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Vencimientos del período</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {data.vencimientos.map((v: any, i: number) => (
                <div key={i} className={`rounded-lg border px-4 py-3 ${
                  v.urgencia === "alta" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                }`}>
                  <p className="font-semibold text-sm text-slate-800">{v.nombre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">📅 {v.fecha}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas globales */}
          {data.alertas.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Alertas ({data.alertas.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.alertas.map((a: any, i: number) => (
                  <Link key={i} href={`/empresas/${a.empresa_id}/remuneraciones`}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 hover:opacity-80 transition ${alertaColor[a.tipo] || alertaColor.info}`}>
                    <span>{alertaIcono[a.tipo] || "💡"}</span>
                    <div>
                      <span className="font-semibold text-xs">{a.empresa}</span>
                      <span className="text-xs ml-2">{a.mensaje}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tabla por empresa */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-700">Estado por empresa — {periodo}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="text-left px-5 py-2 font-medium">Empresa</th>
                    <th className="text-right px-3 py-2 font-medium">Trab.</th>
                    <th className="text-right px-3 py-2 font-medium">Líquido</th>
                    <th className="text-right px-3 py-2 font-medium">Previred</th>
                    <th className="text-right px-3 py-2 font-medium">F29</th>
                    <th className="text-center px-3 py-2 font-medium">Estado rem.</th>
                    <th className="text-center px-3 py-2 font-medium">Estado F29</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.empresas.map((e: any) => {
                    const rem = data.remPeriodo.find((r: any) => r.empresa_id === e.id);
                    const f29 = data.f29Periodo.find((f: any) => f.empresa_id === e.id);
                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{e.razon_social}</p>
                          <p className="text-xs text-slate-400">{e.rut}</p>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{rem?.trabajadores || "—"}</td>
                        <td className="px-3 py-3 text-right font-medium">{rem ? clp(rem.liquido) : "—"}</td>
                        <td className="px-3 py-3 text-right font-medium">{rem ? clp(rem.total_previred) : "—"}</td>
                        <td className="px-3 py-3 text-right font-medium">{f29 ? clp(f29.total_a_pagar) : "—"}</td>
                        <td className="px-3 py-3 text-center">
                          {rem ? (
                            <span className={`text-xs rounded-full px-2 py-0.5 ${
                              rem.estado_periodo === "cerrado"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {rem.estado_periodo === "cerrado" ? "✓ Cerrado" : "Abierto"}
                            </span>
                          ) : <span className="text-xs text-slate-300">Sin datos</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {f29 ? (
                            <span className={`text-xs rounded-full px-2 py-0.5 ${
                              f29.estado === "presentado"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {f29.estado === "presentado" ? "✓ Presentado" : "Pendiente"}
                            </span>
                          ) : <span className="text-xs text-slate-300">Sin datos</span>}
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/empresas/${e.id}`}
                            className="text-xs text-teal-700 hover:underline">Ver →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparativa mensual global */}
          {data.ultimos6?.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                Evolución mensual — Todas las empresas {new Date(periodo).getFullYear()}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="text-left pb-2">Mes</th>
                      <th className="text-right pb-2">Trabajadores</th>
                      <th className="text-right pb-2">Total haberes</th>
                      <th className="text-right pb-2">Total líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.ultimos6.map((r: any) => (
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
        </>
      )}
    </div>
  );
}
