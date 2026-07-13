"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditarEmpresaForm({ empresa }: { empresa: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    razon_social: empresa.razon_social || "",
    rut: empresa.rut || "",
    nombre_fantasia: empresa.nombre_fantasia || "",
    giro: empresa.giro || "",
    regimen_tributario: empresa.regimen_tributario || "pro_pyme",
    regimen_iva: empresa.regimen_iva || "general",
    tasa_ppm: empresa.tasa_ppm || "0.25",
    representante_legal: empresa.representante_legal || "",
    direccion: empresa.direccion || "",
    email_contacto: empresa.email_contacto || "",
    telefono_contacto: empresa.telefono_contacto || "",
    mutualidad: empresa.mutualidad || "",
    tasa_accidentes: empresa.tasa_accidentes || "0.95",
    caja_compensacion: empresa.caja_compensacion || "",
    actividad_economica: empresa.actividad_economica || "",
    codigo_actividad: empresa.codigo_actividad || "",
  });

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg("");
    const res = await fetch(`/api/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("✓ Guardado");
      setOpen(false);
      router.refresh();
    } else {
      setMsg("Error al guardar");
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
      ✏ Editar empresa
    </button>
  );

  return (
    <form onSubmit={handleGuardar} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 mt-4">
      <h3 className="text-sm font-semibold text-slate-700">Editar datos de la empresa</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: "rut",               label: "RUT",                  placeholder: "76.123.456-7" },
          { key: "razon_social",      label: "Razón social",         placeholder: "" },
          { key: "nombre_fantasia",   label: "Nombre de fantasía",   placeholder: "" },
          { key: "giro",              label: "Giro",                 placeholder: "" },
          { key: "representante_legal", label: "Representante legal", placeholder: "" },
          { key: "direccion",         label: "Dirección",            placeholder: "" },
          { key: "email_contacto",    label: "Email contacto",       placeholder: "" },
          { key: "telefono_contacto", label: "Teléfono contacto",    placeholder: "" },
          { key: "actividad_economica", label: "Actividad económica", placeholder: "" },
          { key: "codigo_actividad",  label: "Código actividad SII", placeholder: "" },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-slate-600">{label}</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={(form as any)[key]} placeholder={placeholder}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </div>
        ))}

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
          <input type="number" step="0.01" min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.tasa_ppm}
            onChange={(e) => setForm({ ...form, tasa_ppm: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Mutualidad (accidentes)</label>
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.mutualidad}
            onChange={(e) => setForm({ ...form, mutualidad: e.target.value })}>
            <option value="">Seleccionar...</option>
            <option value="ACHS">ACHS</option>
            <option value="Mutual CChC">Mutual CChC</option>
            <option value="IST">IST</option>
            <option value="ISL">ISL (Instituto de Seguridad Laboral)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Tasa accidentes (%)</label>
          <input type="number" step="0.01" min="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.tasa_accidentes}
            onChange={(e) => setForm({ ...form, tasa_accidentes: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Caja de compensación</label>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.caja_compensacion}
            onChange={(e) => setForm({ ...form, caja_compensacion: e.target.value })}
            placeholder="Los Andes, La Araucana, 18 de Septiembre..." />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2.5 hover:bg-slate-50">
          Cancelar
        </button>
        {msg && <span className="text-sm text-teal-700">{msg}</span>}
      </div>
    </form>
  );
}
