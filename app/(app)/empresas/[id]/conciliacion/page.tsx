"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function ConciliacionPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa]       = useState<any>(null);
  const [cuentas, setCuentas]       = useState<any[]>([]);
  const [cuentaSel, setCuentaSel]   = useState<string>("");
  const [periodo, setPeriodo]       = useState(mesActual);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [resumen, setResumen]       = useState<any>(null);
  const [showCuentaForm, setShowCuentaForm] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ banco: "", numero_cuenta: "", tipo: "corriente" });
  const [archivo, setArchivo]       = useState<File | null>(null);
  const [subiendo, setSubiendo]     = useState(false);
  const [msg, setMsg]               = useState("");
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  const cargar = useCallback(async () => {
    const [eRes, cRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/conciliacion?empresa_id=${id}&solo_cuentas=1`),
    ]);
    setEmpresa((await eRes.json()).empresa);
    setCuentas((await cRes.json()).cuentas || []);
  }, [id]);

  const cargarMovimientos = useCallback(async () => {
    if (!cuentaSel || !periodo) return;
    const res = await fetch(`/api/conciliacion?empresa_id=${id}&cuenta_id=${cuentaSel}&periodo=${periodo}`);
    const data = await res.json();
    setMovimientos(data.movimientos || []);
    setResumen({ totalCargos: data.totalCargos, totalAbonos: data.totalAbonos, conciliados: data.conciliados, pendientes: data.pendientes });
  }, [id, cuentaSel, periodo]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

  async function handleCrearCuenta(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoCuenta(true);
    await fetch("/api/conciliacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa_id: id, ...cuentaForm }),
    });
    setGuardandoCuenta(false);
    setShowCuentaForm(false);
    setCuentaForm({ banco: "", numero_cuenta: "", tipo: "corriente" });
    cargar();
  }

  async function handleImportar() {
    if (!archivo || !cuentaSel) return;
    setSubiendo(true); setMsg("");
    const fd = new FormData();
    fd.append("empresa_id", id);
    fd.append("cuenta_id", cuentaSel);
    fd.append("periodo", periodo);
    fd.append("archivo", archivo);
    const res = await fetch("/api/conciliacion", { method: "POST", body: fd });
    const data = await res.json();
    setSubiendo(false);
    setMsg(res.ok ? `✓ ${data.mensaje}` : `Error: ${data.error}`);
    setArchivo(null);
    if (res.ok) cargarMovimientos();
  }

  async function toggleConciliar(mov: any) {
    await fetch("/api/conciliacion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mov.id, conciliado: !mov.conciliado }),
    });
    cargarMovimientos();
  }

  const cuentaActual = cuentas.find(c => String(c.id) === cuentaSel);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Conciliación Bancaria</h1>

      {/* Cuentas bancarias */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Cuentas bancarias</h2>
          <button onClick={() => setShowCuentaForm(!showCuentaForm)}
            className="text-xs text-teal-700 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50">
            + Nueva cuenta
          </button>
        </div>

        {showCuentaForm && (
          <form onSubmit={handleCrearCuenta} className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Banco</label>
              <input required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={cuentaForm.banco} onChange={(e) => setCuentaForm({ ...cuentaForm, banco: e.target.value })}
                placeholder="BancoEstado, Santander..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">N° de cuenta</label>
              <input required className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={cuentaForm.numero_cuenta} onChange={(e) => setCuentaForm({ ...cuentaForm, numero_cuenta: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipo</label>
              <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={cuentaForm.tipo} onChange={(e) => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}>
                <option value="corriente">Corriente</option>
                <option value="ahorro">Ahorro</option>
                <option value="vista">Vista</option>
              </select>
            </div>
            <div className="col-span-3 flex gap-2">
              <button type="submit" disabled={guardandoCuenta}
                className="rounded-lg bg-teal-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60">
                {guardandoCuenta ? "Guardando..." : "Guardar cuenta"}
              </button>
              <button type="button" onClick={() => setShowCuentaForm(false)}
                className="rounded-lg border border-slate-300 text-slate-600 text-xs px-3 py-1.5">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 flex-wrap">
          {cuentas.map((c: any) => (
            <button key={c.id}
              onClick={() => setCuentaSel(String(c.id))}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                String(c.id) === cuentaSel
                  ? "bg-teal-700 text-white border-teal-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}>
              <p className="font-medium">{c.banco}</p>
              <p className="text-xs opacity-75">{c.tipo} · {c.numero_cuenta}</p>
            </button>
          ))}
          {cuentas.length === 0 && (
            <p className="text-sm text-slate-400">Agrega una cuenta bancaria para comenzar.</p>
          )}
        </div>
      </div>

      {cuentaSel && (
        <>
          {/* Controles período + importar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Período</label>
                <input type="month" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
              </div>
              <div className="text-sm text-slate-500">
                {cuentaActual ? `${cuentaActual.banco} · ${cuentaActual.tipo} ${cuentaActual.numero_cuenta}` : ""}
              </div>
            </div>

            <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
              <p className="text-sm font-semibold text-blue-900">📂 Importar cartola bancaria</p>
              <p className="text-xs text-blue-700">
                Descarga la cartola desde el portal de tu banco en formato CSV o Excel y súbela aquí.
                La app detecta automáticamente las columnas de fecha, descripción, cargos y abonos.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <label className={`rounded-lg border-2 border-dashed px-4 py-2 text-sm cursor-pointer transition ${
                  archivo ? "border-teal-400 bg-teal-50 text-teal-700" : "border-blue-300 text-blue-700 hover:border-blue-400"
                }`}>
                  {archivo ? `✓ ${archivo.name}` : "Seleccionar cartola (.csv o .xlsx)"}
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
                    onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
                </label>
                <button onClick={handleImportar} disabled={!archivo || subiendo}
                  className="rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2 hover:bg-blue-800 disabled:opacity-50">
                  {subiendo ? "Importando..." : "⬆ Importar"}
                </button>
              </div>
              {msg && <p className={`text-xs ${msg.startsWith("Error") ? "text-red-700" : "text-teal-700"}`}>{msg}</p>}
            </div>
          </div>

          {/* Resumen */}
          {resumen && movimientos.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Movimientos</p>
                <p className="font-bold text-slate-900 text-lg">{movimientos.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Total cargos</p>
                <p className="font-bold text-red-700">{clp(resumen.totalCargos)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Total abonos</p>
                <p className="font-bold text-teal-700">{clp(resumen.totalAbonos)}</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${
                resumen.pendientes === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              }`}>
                <p className="text-xs text-slate-400">Pendientes conciliación</p>
                <p className={`font-bold text-lg ${resumen.pendientes === 0 ? "text-green-700" : "text-amber-700"}`}>
                  {resumen.pendientes}
                </p>
              </div>
            </div>
          )}

          {/* Tabla movimientos */}
          {movimientos.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between text-sm">
                <span className="font-semibold text-slate-700">Movimientos — {periodo}</span>
                <span className="text-xs text-slate-400">
                  {resumen?.conciliados || 0} conciliados · {resumen?.pendientes || 0} pendientes
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-left px-4 py-2 font-medium">Fecha</th>
                      <th className="text-left px-3 py-2 font-medium">Descripción</th>
                      <th className="text-right px-3 py-2 font-medium">Cargo</th>
                      <th className="text-right px-3 py-2 font-medium">Abono</th>
                      <th className="text-right px-3 py-2 font-medium">Saldo</th>
                      <th className="text-center px-4 py-2 font-medium">Conciliado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {movimientos.map((m: any) => (
                      <tr key={m.id} className={m.conciliado ? "bg-green-50" : "hover:bg-slate-50"}>
                        <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(m.fecha).toLocaleDateString("es-CL")}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 max-w-xs">
                          <p className="truncate">{m.descripcion}</p>
                          {m.voucher_numero && (
                            <p className="text-xs text-teal-600">↳ Voucher N°{m.voucher_numero}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-red-600 font-medium">
                          {Number(m.cargo) > 0 ? clp(m.cargo) : ""}
                        </td>
                        <td className="px-3 py-2.5 text-right text-teal-700 font-medium">
                          {Number(m.abono) > 0 ? clp(m.abono) : ""}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500 text-xs">
                          {m.saldo ? clp(m.saldo) : ""}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => toggleConciliar(m)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              m.conciliado
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                            }`}>
                            {m.conciliado ? "✓ OK" : "Conciliar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {movimientos.length === 0 && !subiendo && (
            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              Sin movimientos para este período. Importa la cartola bancaria.
            </div>
          )}
        </>
      )}
    </div>
  );
}
