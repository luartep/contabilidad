"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaEmpresaForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rut: "", razon_social: "", nombre_fantasia: "",
    regimen_tributario: "pro_pyme", regimen_iva: "general", tasa_ppm: "0.25",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm({ rut: "", razon_social: "", nombre_fantasia: "", regimen_tributario: "pro_pyme", regimen_iva: "general", tasa_ppm: "0.25" });
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition">
      + Agregar empresa
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-xl bg-white p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">RUT</label>
          <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="76.123.456-7" value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Régimen tributario</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.regimen_tributario}
            onChange={(e) => setForm({ ...form, regimen_tributario: e.target.value })}>
            <option value="pro_pyme">Pro Pyme</option>
            <option value="renta_atribuida">Renta Atribuida</option>
            <option value="semi_integrado">Semi Integrado</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Razón social</label>
        <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Nombre de fantasía (opcional)</label>
        <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.nombre_fantasia} onChange={(e) => setForm({ ...form, nombre_fantasia: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Régimen IVA</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.regimen_iva}
            onChange={(e) => setForm({ ...form, regimen_iva: e.target.value })}>
            <option value="general">General (débito - crédito)</option>
            <option value="pro_pyme_trans">Pro Pyme Transparente (exento IVA)</option>
            <option value="primera_categ">Primera Categoría + PPM</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Tasa PPM (%)</label>
          <input type="number" step="0.01" min="0" max="100"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.tasa_ppm} onChange={(e) => setForm({ ...form, tasa_ppm: e.target.value })}
            placeholder="0.25" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition disabled:opacity-60">
          {loading ? "Guardando..." : "Guardar empresa"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition">
          Cancelar
        </button>
      </div>
    </form>
  );
}
