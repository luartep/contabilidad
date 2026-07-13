"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);
const CATEGORIAS = [
  { value: "maquinaria",           label: "Maquinaria y Equipos",    vida: 15 },
  { value: "vehiculo",             label: "Vehículo",                 vida: 7  },
  { value: "muebles",              label: "Muebles y Útiles",         vida: 7  },
  { value: "equipos_computacion",  label: "Equipos Computacionales",  vida: 6  },
  { value: "edificio",             label: "Edificio / Construcción",  vida: 40 },
  { value: "otro",                 label: "Otro",                     vida: 10 },
];

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function ActivosPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [activos, setActivos] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState(mesActual);
  const [showForm, setShowForm] = useState(false);
  const [depreciando, setDepreciando] = useState(false);
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: "", categoria: "maquinaria", descripcion: "",
    fecha_adquisicion: new Date().toISOString().slice(0, 10),
    valor_adquisicion: "", valor_residual: "0",
    vida_util_anios: "15", metodo_depreciacion: "lineal",
    numero_serie: "",
  });

  const cargar = useCallback(async () => {
    const [eRes, aRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/activos?empresa_id=${id}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setActivos((await aRes.json()).activos || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/activos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, ...form }),
    });
    setGuardando(false);
    setShowForm(false);
    setMsg("✓ Activo registrado");
    cargar();
  }

  async function handleDepreciar() {
    setDepreciando(true); setMsg("");
    const res = await fetch("/api/activos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, periodo }),
    });
    const data = await res.json();
    setDepreciando(false);
    setMsg(res.ok ? `✓ ${data.registradas} depreciación(es) registradas para ${periodo}` : "Error al depreciar");
  }

  async function handleBaja(activoId: number) {
    if (!confirm("¿Dar de baja este activo?")) return;
    await fetch(`/api/activos?id=${activoId}`, { method: "DELETE" });
    cargar();
  }

  const totalValorAdq  = activos.reduce((s, a) => s + Number(a.valor_adquisicion), 0);
  const totalValorLibro = activos.reduce((s, a) => s + Number(a.valor_libro_actual), 0);
  const totalDepMensual = activos.reduce((s, a) => s + Number(a.dep_mensual), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Activos Fijos y Depreciación</h1>
        <div className="flex gap-2 items-center">
          <input type="month" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          <button onClick={handleDepreciar} disabled={depreciando || activos.length === 0}
            className="rounded-lg bg-slate-700 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50">
            {depreciando ? "Depreciando..." : "↻ Depreciar período"}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-teal-700 text-white text-sm font-medium px-3 py-1.5 hover:bg-teal-800">
            + Agregar activo
          </button>
        </div>
      </div>

      {/* KPIs */}
      {activos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Valor de adquisición total</p>
            <p className="font-bold text-slate-900">{clp(totalValorAdq)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Valor libro actual</p>
            <p className="font-bold text-teal-700">{clp(totalValorLibro)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Depreciación mensual total</p>
            <p className="font-bold text-amber-700">{clp(totalDepMensual)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAgregar} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nombre del activo</label>
              <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Categoría</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.categoria}
                onChange={(e) => {
                  const cat = CATEGORIAS.find(c => c.value === e.target.value);
                  setForm({ ...form, categoria: e.target.value, vida_util_anios: String(cat?.vida || 10) });
                }}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label} ({c.vida} años SII)</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha de adquisición</label>
              <input type="date" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.fecha_adquisicion} onChange={(e) => setForm({ ...form, fecha_adquisicion: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Valor de adquisición ($)</label>
              <input type="number" min="0" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.valor_adquisicion} onChange={(e) => setForm({ ...form, valor_adquisicion: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Valor residual ($)</label>
              <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.valor_residual} onChange={(e) => setForm({ ...form, valor_residual: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Vida útil (años)</label>
              <input type="number" min="1" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.vida_util_anios} onChange={(e) => setForm({ ...form, vida_util_anios: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Método de depreciación</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.metodo_depreciacion}
                onChange={(e) => setForm({ ...form, metodo_depreciacion: e.target.value })}>
                <option value="lineal">Lineal (vida útil normal)</option>
                <option value="acelerada">Acelerada (vida útil / 3, Art. 31 N°5 LIR)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">N° de serie (opcional)</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
            </div>
          </div>
          {form.valor_adquisicion && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600">
              Depreciación mensual estimada:{" "}
              <strong className="text-teal-700">
                {clp(Math.round((Number(form.valor_adquisicion) - Number(form.valor_residual || 0)) /
                  (Number(form.vida_util_anios) * 12)))}
              </strong>
              {form.metodo_depreciacion === "acelerada" && (
                <span className="text-amber-700 ml-2">
                  (acelerada: {clp(Math.round((Number(form.valor_adquisicion) - Number(form.valor_residual || 0)) /
                    (Math.max(1, Math.floor(Number(form.vida_util_anios) / 3)) * 12)))})
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60">
              {guardando ? "Guardando..." : "Guardar activo"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de activos */}
      <div className="space-y-2">
        {activos.map((a: any) => {
          const pctDepreciado = Math.round(((Number(a.valor_adquisicion) - Number(a.valor_libro_actual)) / Number(a.valor_adquisicion)) * 100);
          const cat = CATEGORIAS.find(c => c.value === a.categoria);
          return (
            <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{a.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {cat?.label || a.categoria} · {a.metodo_depreciacion} · {a.vida_util_anios} años ·
                    Adq: {new Date(a.fecha_adquisicion).toLocaleDateString("es-CL")}
                  </p>
                </div>
                <button onClick={() => handleBaja(a.id)}
                  className="text-xs text-red-400 hover:text-red-700">Dar de baja</button>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Valor adq.</p>
                  <p className="font-semibold">{clp(a.valor_adquisicion)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Dep. mensual</p>
                  <p className="font-semibold text-amber-700">{clp(a.dep_mensual)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Dep. acumulada</p>
                  <p className="font-semibold text-red-600">{clp(a.dep_acumulada_total || 0)}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-2">
                  <p className="text-slate-400">Valor libro</p>
                  <p className="font-semibold text-teal-700">{clp(a.valor_libro_actual)}</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, pctDepreciado)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{pctDepreciado}% depreciado</p>
            </div>
          );
        })}
        {activos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">Sin activos fijos registrados.</p>
        )}
      </div>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  );
}
