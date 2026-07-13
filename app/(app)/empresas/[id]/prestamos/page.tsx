"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function PrestamosPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ trabajador_id: "", tipo: "prestamo", monto_total: "", cuotas: "1", observaciones: "" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const [eRes, pRes, tRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/prestamos?empresa_id=${id}`),
      fetch(`/api/trabajadores?empresa_id=${id}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setPrestamos((await pRes.json()).prestamos || []);
    setTrabajadores((await tRes.json()).trabajadores || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/prestamos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (res.ok) {
      setForm({ trabajador_id: "", tipo: "prestamo", monto_total: "", cuotas: "1", observaciones: "" });
      setShowForm(false);
      setMsg("✓ Préstamo registrado");
      cargar();
    }
  }

  async function handlePagarCuota(prestamo: any) {
    const periodo = prompt("Período de la cuota (YYYY-MM):", new Date().toISOString().slice(0, 7));
    if (!periodo) return;
    await fetch("/api/prestamos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prestamo_id: prestamo.id, periodo, monto: prestamo.cuota_mensual }),
    });
    setMsg("✓ Cuota registrada");
    cargar();
  }

  async function handleEliminar(presId: number) {
    if (!confirm("¿Desactivar este préstamo?")) return;
    await fetch(`/api/prestamos?id=${presId}`, { method: "DELETE" });
    cargar();
  }

  const totalSaldo = prestamos.reduce((s, p) => s + Number(p.saldo_pendiente), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-2xl font-semibold text-slate-900">Préstamos y Anticipos</h1>
        {totalSaldo > 0 && (
          <span className="text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
            Saldo total: {clp(totalSaldo)}
          </span>
        )}
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 transition">
          + Nuevo préstamo / anticipo
        </button>
      ) : (
        <form onSubmit={handleCrear} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Nuevo préstamo / anticipo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Trabajador</label>
              <select required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.trabajador_id} onChange={(e) => setForm({ ...form, trabajador_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {trabajadores.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="prestamo">Préstamo</option>
                <option value="anticipo">Anticipo de sueldo</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Monto total ($)</label>
              <input type="number" min="1" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.monto_total} onChange={(e) => setForm({ ...form, monto_total: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">N° de cuotas</label>
              <input type="number" min="1" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.cuotas} onChange={(e) => setForm({ ...form, cuotas: e.target.value })} />
            </div>
          </div>
          {form.monto_total && form.cuotas && (
            <p className="text-sm text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
              Cuota mensual: <strong>{clp(Math.round(Number(form.monto_total) / Number(form.cuotas)))}</strong>
            </p>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Observaciones</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60">
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {prestamos.map((p: any) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-slate-900">{p.nombres} {p.apellidos}</p>
                <p className="text-xs text-slate-400">{p.rut} · {p.tipo === "anticipo" ? "Anticipo" : "Préstamo"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Saldo pendiente</p>
                <p className="font-bold text-amber-700">{clp(p.saldo_pendiente)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-400">Total</p>
                <p className="font-semibold">{clp(p.monto_total)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-400">Cuota</p>
                <p className="font-semibold">{clp(p.cuota_mensual)}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-400">Pagadas</p>
                <p className="font-semibold">{p.cuotas_pagadas} / {p.cuotas}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-2">
                <p className="text-slate-400">Progreso</p>
                <p className="font-semibold text-teal-700">
                  {Math.round((p.cuotas_pagadas / p.cuotas) * 100)}%
                </p>
              </div>
            </div>
            {/* Barra de progreso */}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (p.cuotas_pagadas / p.cuotas) * 100)}%` }} />
            </div>
            <div className="mt-3 flex gap-2">
              {Number(p.saldo_pendiente) > 0 && (
                <button onClick={() => handlePagarCuota(p)}
                  className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-teal-800">
                  + Registrar cuota pagada
                </button>
              )}
              <button onClick={() => handleEliminar(p.id)}
                className="rounded-lg border border-red-200 text-red-600 text-xs font-medium px-3 py-1.5 hover:bg-red-50">
                Desactivar
              </button>
            </div>
          </div>
        ))}
        {prestamos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">Sin préstamos activos.</p>
        )}
      </div>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  );
}
