"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const CONCEPTOS = [
  { key: "sueldo_base",        label: "Sueldo Base",            imponible: true,  tributable: true },
  { key: "horas_extra",        label: "Horas Extra",            imponible: true,  tributable: true },
  { key: "comisiones",         label: "Comisiones",             imponible: true,  tributable: true },
  { key: "bono_imponible",     label: "Bono (imponible)",       imponible: true,  tributable: true },
  { key: "otros_imponibles",   label: "Otros Haberes Imponibles",imponible: true,  tributable: true },
  { key: "colacion",           label: "Colación",               imponible: false, tributable: false },
  { key: "movilizacion",       label: "Movilización",           imponible: false, tributable: false },
  { key: "asignacion_familiar",label: "Asignación Familiar",    imponible: false, tributable: false },
  { key: "bono_no_imponible",  label: "Bono (no imponible)",    imponible: false, tributable: false },
  { key: "otros_no_imponibles",label: "Otros No Imponibles",    imponible: false, tributable: false },
];

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function FichaTrabajadorPage() {
  const { id, tid } = useParams<{ id: string; tid: string }>();
  const [t, setT] = useState<any>(null);
  const [montos, setMontos] = useState<Record<string, number>>({});
  const [config, setConfig] = useState({
    afp_automatico: true,
    salud_automatico: true,
    cesantia_automatico: true,
    impuesto_automatico: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function cargar() {
    const res = await fetch(`/api/trabajadores/${tid}`);
    const data = await res.json();
    setT(data.trabajador);
    setConfig({
      afp_automatico: data.trabajador.afp_automatico ?? true,
      salud_automatico: data.trabajador.salud_automatico ?? true,
      cesantia_automatico: data.trabajador.cesantia_automatico ?? true,
      impuesto_automatico: data.trabajador.impuesto_automatico ?? true,
    });
    const m: Record<string, number> = {};
    for (const v of data.variables || []) {
      m[v.concepto] = Number(v.monto);
    }
    setMontos(m);
  }

  useEffect(() => { cargar(); }, [tid]);

  async function handleGuardar() {
    setSaving(true); setMsg("");
    // Guardar variables de sueldo
    const variables = CONCEPTOS.map((c) => ({
      concepto: c.key,
      monto: montos[c.key] || 0,
      es_imponible: c.imponible,
      es_tributable: c.tributable,
    }));
    await fetch(`/api/trabajadores/${tid}/variables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variables }),
    });
    // Guardar config descuentos
    await fetch(`/api/trabajadores/${tid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setMsg("✓ Guardado");
    cargar();
  }

  if (!t) return <div className="max-w-3xl mx-auto px-4 py-10 text-slate-400">Cargando...</div>;

  const esHonorarios = t.tipo_contrato === "honorarios";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← Volver a la empresa
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">
        {t.nombres} {t.apellidos}
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        {t.rut} · {t.cargo || "Sin cargo"} ·{" "}
        <span className="capitalize">{t.tipo_contrato?.replace("_", " ")}</span>
        {t.afp && ` · AFP ${t.afp}`}
        {t.sistema_salud && ` · ${t.sistema_salud === "isapre" ? "Isapre" : "Fonasa"}`}
      </p>

      {/* Variables de sueldo */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Haberes y variables de sueldo</h2>
        <p className="text-xs text-slate-400 mb-4">
          Deja en $0 los conceptos que no apliquen a este trabajador. Al calcular el período se usarán
          los valores vigentes.
        </p>
        <div className="space-y-2">
          {CONCEPTOS.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <div className="w-52 text-sm text-slate-700">{c.label}</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 pl-6 pr-3 py-1.5 text-sm text-right"
                  value={montos[c.key] || ""}
                  onChange={(e) =>
                    setMontos({ ...montos, [c.key]: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  c.imponible
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {c.imponible ? "Imponible" : "No imponible"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
          <strong>Sueldo bruto estimado: </strong>
          {clp(CONCEPTOS.reduce((s, c) => s + (montos[c.key] || 0), 0))}
        </div>
      </div>

      {/* Config de descuentos */}
      {!esHonorarios && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Descuentos automáticos</h2>
          <p className="text-xs text-slate-400 mb-4">
            Desmarca si manejas algún descuento en forma manual (podrás editarlo en cada liquidación).
          </p>
          <div className="space-y-2">
            {[
              { key: "afp_automatico", label: "AFP (10% + comisión)" },
              { key: "salud_automatico", label: "Salud (Fonasa 7% o Isapre)" },
              { key: "cesantia_automatico", label: "Cesantía AFC" },
              { key: "impuesto_automatico", label: "Impuesto Único de Segunda Categoría" },
            ].map((d) => (
              <label key={d.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(config as any)[d.key]}
                  onChange={(e) => setConfig({ ...config, [d.key]: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600"
                />
                <span className="text-sm text-slate-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleGuardar}
          disabled={saving}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 transition disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar ficha"}
        </button>
        {msg && <span className="text-sm text-teal-700">{msg}</span>}
      </div>
    </div>
  );
}
