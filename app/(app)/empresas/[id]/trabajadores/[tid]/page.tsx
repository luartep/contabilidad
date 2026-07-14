"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const CONCEPTOS = [
  { key: "sueldo_base",         label: "Sueldo Base",             imponible: true,  tributable: true },
  { key: "horas_extra",         label: "Horas Extra",             imponible: true,  tributable: true },
  { key: "comisiones",          label: "Comisiones",              imponible: true,  tributable: true },
  { key: "bono_imponible",      label: "Bono (imponible)",        imponible: true,  tributable: true },
  { key: "otros_imponibles",    label: "Otros Haberes Imponibles",imponible: true,  tributable: true },
  { key: "colacion",            label: "Colación",                imponible: false, tributable: false },
  { key: "movilizacion",        label: "Movilización",            imponible: false, tributable: false },
  { key: "asignacion_familiar", label: "Asignación Familiar",     imponible: false, tributable: false },
  { key: "bono_no_imponible",   label: "Bono (no imponible)",     imponible: false, tributable: false },
  { key: "otros_no_imponibles", label: "Otros No Imponibles",     imponible: false, tributable: false },
];

const AFPS = ["Capital","Cuprum","Habitat","PlanVital","ProVida","Modelo","Uno"];

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function FichaTrabajadorPage() {
  const { id, tid } = useParams<{ id: string; tid: string }>();
  const [t, setT] = useState<any>(null);
  const [montos, setMontos] = useState<Record<string, number>>({});
  const [config, setConfig] = useState({
    afp_automatico: true, salud_automatico: true,
    cesantia_automatico: true, impuesto_automatico: true,
  });
  const [apv, setApv] = useState({
    tiene_apv: false, modalidad_apv: "A",
    monto_apv: 0, institucion_apv: "", codigo_institucion: "",
  });
  const [datosExtra, setDatosExtra] = useState({
    sexo: "M", fecha_nacimiento: "", nacionalidad: "CHL",
    discapacidad: false, pensionado: false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function cargar() {
    const [tRes, apvRes] = await Promise.all([
      fetch(`/api/trabajadores/${tid}`),
      fetch(`/api/apv?trabajador_id=${tid}`),
    ]);
    const tData = await tRes.json();
    const apvData = await apvRes.json();

    setT(tData.trabajador);
    setConfig({
      afp_automatico: tData.trabajador.afp_automatico ?? true,
      salud_automatico: tData.trabajador.salud_automatico ?? true,
      cesantia_automatico: tData.trabajador.cesantia_automatico ?? true,
      impuesto_automatico: tData.trabajador.impuesto_automatico ?? true,
    });
    setDatosExtra({
      sexo: tData.trabajador.sexo || "M",
      fecha_nacimiento: tData.trabajador.fecha_nacimiento?.slice(0,10) || "",
      nacionalidad: tData.trabajador.nacionalidad || "CHL",
      discapacidad: tData.trabajador.discapacidad || false,
      pensionado: tData.trabajador.pensionado || false,
    });
    const m: Record<string, number> = {};
    for (const v of tData.variables || []) m[v.concepto] = Number(v.monto);
    setMontos(m);
    if (apvData.apv) setApv(apvData.apv);
  }

  useEffect(() => { cargar(); }, [tid]);

  async function handleGuardar() {
    setSaving(true); setMsg("");

    const variables = CONCEPTOS.map((c) => ({
      concepto: c.key, monto: montos[c.key] || 0,
      es_imponible: c.imponible, es_tributable: c.tributable,
    }));

    await Promise.all([
      fetch(`/api/trabajadores/${tid}/variables`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables }),
      }),
      fetch(`/api/trabajadores/${tid}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, ...datosExtra }),
      }),
      fetch(`/api/apv`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trabajador_id: tid, ...apv }),
      }),
    ]);

    setSaving(false); setMsg("✓ Guardado");
    cargar();
  }

  if (!t) return <div className="max-w-3xl mx-auto px-4 py-10 text-slate-400">Cargando...</div>;

  const esHonorarios = t.tipo_contrato === "honorarios";
  const totalBruto = CONCEPTOS.reduce((s, c) => s + (montos[c.key] || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← Volver a la empresa
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">
        {t.nombres} {t.apellidos}
      </h1>
      <p className="text-sm text-slate-500">
        {t.rut} · {t.cargo || "Sin cargo"} · <span className="capitalize">{t.tipo_contrato?.replace("_"," ")}</span>
        {t.afp && ` · AFP ${t.afp}`}
        {t.sistema_salud && ` · ${t.sistema_salud === "isapre" ? "Isapre" : "Fonasa"}`}
      </p>

      {/* Haberes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Haberes y variables de sueldo</h2>
        <p className="text-xs text-slate-400 mb-4">Deja en $0 los que no apliquen. Se usarán al calcular el período.</p>
        <div className="space-y-2">
          {CONCEPTOS.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <div className="w-52 text-sm text-slate-700">{c.label}</div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                <input
                  type="number" min="0"
                  className="w-full rounded-lg border border-slate-300 pl-6 pr-3 py-1.5 text-sm text-right"
                  value={montos[c.key] || ""}
                  onChange={(e) => setMontos({ ...montos, [c.key]: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.imponible ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                {c.imponible ? "Imponible" : "No imponible"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
          <strong>Sueldo bruto estimado: </strong>{clp(totalBruto)}
        </div>
      </div>

      {/* Datos para Previred */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Datos para Previred</h2>
        <p className="text-xs text-slate-400 mb-4">Campos requeridos para generar el archivo Previred correctamente.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Sexo</label>
            <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={datosExtra.sexo}
              onChange={(e) => setDatosExtra({ ...datosExtra, sexo: e.target.value })}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Fecha de nacimiento</label>
            <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={datosExtra.fecha_nacimiento}
              onChange={(e) => setDatosExtra({ ...datosExtra, fecha_nacimiento: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Nacionalidad</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={datosExtra.nacionalidad}
              onChange={(e) => setDatosExtra({ ...datosExtra, nacionalidad: e.target.value })}
              placeholder="CHL" />
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={datosExtra.discapacidad}
                onChange={(e) => setDatosExtra({ ...datosExtra, discapacidad: e.target.checked })}
                className="rounded border-slate-300 text-teal-600" />
              Trabajador con discapacidad
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={datosExtra.pensionado}
                onChange={(e) => setDatosExtra({ ...datosExtra, pensionado: e.target.checked })}
                className="rounded border-slate-300 text-teal-600" />
              Pensionado
            </label>
          </div>
        </div>
      </div>

      {/* APV */}
      {!esHonorarios && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">APV (Ahorro Previsional Voluntario)</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={apv.tiene_apv}
                onChange={(e) => setApv({ ...apv, tiene_apv: e.target.checked })}
                className="rounded border-slate-300 text-teal-600" />
              Este trabajador tiene APV
            </label>
            {apv.tiene_apv && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Modalidad</label>
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={apv.modalidad_apv}
                    onChange={(e) => setApv({ ...apv, modalidad_apv: e.target.value })}>
                    <option value="A">A — Con beneficio tributario (rebaja de impuesto)</option>
                    <option value="B">B — Sin beneficio tributario</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Monto mensual ($)</label>
                  <input type="number" min="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={apv.monto_apv || ""}
                    onChange={(e) => setApv({ ...apv, monto_apv: Number(e.target.value) })}
                    placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Institución APV</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={apv.institucion_apv}
                    onChange={(e) => setApv({ ...apv, institucion_apv: e.target.value })}
                    placeholder="AFP Habitat, BancoEstado, etc." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Código Previred (si lo tienes)</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={apv.codigo_institucion}
                    onChange={(e) => setApv({ ...apv, codigo_institucion: e.target.value })}
                    placeholder="Ej: 03" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Descuentos automáticos */}
      {!esHonorarios && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Descuentos automáticos</h2>
          <p className="text-xs text-slate-400 mb-4">Desmarca si manejas algún descuento en forma manual.</p>
          <div className="space-y-2">
            {[
              { key: "afp_automatico",      label: "AFP (10% + comisión)" },
              { key: "salud_automatico",     label: "Salud (Fonasa 7% o Isapre)" },
              { key: "cesantia_automatico",  label: "Cesantía AFC" },
              { key: "impuesto_automatico",  label: "Impuesto Único de Segunda Categoría" },
            ].map((d) => (
              <label key={d.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={(config as any)[d.key]}
                  onChange={(e) => setConfig({ ...config, [d.key]: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600" />
                <span className="text-sm text-slate-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pb-4 flex-wrap">
        <button onClick={handleGuardar} disabled={saving}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-5 py-2.5 hover:bg-teal-800 transition disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar ficha"}
        </button>
        {msg && <span className="text-sm text-teal-700">{msg}</span>}
      </div>

      {/* Acciones trabajador */}
      <div className="border border-slate-200 rounded-xl bg-white p-5 pb-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Estado del trabajador</h2>
        {t.activo !== false ? (
          <button
            onClick={async () => {
              if (!confirm("¿Desactivar a " + t.nombres + " " + t.apellidos + "?\n\nSe conserva todo el historial. Puedes reactivarlo después.")) return;
              await fetch("/api/trabajadores/" + tid, { method: "DELETE" });
              window.location.href = "/empresas/" + id;
            }}
            className="rounded-lg border border-slate-200 text-slate-600 text-sm px-4 py-2 hover:bg-slate-50"
          >
            ⏸ Desactivar trabajador <span className="text-xs text-slate-400">(ocultar de nómina, sin borrar datos)</span>
          </button>
        ) : (
          <div className="space-y-2">
            <span className="inline-block text-xs bg-slate-200 text-slate-500 rounded-full px-3 py-1">Trabajador inactivo</span>
            <br />
            <button
              onClick={async () => {
                await fetch("/api/trabajadores/" + tid, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ activo: true }),
                });
                window.location.reload();
              }}
              className="rounded-lg border border-teal-200 text-teal-700 text-sm px-4 py-2 hover:bg-teal-50"
            >
              ▶ Reactivar trabajador
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
