"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0,7);
function clp(v:number){return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(v||0));}

const docDefault = {
  tipo:"emitida", periodo:mesActual, fecha:new Date().toISOString().slice(0,10),
  folio:"", rut_prestador:"", nombre_prestador:"",
  rut_pagador:"", nombre_pagador:"", monto_bruto:"", tasa_retencion:"13.75", observaciones:"",
};

export default function HonorariosPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [boletas, setBoletas] = useState<any[]>([]);
  const [totales, setTotales] = useState<any>({});
  const [periodo, setPeriodo] = useState(mesActual);
  const [tab, setTab] = useState<"emitida"|"recibida">("emitida");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(docDefault);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const cargar = useCallback(async () => {
    const [eRes, bRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/honorarios-boletas?empresa_id=${id}&periodo=${periodo}&tipo=${tab}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    const bData = await bRes.json();
    setBoletas(bData.boletas||[]);
    setTotales(bData.totales||{});
  }, [id, periodo, tab]);

  useEffect(()=>{cargar();},[cargar]);

  async function handleGuardar(e:React.FormEvent){
    e.preventDefault(); setGuardando(true);
    const res = await fetch("/api/honorarios-boletas",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({empresa_id:id, ...form}),
    });
    setGuardando(false);
    if(res.ok){setForm(docDefault);setShowForm(false);setMsg("✓ Boleta registrada");cargar();}
  }

  const bruto = Number(form.monto_bruto)||0;
  const tasa  = Number(form.tasa_retencion)||13.75;
  const ret   = Math.round(bruto*(tasa/100));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Boletas de Honorarios</h1>

      <div className="flex gap-4 items-end flex-wrap bg-white border border-slate-200 rounded-xl p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Período</label>
          <input type="month" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={periodo} onChange={e=>{setPeriodo(e.target.value);setMsg("");}} />
        </div>
        <div className="flex gap-1">
          {(["emitida","recibida"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${tab===t?"bg-teal-700 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {t==="emitida"?"Emitidas":"Recibidas"}
            </button>
          ))}
        </div>
      </div>

      {/* Totales */}
      {boletas.length>0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Bruto</p>
            <p className="font-bold text-slate-900">{clp(totales.bruto)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Retención total</p>
            <p className="font-bold text-red-700">{clp(totales.retencion)}</p>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Líquido total</p>
            <p className="font-bold text-teal-700">{clp(totales.liquido)}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      {!showForm ? (
        <button onClick={()=>{setShowForm(true);setForm({...docDefault,tipo:tab});}}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800">
          + Nueva boleta {tab==="emitida"?"emitida":"recibida"}
        </button>
      ) : (
        <form onSubmit={handleGuardar} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Folio (opcional)</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.folio} onChange={e=>setForm({...form,folio:e.target.value})} placeholder="Auto" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha</label>
              <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">RUT prestador</label>
              <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.rut_prestador} onChange={e=>setForm({...form,rut_prestador:e.target.value})} placeholder="12.345.678-9" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nombre prestador</label>
              <input required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.nombre_prestador} onChange={e=>setForm({...form,nombre_prestador:e.target.value})} />
            </div>
            {tab==="emitida" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">RUT pagador</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.rut_pagador} onChange={e=>setForm({...form,rut_pagador:e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Razón social pagador</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={form.nombre_pagador} onChange={e=>setForm({...form,nombre_pagador:e.target.value})} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Monto bruto ($)</label>
              <input type="number" required min="1" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.monto_bruto} onChange={e=>setForm({...form,monto_bruto:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tasa retención (%)</label>
              <input type="number" step="0.01" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.tasa_retencion} onChange={e=>setForm({...form,tasa_retencion:e.target.value})} />
            </div>
          </div>
          {bruto>0 && (
            <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-sm text-center">
              <div><p className="text-xs text-slate-400">Bruto</p><p className="font-bold">{clp(bruto)}</p></div>
              <div><p className="text-xs text-slate-400">Retención ({tasa}%)</p><p className="font-bold text-red-700">{clp(ret)}</p></div>
              <div><p className="text-xs text-slate-400">Líquido</p><p className="font-bold text-teal-700">{clp(bruto-ret)}</p></div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60">
              {guardando?"Guardando...":"Guardar boleta"}
            </button>
            <button type="button" onClick={()=>setShowForm(false)}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista boletas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {boletas.length===0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin boletas {tab==="emitida"?"emitidas":"recibidas"} este período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-4 py-2 font-medium">Folio</th>
                <th className="text-left px-3 py-2 font-medium">Prestador</th>
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-right px-3 py-2 font-medium">Bruto</th>
                <th className="text-right px-3 py-2 font-medium">Retención</th>
                <th className="text-right px-3 py-2 font-medium">Líquido</th>
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {boletas.map((b:any)=>(
                <tr key={b.id} className={b.estado==="anulada"?"opacity-40":""}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{b.folio||"S/N"}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800">{b.nombre_prestador}</p>
                    <p className="text-xs text-slate-400">{b.rut_prestador}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 text-xs">{new Date(b.fecha).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2.5 text-right">{clp(b.monto_bruto)}</td>
                  <td className="px-3 py-2.5 text-right text-red-600">{clp(b.monto_retencion)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-teal-700">{clp(b.monto_liquido)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${
                      b.estado==="pagada"?"bg-green-100 text-green-700":
                      b.estado==="anulada"?"bg-red-100 text-red-700":
                      "bg-amber-100 text-amber-700"}`}>
                      {b.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={()=>window.open(`/api/honorarios-boletas?empresa_id=${id}&id=${b.id}&formato=html`,"_blank")}
                      className="text-xs text-teal-700 hover:underline mr-2">PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {msg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  );
}
