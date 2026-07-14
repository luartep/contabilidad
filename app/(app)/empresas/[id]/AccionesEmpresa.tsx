"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccionesEmpresa({ empresa }: { empresa: any }) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [notas, setNotas]     = useState(empresa.notas_internas || "");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [reabriendo, setReabriendo] = useState(false);

  async function guardarNotas() {
    setSaving(true);
    await fetch(`/api/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas_internas: notas }),
    });
    setSaving(false);
    setMsg("✓ Guardado");
    setTimeout(() => { setMsg(""); router.refresh(); }, 1200);
  }

  async function reactivar() {
    await fetch(`/api/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: true }),
    });
    router.refresh();
  }

  async function desactivar() {
    if (!confirm(`¿Desactivar "${empresa.razon_social}"? No se perderán datos, podrás reactivarla desde la lista.`)) return;
    await fetch(`/api/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: false }),
    });
    router.push("/empresas");
  }

  async function eliminarDefinitivo() {
    const c1 = confirm(`¿Eliminar definitivamente "${empresa.razon_social}"?\n\nEsto borrará TODOS sus datos de forma irreversible.`);
    if (!c1) return;
    const c2 = confirm(`Segunda confirmación: ¿estás seguro? No hay vuelta atrás.`);
    if (!c2) return;
    await fetch(`/api/empresas/${empresa.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ definitivo: true }),
    });
    router.push("/empresas");
  }

  async function reabrirPeriodo() {
    if (!confirm(`¿Reabrir el período ${periodo}?\n\nSe eliminarán todas las liquidaciones calculadas para ese período. Podrás recalcularlas desde cero.`)) return;
    setReabriendo(true);
    const res = await fetch(
      `/api/remuneraciones/periodo?empresa_id=${empresa.id}&periodo=${periodo}`,
      { method: "DELETE" }
    );
    setReabriendo(false);
    if (res.ok) {
      setMsg(`✓ Período ${periodo} reabierto`);
      setTimeout(() => setMsg(""), 2000);
    } else {
      const d = await res.json();
      setMsg(`Error: ${d.error}`);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-3 py-2 hover:bg-slate-50 transition"
      >
        ⋯ Más opciones
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Opciones — {empresa.razon_social}</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            {/* Notas internas */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">📝 Notas internas</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none"
                placeholder="Observaciones del contador, datos de contacto, recordatorios..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
              <button
                onClick={guardarNotas}
                disabled={saving}
                className="rounded-lg bg-teal-700 text-white text-sm px-4 py-1.5 hover:bg-teal-800 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar notas"}
              </button>
              {msg && <span className="text-sm text-teal-700 ml-2">{msg}</span>}
            </div>

            <hr className="border-slate-100" />

            {/* Reabrir período */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">🔄 Reabrir período de remuneraciones</label>
              <p className="text-xs text-slate-400">Borra las liquidaciones del período para recalcularlas desde cero.</p>
              <div className="flex gap-2">
                <input
                  type="month"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                />
                <button
                  onClick={reabrirPeriodo}
                  disabled={reabriendo}
                  className="rounded-lg bg-amber-600 text-white text-sm px-4 py-1.5 hover:bg-amber-700 disabled:opacity-60"
                >
                  {reabriendo ? "..." : "Reabrir"}
                </button>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Estado empresa */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado de la empresa</label>
              {empresa.activa ? (
                <button
                  onClick={desactivar}
                  className="w-full text-left rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  ⏸ Desactivar empresa <span className="text-xs text-slate-400 ml-1">(se oculta de la lista, datos intactos)</span>
                </button>
              ) : (
                <button
                  onClick={reactivar}
                  className="w-full text-left rounded-lg border border-teal-200 px-4 py-2.5 text-sm text-teal-700 hover:bg-teal-50"
                >
                  ▶ Reactivar empresa
                </button>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Zona de peligro */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-red-400 uppercase tracking-wide">⚠ Zona de peligro</label>
              <button
                onClick={eliminarDefinitivo}
                className="w-full text-left rounded-lg border border-red-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                🗑 Eliminar empresa y todos sus datos <span className="text-xs text-red-400 ml-1">(irreversible)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
