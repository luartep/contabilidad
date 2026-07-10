"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);

function calcularDiasHabilesRestantes(periodo: string): number {
  const [anio, mes] = periodo.split("-").map(Number);
  const mesV = mes === 12 ? 1 : mes + 1;
  const anioV = mes === 12 ? anio + 1 : anio;
  let diasHabiles = 0;
  let dia = 1;
  while (diasHabiles < 15) {
    const dow = new Date(anioV, mesV - 1, dia).getDay();
    if (dow !== 0 && dow !== 6) diasHabiles++;
    if (diasHabiles < 15) dia++;
  }
  const vencimiento = new Date(anioV, mesV - 1, dia);
  return Math.ceil((vencimiento.getTime() - Date.now()) / 86400000);
}

function clp(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v || 0));
}

export default function PreviredLREPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [periodo, setPeriodo] = useState(mesActual);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [eRes, lRes, hRes] = await Promise.all([
        fetch(`/api/empresas/${id}`),
        fetch(`/api/remuneraciones?empresa_id=${id}&periodo=${periodo}`),
        fetch(`/api/archivos?empresa_id=${id}&periodo=${periodo}`),
      ]);
      const eData = await eRes.json();
      const lData = await lRes.json();
      const hData = hRes.ok ? await hRes.json() : { archivos: [] };
      setEmpresa(eData.empresa || null);
      setLiquidaciones(lData.liquidaciones || []);
      setHistorial(hData.archivos || []);
    } catch (e) {
      setError("Error al cargar los datos. Revisa la conexión.");
    } finally {
      setCargando(false);
    }
  }, [id, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Descarga usando un <a> temporal para no navegar fuera de la página
  function descargar(url: string, nombre: string) {
    setMsg("");
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setMsg(`✓ ${nombre} descargado.`), 800);
  }

  function abrirPortal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const hayLiquidaciones = liquidaciones.length > 0;
  const totalTrabajadores = liquidaciones.filter((l: any) => l.tipo_contrato !== "honorarios").length;
  const obligaLRE = totalTrabajadores >= 5;
  const diasRestantesLRE = calcularDiasHabilesRestantes(periodo);

  const totalAfp = liquidaciones.reduce((s: number, l: any) => s + Number(l.afp_trabajador) + Number(l.afp_adicional), 0);
  const totalSalud = liquidaciones.reduce((s: number, l: any) => s + Number(l.salud_trabajador), 0);
  const totalCesantiaTrab = liquidaciones.reduce((s: number, l: any) => s + Number(l.cesantia_trabajador), 0);
  const totalCesantiaEmp = liquidaciones.reduce((s: number, l: any) => s + Number(l.cesantia_empleador), 0);
  const totalSIS = liquidaciones.reduce((s: number, l: any) => s + Number(l.sis_empleador), 0);
  const totalAcc = liquidaciones.reduce((s: number, l: any) => s + Number(l.accidente_empleador), 0);
  const totalPrevired = totalAfp + totalSalud + totalCesantiaTrab + totalCesantiaEmp + totalSIS + totalAcc;

  const periodoStr = periodo.replace("-", "");
  const rutLimpio = empresa?.rut?.replace(/[^0-9kK]/g, "") || "";

  // Desglose por AFP
  const porAfp: Record<string, { count: number; total: number }> = {};
  liquidaciones.forEach((l: any) => {
    const afp = l.afp_nombre || l.afp || "Sin AFP";
    if (!porAfp[afp]) porAfp[afp] = { count: 0, total: 0 };
    porAfp[afp].count++;
    porAfp[afp].total += Number(l.afp_trabajador) + Number(l.afp_adicional);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← {empresa?.razon_social || "Empresa"}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Previred y LRE</h1>

      {/* Selector período */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Período</label>
            <input
              type="month"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={periodo}
              onChange={(e) => { setPeriodo(e.target.value); setMsg(""); }}
            />
          </div>
          {cargando && <p className="text-sm text-slate-400">Cargando...</p>}
          {!cargando && !error && (
            <p className="text-sm text-slate-500">
              {totalTrabajadores} trabajador(es) con liquidación en este período
            </p>
          )}
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {!cargando && !hayLiquidaciones && !error && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠ No hay liquidaciones calculadas para este período.{" "}
            <Link href={`/empresas/${id}/remuneraciones`} className="underline font-medium">
              Ir a Remuneraciones
            </Link>{" "}
            para calcularlas primero.
          </div>
        )}
      </div>

      {hayLiquidaciones && !cargando && (
        <>
          {/* Resumen cotizaciones */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Resumen de cotizaciones a pagar en Previred</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">AFP trabajadores (10% + comisión)</span>
                <span className="font-medium">{clp(totalAfp)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Cesantía empleador</span>
                <span className="font-medium">{clp(totalCesantiaEmp)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Salud trabajadores</span>
                <span className="font-medium">{clp(totalSalud)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">SIS + Accidentes</span>
                <span className="font-medium">{clp(totalSIS + totalAcc)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500">Cesantía trabajadores</span>
                <span className="font-medium">{clp(totalCesantiaTrab)}</span>
              </div>
              <div className="flex justify-between bg-teal-50 rounded px-2 py-1.5 font-bold text-teal-800">
                <span>Total a pagar</span>
                <span>{clp(totalPrevired)}</span>
              </div>
            </div>

            {/* Desglose por AFP */}
            {Object.keys(porAfp).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Desglose por AFP</p>
                <div className="space-y-1">
                  {Object.entries(porAfp).map(([afp, data]) => (
                    <div key={afp} className="flex justify-between text-sm">
                      <span className="text-slate-700">{afp}</span>
                      <span className="text-slate-400">{data.count} trabajador(es)</span>
                      <span className="font-medium">{clp(data.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bloque Previred */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Previred</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Archivo TXT estándar 105 campos · Vencimiento: día 10 de cada mes (o siguiente hábil)
                </p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1 shrink-0">
                {totalTrabajadores} trabajador(es)
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => descargar(`/api/previred?empresa_id=${id}&periodo=${periodo}`, `previred_${rutLimpio}_${periodoStr}.txt`)}
                className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 transition"
              >
                ⬇ Descargar archivo Previred (.txt)
              </button>
              <button
                onClick={() => abrirPortal("https://www.previred.com")}
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
              >
                🔗 Abrir portal Previred
              </button>
            </div>

            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p>① Descarga el archivo TXT.</p>
              <p>② Ingresa al portal Previred con el RUT y clave de la empresa.</p>
              <p>③ Ve a <strong>Declaración y pago → Cargar archivo</strong> y sube el TXT.</p>
              <p>④ Revisa el resumen y confirma el pago.</p>
            </div>
          </div>

          {/* Bloque LRE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Libro de Remuneraciones Electrónico (LRE)</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {obligaLRE
                    ? `Obligatorio (${totalTrabajadores} trabajadores ≥ 5) · Vence en ${diasRestantesLRE > 0 ? `${diasRestantesLRE} días hábiles` : "¡hoy o vencido!"}`
                    : `Opcional (${totalTrabajadores} trabajadores < 5), pero se recomienda presentarlo igual.`}
                </p>
              </div>
              <span className={`text-xs rounded-full px-3 py-1 shrink-0 ${
                obligaLRE
                  ? diasRestantesLRE <= 3 ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {obligaLRE ? (diasRestantesLRE <= 0 ? "VENCIDO" : `${diasRestantesLRE}d hábiles`) : "Opcional"}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => descargar(`/api/lre?empresa_id=${id}&periodo=${periodo}`, `lre_${rutLimpio}_${periodoStr}.csv`)}
                className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 transition"
              >
                ⬇ Descargar archivo LRE (.csv)
              </button>
              <button
                onClick={() => abrirPortal("https://www.dt.gob.cl/portal/1626/w3-propertyvalue-22400.html")}
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
              >
                🔗 Abrir portal Mi DT
              </button>
            </div>

            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p>① Descarga el archivo CSV.</p>
              <p>② Entra al portal Mi DT con tu Clave Única.</p>
              <p>③ Ve a <strong>Libro de Remuneraciones Electrónico → Cargar archivo</strong>.</p>
              <p>④ Sube el CSV y confirma la declaración.</p>
              <p>⑤ Plazo: primeros <strong>15 días hábiles</strong> del mes siguiente.</p>
            </div>
          </div>

          {/* Tabla trabajadores incluidos */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Trabajadores incluidos en los archivos</h2>
            <div className="divide-y divide-slate-100">
              {liquidaciones.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{l.nombres} {l.apellidos}</span>
                    <span className="text-slate-400 ml-2 text-xs">{l.rut}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>AFP: {l.afp_nombre || l.afp || "—"}</span>
                    <span>{l.sistema_salud === "isapre" ? "Isapre" : "Fonasa"}</span>
                    <span className="font-medium text-slate-700">{clp(l.liquido_a_pagar)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Archivos generados este período</h2>
          <div className="divide-y divide-slate-100">
            {historial.map((h: any) => (
              <div key={h.id} className="flex justify-between py-2 text-xs">
                <span className="font-semibold text-slate-700 uppercase w-20">{h.tipo}</span>
                <span className="text-slate-500 flex-1">{h.nombre_archivo}</span>
                <span className="text-slate-400">{new Date(h.generado_en).toLocaleString("es-CL")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700">
          {msg}
        </div>
      )}
    </div>
  );
}
