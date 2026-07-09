"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevoTrabajadorForm({ empresaId }: { empresaId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rut: "",
    nombres: "",
    apellidos: "",
    tipo_contrato: "indefinido",
    cargo: "",
    afp: "",
    sistema_salud: "fonasa",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/trabajadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, empresa_id: empresaId }),
    });
    setLoading(false);
    if (res.ok) {
      setForm({
        rut: "", nombres: "", apellidos: "", tipo_contrato: "indefinido",
        cargo: "", afp: "", sistema_salud: "fonasa",
      });
      setOpen(false);
      router.refresh();
    }
  }

  const esHonorarios = form.tipo_contrato === "honorarios";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition"
      >
        + Agregar trabajador
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-xl bg-white p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">RUT</label>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.rut}
            onChange={(e) => setForm({ ...form, rut: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Tipo de contrato</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.tipo_contrato}
            onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })}
          >
            <option value="indefinido">Indefinido</option>
            <option value="plazo_fijo">Plazo fijo</option>
            <option value="por_obra">Por obra/faena</option>
            <option value="honorarios">Honorarios (boleta)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Nombres</label>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.nombres}
            onChange={(e) => setForm({ ...form, nombres: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Apellidos</label>
          <input
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.apellidos}
            onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Cargo (opcional)</label>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.cargo}
          onChange={(e) => setForm({ ...form, cargo: e.target.value })}
        />
      </div>

      {!esHonorarios && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">AFP</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Habitat, Modelo, Uno..."
              value={form.afp}
              onChange={(e) => setForm({ ...form, afp: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Sistema de salud</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.sistema_salud}
              onChange={(e) => setForm({ ...form, sistema_salud: e.target.value })}
            >
              <option value="fonasa">Fonasa</option>
              <option value="isapre">Isapre</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar trabajador"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
