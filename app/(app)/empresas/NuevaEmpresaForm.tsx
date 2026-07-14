"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaEmpresaForm({ onCreada }: { onCreada?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rut: "", razon_social: "", nombre_fantasia: "",
    giro: "", regimen_tributario: "pro_pyme",
    regimen_iva: "general", tasa_ppm: "0.25",
    mutualidad: "", caja_compensacion: "",
    email_contacto: "", telefono_contacto: "",
    representante_legal: "", direccion: "",
  });

  const FORM_DEFAULT = { ...form };

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
      setForm(FORM_DEFAULT);
      setOpen(false);
      onCreada ? onCreada() : router.refresh();
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
      <h3 className="text-sm font-semibold text-slate-700">Nueva empresa</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">RUT *</label>
          <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="76.123.456-7" value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Régimen tributario</label>
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
        <label className="text-xs font-medium text-slate-600">Razón social *</label>
        <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Nombre fantasía</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.nombre_fantasia} onChange={(e) => setForm({ ...form, nombre_fantasia: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Giro</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.giro} onChange={(e) => setForm({ ...form, giro: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Régimen IVA</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.regimen_iva}
            onChange={(e) => setForm({ ...form, regimen_iva: e.target.value })}>
            <option value="general">General (débito - crédito)</option>
            <option value="pro_pyme_trans">Pro Pyme Transparente</option>
            <option value="primera_categ">Primera Categoría + PPM</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Tasa PPM (%)</label>
          <input type="number" step="0.01" min="0" max="100"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.tasa_ppm} onChange={(e) => setForm({ ...form, tasa_ppm: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Mutualidad</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.mutualidad} onChange={(e) => setForm({ ...form, mutualidad: e.target.value })}>
            <option value="">— No aplica —</option>
            <option value="ACHS">ACHS</option>
            <option value="Mutual CChC">Mutual CChC</option>
            <option value="IST">IST</option>
            <option value="ISL">ISL (Mutual de Seguridad)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Caja de compensación</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.caja_compensacion} onChange={(e) => setForm({ ...form, caja_compensacion: e.target.value })}>
            <option value="">— Sin caja —</option>
            <option value="Los Andes">Los Andes</option>
            <option value="La Araucana">La Araucana</option>
            <option value="Los Héroes">Los Héroes</option>
            <option value="18 de Septiembre">18 de Septiembre</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Representante legal</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.representante_legal} onChange={(e) => setForm({ ...form, representante_legal: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Dirección</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Email contacto</label>
          <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.email_contacto} onChange={(e) => setForm({ ...form, email_contacto: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Teléfono contacto</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.telefono_contacto} onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
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
