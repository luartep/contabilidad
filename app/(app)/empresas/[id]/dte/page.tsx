"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0,7);
function clp(v:number){return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(Math.round(v||0));}

const TIPOS_DTE = [
  {value:33,label:"Factura Afecta"},
  {value:34,label:"Factura Exenta"},
  {value:39,label:"Boleta Afecta"},
  {value:41,label:"Boleta Exenta"},
  {value:56,label:"Nota de Débito"},
  {value:61,label:"Nota de Crédito"},
  {value:52,label:"Guía de Despacho"},
  {value:110,label:"Factura Exportación"},
];

export default function DTEPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [folios, setFolios] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState(mesActual);
  const [showFolioForm, setShowFolioForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const [folioForm, setFolioForm] = useState({tipo_dte:"33",folio_desde:"",folio_hasta:"",vencimiento:""});
  const [docForm, setDocForm] = useState({
    tipo_dte:"33",folio:"",fecha:new Date().toISOString().slice(0,10),
    rut_receptor:"",razon_social_receptor:"",
    monto_neto:"",monto_iva:"",monto_exento:"",
  });

  const cargar = useCallback(async () => {
    const [eRes, dRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/dte?empresa_id=${id}&periodo=${periodo}`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    const dData = await dRes.json();
    setFolios(dData.folios||[]);
    setDocumentos(dData.documentos||[]);
    setResumen(dData.resumen||[]);
  }, [id, periodo]);

  useEffect(()=>{cargar();},[cargar]);

  async function handleFolio(e:React.FormEvent){
    e.preventDefault(); setGuardando(true);
    await fetch("/api/dte",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({accion:"crear_folio",empresa_id:id,...folioForm}),
    });
    setGuardando(false); setShowFolioForm(false);
    setMsg("✓ Folios configurados"); cargar();
  }

  async function handleDoc(e:React.FormEvent){
    e.preventDefault(); setGuardando(true);
    const neto = Number(docForm.monto_neto)||0;
    const esAfecta = [33,39,56,110].includes(Number(docForm.tipo_dte));
    const iva = docForm.monto_iva ? Number(docForm.monto_iva) : (esAfecta ? Math.round(neto*0.19) : 0);
    const exento = Number(docForm.monto_exento)||0;
    await fetch("/api/dte",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({empresa_id:id,periodo,...docForm,monto_iva:iva,monto_exento:exento}),
    });
    setGuardando(false); setShowDocForm(false);
    setDocForm({tipo_dte:"33",folio:"",fecha:new Date().toISOString().slice(0,10),
      rut_receptor:"",razon_social_receptor:"",monto_neto:"",monto_iva:"",monto_exento:""});
    setMsg("✓ Documento registrado"); cargar();
  }

  async function anularDoc(docId:number){
    if(!confirm("¿Anular este documento?")) return;
    await fetch("/api/dte",{method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:docId,estado:"anulado"})});
    cargar();
  }

  const folioLabel = (f:any) => TIPOS_DTE.find(t=>t.value===Number(f.tipo_dte))?.label || `DTE ${f.tipo_dte}`;
  const foliosPorUsar = folios.filter(f=>Number(f.folio_actual)<=Number(f.folio_hasta));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Documentos Tributarios Electrónicos (DTE)</h1>

      {/* Folios */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Rangos de folios</h2>
          <button onClick={()=>setShowFolioForm(!showFolioForm)}
            className="text-xs text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">
            + Configurar folios
          </button>
        </div>

        {showFolioForm && (
          <form onSubmit={handleFolio} className="grid grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo DTE</label>
              <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={folioForm.tipo_dte} onChange={e=>setFolioForm({...folioForm,tipo_dte:e.target.value})}>
                {TIPOS_DTE.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Folio desde</label>
              <input type="number" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={folioForm.folio_desde} onChange={e=>setFolioForm({...folioForm,folio_desde:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Folio hasta</label>
              <input type="number" required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={folioForm.folio_hasta} onChange={e=>setFolioForm({...folioForm,folio_hasta:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Vencimiento</label>
              <input type="date" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={folioForm.vencimiento} onChange={e=>setFolioForm({...folioForm,vencimiento:e.target.value})} />
            </div>
            <div className="col-span-4 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60">
                {guardando?"Guardando...":"Guardar"}
              </button>
              <button type="button" onClick={()=>setShowFolioForm(false)}
                className="rounded-lg border border-slate-300 text-slate-600 text-xs px-3 py-1.5">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-3 flex-wrap">
          {folios.map((f:any)=>{
            const pct = Math.round(((Number(f.folio_actual)-Number(f.folio_desde))/(Number(f.folio_hasta)-Number(f.folio_desde)+1))*100);
            const agotando = pct >= 80;
            return (
              <div key={f.id} className={`border rounded-xl p-3 min-w-40 ${agotando?"border-amber-300 bg-amber-50":"border-slate-200 bg-white"}`}>
                <p className="text-xs font-semibold text-slate-700">{folioLabel(f)}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">N°{f.folio_actual}</p>
                <p className="text-xs text-slate-400">Hasta {f.folio_hasta}</p>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
                  <div className={`h-full rounded-full ${agotando?"bg-amber-500":"bg-teal-600"}`} style={{width:`${pct}%`}} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{pct}% usado</p>
                {f.vencimiento && <p className="text-xs text-slate-400">Vence: {new Date(f.vencimiento).toLocaleDateString("es-CL")}</p>}
              </div>
            );
          })}
          {folios.length===0 && <p className="text-sm text-slate-400">Sin folios configurados.</p>}
        </div>
      </div>

      {/* Resumen del período */}
      {resumen.length>0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Resumen por tipo — {periodo}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {resumen.map((r:any)=>(
              <div key={r.tipo_dte} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">{r.tipo_nombre}</p>
                <p className="font-bold text-slate-900">{r.cantidad} doc.</p>
                <p className="text-xs text-teal-700 font-medium">{clp(r.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nuevo documento */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="text-sm font-medium text-slate-700 mr-2">Período</label>
          <input type="month" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={periodo} onChange={e=>setPeriodo(e.target.value)} />
        </div>
        <button onClick={()=>setShowDocForm(!showDocForm)}
          className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800">
          + Registrar documento DTE
        </button>
      </div>

      {showDocForm && (
        <form onSubmit={handleDoc} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo DTE</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.tipo_dte} onChange={e=>setDocForm({...docForm,tipo_dte:e.target.value})}>
                {TIPOS_DTE.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Folio (vacío = auto)</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.folio} onChange={e=>setDocForm({...docForm,folio:e.target.value})} placeholder="Auto" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha</label>
              <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.fecha} onChange={e=>setDocForm({...docForm,fecha:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">RUT receptor</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.rut_receptor} onChange={e=>setDocForm({...docForm,rut_receptor:e.target.value})} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-slate-600">Razón social receptor</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.razon_social_receptor} onChange={e=>setDocForm({...docForm,razon_social_receptor:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Monto neto ($)</label>
              <input type="number" min="0" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.monto_neto} onChange={e=>setDocForm({...docForm,monto_neto:e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">IVA (19% auto si vacío)</label>
              <input type="number" min="0" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={docForm.monto_iva} onChange={e=>setDocForm({...docForm,monto_iva:e.target.value})} placeholder="Auto" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2 hover:bg-teal-800 disabled:opacity-60">
              {guardando?"Guardando...":"Registrar documento"}
            </button>
            <button type="button" onClick={()=>setShowDocForm(false)}
              className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista documentos */}
      {documentos.length>0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-4 py-2 font-medium">Tipo</th>
                <th className="text-left px-3 py-2 font-medium">Folio</th>
                <th className="text-left px-3 py-2 font-medium">Receptor</th>
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-right px-3 py-2 font-medium">Neto</th>
                <th className="text-right px-3 py-2 font-medium">IVA</th>
                <th className="text-right px-3 py-2 font-medium">Total</th>
                <th className="text-center px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {documentos.map((d:any)=>(
                <tr key={d.id} className={d.estado==="anulado"?"opacity-40 line-through":""}>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="bg-slate-100 rounded px-2 py-0.5">{d.tipo_nombre}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{d.folio}</td>
                  <td className="px-3 py-2.5 max-w-32 truncate">
                    <p className="text-slate-700 truncate">{d.razon_social_receptor||"—"}</p>
                    <p className="text-xs text-slate-400">{d.rut_receptor}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{new Date(d.fecha).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2.5 text-right">{clp(d.monto_neto)}</td>
                  <td className="px-3 py-2.5 text-right">{clp(d.monto_iva)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{clp(d.monto_total)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs rounded-full px-2 py-0.5 ${d.estado==="anulado"?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>
                      {d.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {d.estado!=="anulado" && (
                      <button onClick={()=>anularDoc(d.id)} className="text-xs text-red-400 hover:text-red-700">Anular</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {msg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  );
}
