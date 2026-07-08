"use client";

import { useEffect, useState } from "react";

const mesActual = new Date().toISOString().slice(0, 7);

const TRAMOS_DEFAULT = [
  { tramo: 1, desde: 0, hasta: 965331, factor: 0, rebaja: 0 },
  { tramo: 2, desde: 965331.01, hasta: 2145180, factor: 0.04, rebaja: 38613.24 },
  { tramo: 3, desde: 2145180.01, hasta: 3575300, factor: 0.08, rebaja: 124420.44 },
  { tramo: 4, desde: 3575300.01, hasta: 4958750, factor: 0.135, rebaja: 320163.9 },
  { tramo: 5, desde: 4958750.01, hasta: 6342200, factor: 0.23, rebaja: 791184.65 },
  { tramo: 6, desde: 6342200.01, hasta: 8438930, factor: 0.304, rebaja: 1260546.15 },
  { tramo: 7, desde: 8438930.01, hasta: 21804830, factor: 0.35, rebaja: 1648857.8 },
  { tramo: 8, desde: 21804830.01, hasta: null, factor: 0.4, rebaja: 2740099.3 },
];

export default function ParametrosPage() {
  const [periodo, setPeriodo] = useState(mesActual);
  const [uf, setUf] = useState("");
  const [utm, setUtm] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetch(`/api/parametros?periodo=${periodo}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.parametro) {
          setUf(data.parametro.uf);
          setUtm(data.parametro.utm);
        }
      });
  }, [periodo]);

  async function handleGuardar() {
    setSaving(true);
    setSavedMsg("");
    const res = await fetch("/api/parametros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo, uf, utm, tramos: TRAMOS_DEFAULT }),
    });
    setSaving(false);
    setSavedMsg(res.ok ? "Guardado." : "Error al guardar.");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Parámetros del período</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        UF, UTM y tabla de impuesto único cambian cada mes. Actualízalos antes de calcular
        remuneraciones de un período nuevo. Los tramos de impuesto único se cargan con valores
        de referencia — verifícalos contra la Circular vigente del SII antes de usarlos.
      </p>

      <div className="border border-slate-200 rounded-xl bg-white p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Período</label>
          <input
            type="month"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">UF (último día del mes anterior)</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              placeholder="39123.45"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">UTM del mes</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              placeholder="71506"
            />
          </div>
        </div>

        <button
          onClick={handleGuardar}
          disabled={saving}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar parámetros del período"}
        </button>
        {savedMsg && <p className="text-sm text-slate-500">{savedMsg}</p>}
      </div>
    </div>
  );
}
