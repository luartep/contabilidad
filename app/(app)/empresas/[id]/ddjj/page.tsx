"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const anioActual = new Date().getFullYear();

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function DDJJPage() {
  const { id } = useParams<{ id: string }>();
  const [anio, setAnio] = useState(anioActual - 1); // año comercial anterior (habitual)
  const [ddjjs, setDdjjs] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [generando, setGenerando] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [eRes, dRes] = await Promise.all([
        fetch(`/api/empresas/${id}`),
        fetch(`/api/ddjj?empresa_id=${id}&anio=${anio}`),
      ]);
      const eData = await eRes.json();
      const dData = await dRes.json();
      setEmpresa(eData.empresa);
      setDdjjs(dData.ddjjs || []);
    } catch { setMsg("Error al cargar."); }
    finally { setCargando(false); }
  }, [id, anio]);

  useEffect(() => { cargar(); }, [cargar]);

  async function generar(tipo: "1887" | "1879") {
    setGenerando(tipo); setMsg("");
    const res = await fetch("/api/ddjj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, anio, tipo }),
    });
    const data = await res.json();
    setGenerando(null);
    if (res.ok) {
      setMsg(`✓ DJ ${tipo} generada con ${data.lineas} informado(s).`);
      cargar();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  async function marcarPresentada(djId: number, tipo: string) {
    await fetch("/api/ddjj", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: djId, estado: "presentada" }),
    });
    setMsg(`✓ DJ ${tipo} marcada como presentada.`);
    cargar();
  }

  function verPDF(djId: number) {
    window.open(`/api/ddjj/lineas?declaracion_id=${djId}&formato=html`, "_blank");
  }

  const dj1887 = ddjjs.find((d) => d.tipo === "1887");
  const dj1879 = ddjjs.find((d) => d.tipo === "1879");

  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← {empresa?.razon_social || "Empresa"}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Declaraciones Juradas</h1>
      <p className="text-sm text-slate-500">
        DJ 1887 (sueldos) y DJ 1879 (honorarios) — generadas desde los datos registrados en la app.
        Se presentan ante el SII en marzo del año siguiente.
      </p>

      {/* Selector de año */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Año comercial</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={anio}
              onChange={(e) => { setAnio(Number(e.target.value)); setMsg(""); }}
            >
              {anios.map((a) => (
                <option key={a} value={a}>{a} (año tributario {a + 1})</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 pb-2">
            Plazo de presentación: <strong>marzo {anio + 1}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* DJ 1887 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">DJ 1887</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sueldos y salarios · Art. 42 N°1</p>
            </div>
            {dj1887 && (
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                dj1887.estado === "presentada"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {dj1887.estado === "presentada" ? "✓ Presentada" : "Borrador"}
              </span>
            )}
          </div>

          {dj1887 ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Trabajadores informados</span>
                <span className="font-medium">{dj1887.cantidad_informados}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Total rentas informadas</span>
                <span className="font-medium">{clp(dj1887.total_informado)}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Total impuesto retenido</span>
                <span className="font-medium">{clp(dj1887.total_retenido)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No generada para {anio}.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generar("1887")}
              disabled={generando === "1887"}
              className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-2 hover:bg-teal-800 transition disabled:opacity-60"
            >
              {generando === "1887" ? "Generando..." : dj1887 ? "↻ Regenerar" : "▶ Generar DJ 1887"}
            </button>
            {dj1887 && (
              <>
                <button onClick={() => verPDF(dj1887.id)}
                  className="rounded-lg border border-slate-300 text-slate-600 text-xs font-medium px-3 py-2 hover:bg-slate-50 transition">
                  🖨 Ver / Imprimir
                </button>
                {dj1887.estado !== "presentada" && (
                  <button onClick={() => marcarPresentada(dj1887.id, "1887")}
                    className="rounded-lg border border-green-300 text-green-700 text-xs font-medium px-3 py-2 hover:bg-green-50 transition">
                    ✓ Marcar presentada
                  </button>
                )}
              </>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
            <p>Se genera a partir de las <strong>liquidaciones de remuneraciones</strong> registradas en la app para {anio}.</p>
            <p>Plazo SII: <strong>hasta el último día hábil de marzo {anio + 1}</strong>.</p>
            <a href="https://www.sii.cl" target="_blank" rel="noopener noreferrer"
              className="text-teal-700 underline block mt-1">
              🔗 Presentar en SII
            </a>
          </div>
        </div>

        {/* DJ 1879 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">DJ 1879</h2>
              <p className="text-xs text-slate-500 mt-0.5">Honorarios · Art. 42 N°2</p>
            </div>
            {dj1879 && (
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                dj1879.estado === "presentada"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {dj1879.estado === "presentada" ? "✓ Presentada" : "Borrador"}
              </span>
            )}
          </div>

          {dj1879 ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Prestadores informados</span>
                <span className="font-medium">{dj1879.cantidad_informados}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Total honorarios informados</span>
                <span className="font-medium">{clp(dj1879.total_informado)}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Total retenciones</span>
                <span className="font-medium">{clp(dj1879.total_retenido)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No generada para {anio}.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generar("1879")}
              disabled={generando === "1879"}
              className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-2 hover:bg-teal-800 transition disabled:opacity-60"
            >
              {generando === "1879" ? "Generando..." : dj1879 ? "↻ Regenerar" : "▶ Generar DJ 1879"}
            </button>
            {dj1879 && (
              <>
                <button onClick={() => verPDF(dj1879.id)}
                  className="rounded-lg border border-slate-300 text-slate-600 text-xs font-medium px-3 py-2 hover:bg-slate-50 transition">
                  🖨 Ver / Imprimir
                </button>
                {dj1879.estado !== "presentada" && (
                  <button onClick={() => marcarPresentada(dj1879.id, "1879")}
                    className="rounded-lg border border-green-300 text-green-700 text-xs font-medium px-3 py-2 hover:bg-green-50 transition">
                    ✓ Marcar presentada
                  </button>
                )}
              </>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
            <p>Se genera a partir de las <strong>boletas de honorarios</strong> registradas en F29 durante {anio}.</p>
            <p>Plazo SII: <strong>hasta el último día hábil de marzo {anio + 1}</strong>.</p>
            <a href="https://www.sii.cl" target="_blank" rel="noopener noreferrer"
              className="text-teal-700 underline block mt-1">
              🔗 Presentar en SII
            </a>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm border ${
          msg.startsWith("Error")
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-teal-50 border-teal-200 text-teal-700"
        }`}>
          {msg}
        </div>
      )}
    </div>
  );
}
