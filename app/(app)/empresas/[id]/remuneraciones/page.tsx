"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TablaLiquidaciones from "./TablaLiquidaciones";

const mesActual = new Date().toISOString().slice(0, 7);

export default function RemuneracionesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [empresa, setEmpresa] = useState<any>(null);
  const [periodo, setPeriodo] = useState(mesActual);
  const [perRem, setPerRem] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [msg, setMsg] = useState("");
  const [gratificacionTipo, setGratificacionTipo] = useState("garantizada");
  const [parametrosOk, setParametrosOk] = useState(true);

  const cargarDatos = useCallback(async () => {
    const [eRes, pRes, lRes, paramRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/remuneraciones/periodo?empresa_id=${id}&periodo=${periodo}`),
      fetch(`/api/remuneraciones?empresa_id=${id}&periodo=${periodo}`),
      fetch(`/api/parametros?periodo=${periodo}`),
    ]);
    const eData = await eRes.json();
    const pData = await pRes.json();
    const lData = await lRes.json();
    const paramData = await paramRes.json();

    setEmpresa(eData.empresa);
    setPerRem(pData.periodo);
    setLiquidaciones(lData.liquidaciones || []);
    setParametrosOk(!!paramData.parametro);
    if (pData.periodo) setGratificacionTipo(pData.periodo.gratificacion_tipo);
  }, [id, periodo]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  async function handleCalcular() {
    setCalculando(true);
    setMsg("");
    const res = await fetch("/api/remuneraciones/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, periodo, gratificacion_tipo: gratificacionTipo }),
    });
    const data = await res.json();
    setCalculando(false);
    if (res.ok) {
      setMsg(`✓ ${data.total} liquidación(es) calculada(s)`);
      cargarDatos();
    } else {
      setMsg(`Error: ${data.error}`);
    }
  }

  async function handleCerrarPeriodo() {
    if (!confirm(`¿Cerrar el período ${periodo}? Ya no se podrá recalcular automáticamente.`)) return;
    await fetch("/api/remuneraciones/periodo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, periodo, estado: "cerrado" }),
    });
    cargarDatos();
  }

  const abrirPDF = (todos = false, liqId?: number) => {
    const url = todos
      ? `/api/remuneraciones/pdf?todos=1&empresa_id=${id}&periodo=${periodo}`
      : `/api/remuneraciones/pdf?id=${liqId}`;
    window.open(url, "_blank");
  };

  const totalLiquido = liquidaciones.reduce((s: number, l: any) => s + Number(l.liquido_a_pagar), 0);
  const clp = (v: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← {empresa?.razon_social || "Empresa"}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Remuneraciones</h1>

      {/* Selector período + opciones */}
      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Período</label>
            <input
              type="month"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={periodo}
              onChange={(e) => { setPeriodo(e.target.value); setMsg(""); }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de gratificación</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={gratificacionTipo}
              onChange={(e) => setGratificacionTipo(e.target.value)}
              disabled={perRem?.estado === "cerrado"}
            >
              <option value="garantizada">Garantizada (25% sueldo base)</option>
              <option value="proporcional">Proporcional a utilidades</option>
              <option value="no_aplica">No aplica</option>
            </select>
          </div>
          {!parametrosOk && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ No hay parámetros para este período.{" "}
              <Link href="/parametros" className="underline font-medium">Configúralos aquí</Link>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCalcular}
            disabled={calculando || perRem?.estado === "cerrado" || !parametrosOk}
            className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition disabled:opacity-50"
          >
            {calculando ? "Calculando..." : liquidaciones.length > 0 ? "↻ Recalcular período" : "▶ Calcular liquidaciones"}
          </button>

          {liquidaciones.length > 0 && (
            <>
              <button
                onClick={() => abrirPDF(true)}
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition"
              >
                🖨 PDF — Todas las liquidaciones
              </button>
              {perRem?.estado !== "cerrado" && (
                <button
                  onClick={handleCerrarPeriodo}
                  className="rounded-lg border border-amber-300 text-amber-700 text-sm font-medium px-4 py-2 hover:bg-amber-50 transition"
                >
                  🔒 Cerrar período
                </button>
              )}
            </>
          )}
        </div>

        {msg && (
          <p className={`text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-teal-700"}`}>
            {msg}
          </p>
        )}
        {perRem?.estado === "cerrado" && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            🔒 Período cerrado — las liquidaciones no se pueden recalcular automáticamente.
          </p>
        )}
      </div>

      {/* Resumen */}
      {liquidaciones.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Trabajadores</p>
            <p className="text-2xl font-bold text-slate-900">{liquidaciones.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Total haberes</p>
            <p className="text-lg font-bold text-slate-900">
              {clp(liquidaciones.reduce((s: number, l: any) => s + Number(l.total_haberes), 0))}
            </p>
          </div>
          <div className="bg-teal-700 rounded-xl p-4 text-center">
            <p className="text-xs text-teal-100">Total líquido a pagar</p>
            <p className="text-lg font-bold text-white">{clp(totalLiquido)}</p>
          </div>
        </div>
      )}

      {/* Tabla liquidaciones */}
      {liquidaciones.length > 0 && (
        <TablaLiquidaciones
          liquidaciones={liquidaciones}
          onPDF={(liqId) => abrirPDF(false, liqId)}
          onActualizar={cargarDatos}
          cerrado={perRem?.estado === "cerrado"}
        />
      )}

      {liquidaciones.length === 0 && parametrosOk && (
        <div className="mt-8 text-center text-slate-400 py-12 border border-dashed border-slate-200 rounded-xl">
          Presiona "Calcular liquidaciones" para procesar el período {periodo}
        </div>
      )}
    </div>
  );
}
