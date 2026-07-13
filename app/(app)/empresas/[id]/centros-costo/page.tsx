"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const TIPOS = ["proyecto","sucursal","departamento","otro"] as const;
function clp(v: number) {
  return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(v||0));
}

export default function CentrosCostoPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [centros, setCentros] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ codigo:"", nombre:"", descripcion:"", tipo:"proyecto" });
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const [eRes, cRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/centros-costo?empresa_id=${id}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setCentros((await cRes.json()).centros || []);
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/centros-costo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, ...form }),
    });
    setGuardando(false);
    setForm({ codigo:"", nombre:"", descripcion:"", tipo:"proyecto" });
    setShowForm(false);
    setMsg("✓ Centro de costo creado");
    cargar();
  }

  async function handleEliminar(ccId: number) {
    if (!confirm("¿Desactivar este centro de costo?")) return;
    await fetch(`/api/centros-costo?id=${ccId}`, { method: "DELETE" });
    cargar();
  }

  const tipoColor: Record<string, string> = {
    proyecto: "bg-blue-50 text-blue-700",
    sucursal: "bg-purple-50 text-purple-700",
    departamento: "bg-amber-50 text-amber-700",
    otro: "bg-slate-100 text-slate-600",
  };

  const totalDebe  = centros.reduce((s,c) => s + Number(c.total_debe||0), 0);
  const totalHaber = centros.reduce((s,c) => s + Number(c.total_haber||0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-2xl font-semibold text-slate-900">Centros de Costo</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800">
          + Nuevo centro
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Asigna gastos a proyectos, sucursales o departamentos en los vouchers contables para obtener reportes por centro.
      </p>

      {centros.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Centros activos</p>
            <p className="font-bold text-slate-900 text-lg">{centros.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Total gastos asignados</p>
            <p className="font-bold text-red-700">{clp(totalDebe)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Total ingresos asignados</p>
            <p className="font-bold text-teal-700">{clp(totalHaber)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAgregar} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Código</label>
              <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} placeholder="CC001" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-slate-600">Nombre</label>
              <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Proyecto Norte, Sucursal Coronel..." />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-slate-600">Descripción (opcional)</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60">
              {guardando?"Guardando...":"Crear centro de costo"}
            </button>
            <button type="button" onClick={()=>setShowForm(false)}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {centros.map((c:any) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-slate-500 w-20">{c.codigo}</span>
                <div>
                  <p className="font-medium text-slate-900">{c.nombre}</p>
                  {c.descripcion && <p className="text-xs text-slate-400">{c.descripcion}</p>}
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 ${tipoColor[c.tipo]||tipoColor.otro}`}>
                  {c.tipo}
                </span>
              </div>
              <button onClick={()=>handleEliminar(c.id)}
                className="text-xs text-red-400 hover:text-red-700">Desactivar</button>
            </div>
            {(Number(c.total_debe)>0 || Number(c.total_haber)>0) && (
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-center">
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-slate-400">Gastos (Debe)</p>
                  <p className="font-semibold text-red-700">{clp(c.total_debe)}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-2">
                  <p className="text-slate-400">Ingresos (Haber)</p>
                  <p className="font-semibold text-teal-700">{clp(c.total_haber)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400">Resultado</p>
                  <p className={`font-semibold ${Number(c.total_haber)-Number(c.total_debe)>=0?"text-teal-700":"text-red-700"}`}>
                    {clp(Math.abs(Number(c.total_haber)-Number(c.total_debe)))}
                  </p>
                </div>
              </div>
            )}
            {Number(c.usos_vouchers)>0 && (
              <p className="text-xs text-slate-400 mt-2">Usado en {c.usos_vouchers} línea(s) de voucher</p>
            )}
          </div>
        ))}
        {centros.length===0 && (
          <p className="text-sm text-slate-400 text-center py-8">Sin centros de costo. Crea uno para empezar a asignar gastos.</p>
        )}
      </div>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  );
}
