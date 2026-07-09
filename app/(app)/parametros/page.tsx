"use client";

import { useEffect, useState } from "react";

const mesActual = new Date().toISOString().slice(0, 7);

const TRAMOS_DEFAULT = [
  { tramo: 1, desde: 0,          hasta: 965331,     factor: 0,     rebaja: 0 },
  { tramo: 2, desde: 965331.01,  hasta: 2145180,    factor: 0.04,  rebaja: 38613.24 },
  { tramo: 3, desde: 2145180.01, hasta: 3575300,    factor: 0.08,  rebaja: 124420.44 },
  { tramo: 4, desde: 3575300.01, hasta: 4958750,    factor: 0.135, rebaja: 320163.9 },
  { tramo: 5, desde: 4958750.01, hasta: 6342200,    factor: 0.23,  rebaja: 791184.65 },
  { tramo: 6, desde: 6342200.01, hasta: 8438930,    factor: 0.304, rebaja: 1260546.15 },
  { tramo: 7, desde: 8438930.01, hasta: 21804830,   factor: 0.35,  rebaja: 1648857.8 },
  { tramo: 8, desde: 21804830.01,hasta: null,       factor: 0.4,   rebaja: 2740099.3 },
];

export default function ParametrosPage() {
  const [periodo, setPeriodo] = useState(mesActual);
  const [uf, setUf] = useState("");
  const [utm, setUtm] = useState("");
  const [imm, setImm] = useState("510966");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetch(`/api/parametros?periodo=${periodo}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.parametro) {
          setUf(data.parametro.uf);
          setUtm(data.parametro.utm);
          setImm(data.parametro.imm || "510966");
        } else {
          setUf(""); setUtm(""); setImm("510966");
        }
      });
  }, [periodo]);

  async function handleGuardar() {
    setSaving(true);
    setSavedMsg("");
    const res = await fetch("/api/parametros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodo, uf, utm, imm, tramos: TRAMOS_DEFAULT }),
    });
    setSaving(false);
    setSavedMsg(res.ok ? "✓ Guardado correctamente." : "Error al guardar.");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Parámetros del período</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Actualiza estos valores antes de calcular remuneraciones de un período nuevo.
        Los tramos de impuesto único se cargan con valores de referencia — verifica
        siempre contra la Circular del SII del mes vigente.
      </p>

      <div className="border border-slate-200 rounded-xl bg-white p-6 space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Período</label>
          <input
            type="month"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">UF (último día mes ant.)</label>
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
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">IMM (sueldo mínimo)</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={imm}
              onChange={(e) => setImm(e.target.value)}
              placeholder="510966"
            />
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
            Tramos Impuesto Único 2ª Categoría (referencia — verifica contra SII)
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left pb-1">Tramo</th>
                  <th className="text-right pb-1">Desde</th>
                  <th className="text-right pb-1">Hasta</th>
                  <th className="text-right pb-1">Factor</th>
                  <th className="text-right pb-1">Rebaja</th>
                </tr>
              </thead>
              <tbody>
                {TRAMOS_DEFAULT.map((t) => (
                  <tr key={t.tramo} className="border-t border-slate-200">
                    <td className="py-1">{t.tramo}</td>
                    <td className="text-right">{t.desde.toLocaleString("es-CL")}</td>
                    <td className="text-right">{t.hasta?.toLocaleString("es-CL") || "Sin tope"}</td>
                    <td className="text-right">{(t.factor * 100).toFixed(1)}%</td>
                    <td className="text-right">{t.rebaja.toLocaleString("es-CL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            ⚠ Estos tramos cambian cada mes según la UTM. Actualiza manualmente si difieren.
          </p>
        </div>

        <button
          onClick={handleGuardar}
          disabled={saving}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 transition disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar parámetros del período"}
        </button>
        {savedMsg && (
          <p className={`text-sm ${savedMsg.startsWith("✓") ? "text-teal-700" : "text-red-600"}`}>
            {savedMsg}
          </p>
        )}
      </div>
    </div>
  );
}
