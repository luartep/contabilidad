"use client";

import { useState } from "react";

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(Number(v) || 0));
}

interface Props {
  liquidaciones: any[];
  onPDF: (id: number) => void;
  onActualizar: () => void;
  cerrado: boolean;
}

export default function TablaLiquidaciones({ liquidaciones, onPDF, onActualizar, cerrado }: Props) {
  const [expandido, setExpandido] = useState<number | null>(null);
  const [editando, setEditando] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  function abrirEdicion(l: any) {
    setEditando({ ...l });
    setExpandido(l.id);
  }

  async function guardarEdicion() {
    setSaving(true);
    const res = await fetch("/api/remuneraciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando),
    });
    setSaving(false);
    if (res.ok) {
      setEditando(null);
      onActualizar();
    }
  }

  const campo = (key: string, label: string) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
      <span className="text-slate-600 text-xs w-44">{label}</span>
      {editando?.id === expandido ? (
        <input
          type="number"
          className="w-32 rounded border border-slate-300 px-2 py-0.5 text-xs text-right"
          value={editando[key] ?? 0}
          onChange={(e) => setEditando({ ...editando, [key]: Number(e.target.value) })}
        />
      ) : (
        <span className="text-xs font-medium">{clp(expandido ? (liquidaciones.find(l => l.id === expandido)?.[key] || 0) : 0)}</span>
      )}
    </div>
  );

  return (
    <div className="mt-4 space-y-2">
      {liquidaciones.map((l: any) => (
        <div key={l.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Fila resumen */}
          <div
            className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50"
            onClick={() => setExpandido(expandido === l.id ? null : l.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-900">
                {l.nombres} {l.apellidos}
              </span>
              <span className="text-xs text-slate-400">{l.rut}</span>
              {l.editado_manualmente && (
                <span className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5">editada</span>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-400">Haberes</p>
                <p className="text-sm font-medium">{clp(l.total_haberes)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Descuentos</p>
                <p className="text-sm font-medium text-red-600">{clp(l.total_descuentos)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Líquido</p>
                <p className="text-base font-bold text-teal-700">{clp(l.liquido_a_pagar)}</p>
              </div>
              <span className="text-slate-400 text-sm">{expandido === l.id ? "▲" : "▼"}</span>
            </div>
          </div>

          {/* Detalle expandido */}
          {expandido === l.id && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-6 mt-4">
                {/* HABERES */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Haberes</h4>
                  {campo("sueldo_base", "Sueldo Base")}
                  {campo("gratificacion", "Gratificación Legal")}
                  {campo("horas_extra_monto", "Horas Extra")}
                  {campo("comisiones", "Comisiones")}
                  {campo("bono_imponible", "Bono Imponible")}
                  {campo("otros_imponibles", "Otros Imponibles")}
                  <div className="flex justify-between py-1.5 font-semibold bg-slate-50 px-2 rounded mt-1">
                    <span className="text-xs">Total Imponible</span>
                    <span className="text-xs">{clp(l.total_haberes_imponibles)}</span>
                  </div>
                  {campo("colacion", "Colación")}
                  {campo("movilizacion", "Movilización")}
                  {campo("asignacion_familiar", "Asig. Familiar")}
                  {campo("bono_no_imponible", "Bono No Imponible")}
                  {campo("otros_no_imponibles", "Otros No Imponibles")}
                  <div className="flex justify-between py-1.5 font-semibold bg-slate-50 px-2 rounded mt-1">
                    <span className="text-xs">Total No Imponible</span>
                    <span className="text-xs">{clp(l.total_haberes_no_imponibles)}</span>
                  </div>
                </div>

                {/* DESCUENTOS */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Descuentos</h4>
                  {campo("afp_trabajador", `AFP 10% (${l.afp_nombre || ""})`)}
                  {campo("afp_adicional", "Comisión AFP")}
                  {campo("salud_trabajador", `Salud (${l.sistema_salud === "isapre" ? "Isapre" : "Fonasa 7%"})`)}
                  {campo("cesantia_trabajador", "Cesantía Trabajador")}
                  {campo("impuesto_unico", "Impuesto Único 2ª Cat.")}
                  <div className="flex justify-between py-1.5 font-semibold bg-slate-50 px-2 rounded mt-1">
                    <span className="text-xs">Total Desc. Legales</span>
                    <span className="text-xs">{clp(l.total_descuentos_legales)}</span>
                  </div>
                  {campo("descuentos_varios", "Otros Descuentos")}
                  {campo("anticipo", "Anticipo")}

                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 mt-4">Aportes Empleador</h4>
                  {campo("cesantia_empleador", "Cesantía Empleador")}
                  {campo("sis_empleador", "SIS (Invalidez)")}
                  {campo("accidente_empleador", "Seg. Accidentes")}

                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 mt-4">Bases de Cálculo</h4>
                  <div className="text-xs space-y-1 text-slate-500">
                    <div className="flex justify-between"><span>Base imponible AFP/Salud</span><span>{clp(l.base_imponible_afp)}</span></div>
                    <div className="flex justify-between"><span>Base imponible Cesantía</span><span>{clp(l.base_imponible_cesantia)}</span></div>
                    <div className="flex justify-between"><span>Base tributable (Imp. Único)</span><span>{clp(l.base_tributable)}</span></div>
                    <div className="flex justify-between"><span>UF usada</span><span>{clp(l.uf_usada)}</span></div>
                    <div className="flex justify-between"><span>UTM usada</span><span>{clp(l.utm_usada)}</span></div>
                    <div className="flex justify-between"><span>IMM usado</span><span>{clp(l.imm_usado)}</span></div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {editando?.id === l.id && (
                <div className="mt-3">
                  <label className="text-xs text-slate-500">Notas</label>
                  <textarea
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs mt-1"
                    rows={2}
                    value={editando.notas || ""}
                    onChange={(e) => setEditando({ ...editando, notas: e.target.value })}
                  />
                </div>
              )}

              {/* Totales */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">Total Haberes</p>
                  <p className="font-bold text-slate-900">{clp(l.total_haberes)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">Total Descuentos</p>
                  <p className="font-bold text-red-700">{clp(l.total_descuentos)}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-teal-700">Líquido a Pagar</p>
                  <p className="font-bold text-teal-700 text-lg">{clp(l.liquido_a_pagar)}</p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onPDF(l.id)}
                  className="rounded-lg border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 hover:bg-slate-50"
                >
                  🖨 PDF
                </button>
                {!cerrado && (
                  editando?.id === l.id ? (
                    <>
                      <button
                        onClick={guardarEdicion}
                        disabled={saving}
                        className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-teal-800 disabled:opacity-60"
                      >
                        {saving ? "Guardando..." : "✓ Guardar cambios"}
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        className="rounded-lg border border-slate-300 text-slate-600 text-xs font-medium px-3 py-1.5 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => abrirEdicion(l)}
                      className="rounded-lg border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 hover:bg-slate-50"
                    >
                      ✏ Editar manualmente
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
