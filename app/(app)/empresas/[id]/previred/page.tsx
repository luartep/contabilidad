"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { calcularDiasHabilesRestantes } from "@/lib/generadorLRE";

const mesActual = new Date().toISOString().slice(0, 7);

export default function PreviredLREPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [periodo, setPeriodo] = useState(mesActual);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState("");
  const [historial, setHistorial] = useState<any[]>([]);

  const diasRestantesLRE = calcularDiasHabilesRestantes(periodo);
  const totalTrabajadores = liquidaciones.filter(
    (l: any) => l.tipo_contrato !== "honorarios"
  ).length;
  const obligaLRE = totalTrabajadores >= 5;

  const cargar = useCallback(async () => {
    setCargando(true);
    const [eRes, lRes, tRes, hRes] = await Promise.all([
      fetch(`/api/empresas/${id}`),
      fetch(`/api/remuneraciones?empresa_id=${id}&periodo=${periodo}`),
      fetch(`/api/trabajadores?empresa_id=${id}`),
      fetch(`/api/archivos?empresa_id=${id}&periodo=${periodo}`),
    ]);
    const [eData, lData, tData, hData] = await Promise.all([
      eRes.json(), lRes.json(), tRes.json(), hRes.json(),
    ]);
    setEmpresa(eData.empresa);
    setLiquidaciones(lData.liquidaciones || []);
    setTrabajadores(tData.trabajadores || []);
    setHistorial(hData.archivos || []);
    setCargando(false);
  }, [id, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  function descargarPrevired() {
    setMsg("");
    window.location.href = `/api/previred?empresa_id=${id}&periodo=${periodo}`;
    setTimeout(() => setMsg("✓ Archivo Previred descargado. Ábrelo en Previred con el botón de abajo."), 1500);
  }

  function descargarLRE() {
    setMsg("");
    window.location.href = `/api/lre?empresa_id=${id}&periodo=${periodo}`;
    setTimeout(() => setMsg("✓ Archivo LRE descargado. Súbelo en el portal Mi DT con el botón de abajo."), 1500);
  }

  const hayLiquidaciones = liquidaciones.length > 0;
  const clp = (v: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Math.round(v));

  const totalLiquido = liquidaciones.reduce((s: number, l: any) => s + Number(l.liquido_a_pagar), 0);
  const totalCesantiaEmp = liquidaciones.reduce((s: number, l: any) => s + Number(l.cesantia_empleador), 0);
  const totalSIS = liquidaciones.reduce((s: number, l: any) => s + Number(l.sis_empleador), 0);
  const totalAccidentes = liquidaciones.reduce((s: number, l: any) => s + Number(l.accidente_empleador), 0);
  const totalPagarPrevired = liquidaciones.reduce((s: number, l: any) =>
    s + Number(l.afp_trabajador) + Number(l.afp_adicional) +
    Number(l.salud_trabajador) + Number(l.cesantia_trabajador) +
    Number(l.cesantia_empleador) + Number(l.sis_empleador) + Number(l.accidente_empleador), 0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">
        ← {empresa?.razon_social || "Empresa"}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Previred y LRE</h1>

      {/* Selector de período */}
      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Período</label>
            <input
              type="month"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={periodo}
              onChange={(e) => { setPeriodo(e.target.value); setMsg(""); }}
            />
          </div>
          <div className="text-sm text-slate-500">
            {cargando ? "Cargando..." : `${totalTrabajadores} trabajador(es) con liquidación`}
          </div>
        </div>

        {!hayLiquidaciones && !cargando && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠ No hay liquidaciones calculadas para este período.{" "}
            <Link href={`/empresas/${id}/remuneraciones`} className="underline font-medium">
              Ir a Remuneraciones
            </Link>{" "}
            para calcularlas primero.
          </div>
        )}
      </div>

      {hayLiquidaciones && (
        <>
          {/* Resumen de pago Previred */}
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Resumen de cotizaciones a pagar</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Cotizaciones AFP (trabajadores)</span>
                  <span className="font-medium">{clp(liquidaciones.reduce((s: number, l: any) => s + Number(l.afp_trabajador) + Number(l.afp_adicional), 0))}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Cotizaciones Salud</span>
                  <span className="font-medium">{clp(liquidaciones.reduce((s: number, l: any) => s + Number(l.salud_trabajador), 0))}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Cesantía trabajadores</span>
                  <span className="font-medium">{clp(liquidaciones.reduce((s: number, l: any) => s + Number(l.cesantia_trabajador), 0))}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Cesantía empleador</span>
                  <span className="font-medium">{clp(totalCesantiaEmp)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">SIS + Accidentes</span>
                  <span className="font-medium">{clp(totalSIS + totalAccidentes)}</span>
                </div>
                <div className="flex justify-between bg-teal-50 rounded px-2 py-1 font-semibold text-teal-800">
                  <span>Total a pagar en Previred</span>
                  <span>{clp(totalPagarPrevired)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque Previred */}
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Previred</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Genera el archivo TXT estándar de 105 campos y súbelo en el portal Previred.
                  Vencimiento: día 10 de cada mes (o siguiente hábil).
                </p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-3 py-1">
                {totalTrabajadores} trabajador(es)
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={descargarPrevired}
                className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 transition"
              >
                ⬇ Descargar archivo Previred (.txt)
              </button>
              <a
                href="https://www.previred.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
              >
                🔗 Abrir portal Previred
              </a>
            </div>

            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p>① Descarga el archivo TXT con el botón de arriba.</p>
              <p>② Abre el portal Previred e ingresa con el RUT y clave de la empresa.</p>
              <p>③ Ve a <strong>Declaración y pago → Cargar archivo</strong> y sube el TXT descargado.</p>
              <p>④ Revisa el resumen de cotizaciones y confirma el pago.</p>
            </div>
          </div>

          {/* Desglose por AFP */}
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Desglose por AFP</h2>
            {(() => {
              const porAfp: Record<string, { count: number; cotiz: number; adicional: number }> = {};
              liquidaciones.forEach((l: any) => {
                const afp = l.afp_nombre || l.afp || "Sin AFP";
                if (!porAfp[afp]) porAfp[afp] = { count: 0, cotiz: 0, adicional: 0 };
                porAfp[afp].count++;
                porAfp[afp].cotiz += Number(l.afp_trabajador);
                porAfp[afp].adicional += Number(l.afp_adicional);
              });
              return (
                <div className="divide-y divide-slate-100">
                  {Object.entries(porAfp).map(([afp, data]) => (
                    <div key={afp} className="flex justify-between py-2 text-sm">
                      <span className="text-slate-700 font-medium">{afp}</span>
                      <span className="text-slate-500">{data.count} trabajador(es)</span>
                      <span className="font-medium">{clp(data.cotiz + data.adicional)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Bloque LRE */}
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Libro de Remuneraciones Electrónico (LRE)
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {obligaLRE
                    ? `Obligatorio (${totalTrabajadores} trabajadores ≥ 5). Vence en ${diasRestantesLRE > 0 ? `${diasRestantesLRE} días hábiles` : "¡hoy o ya venció!"}.`
                    : `Opcional (${totalTrabajadores} trabajadores < 5), pero recomendado presentarlo igual.`}
                </p>
              </div>
              <span
                className={`text-xs rounded-full px-3 py-1 ${
                  obligaLRE
                    ? diasRestantesLRE <= 3
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-50 text-amber-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {obligaLRE ? (diasRestantesLRE <= 0 ? "VENCIDO" : `${diasRestantesLRE}d hábiles`) : "Opcional"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={descargarLRE}
                className="rounded-lg bg-teal-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-teal-800 transition"
              >
                ⬇ Descargar archivo LRE (.csv)
              </button>
              <a
                href="https://www.dt.gob.cl/portal/1626/w3-propertyvalue-22400.html"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 transition"
              >
                🔗 Abrir portal Mi DT
              </a>
            </div>

            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
              <p>① Descarga el archivo CSV con el botón de arriba.</p>
              <p>② Entra al portal Mi DT con tu Clave Única.</p>
              <p>③ Ve a <strong>Libro de Remuneraciones Electrónico → Cargar archivo</strong>.</p>
              <p>④ Sube el CSV y confirma la declaración.</p>
              <p>⑤ Plazo: primeros <strong>15 días hábiles</strong> del mes siguiente.</p>
            </div>
          </div>

          {/* Tabla de trabajadores incluidos */}
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Trabajadores incluidos en los archivos
            </h2>
            <div className="divide-y divide-slate-100">
              {liquidaciones.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{l.nombres} {l.apellidos}</span>
                    <span className="text-slate-400 ml-2 text-xs">{l.rut}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>AFP: {l.afp_nombre || l.afp || "—"}</span>
                    <span>Salud: {l.sistema_salud === "isapre" ? "Isapre" : "Fonasa"}</span>
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
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Archivos generados este período</h2>
          <div className="divide-y divide-slate-100">
            {historial.map((h: any) => (
              <div key={h.id} className="flex justify-between py-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700 uppercase">{h.tipo}</span>
                <span>{h.nombre_archivo}</span>
                <span>{new Date(h.generado_en).toLocaleString("es-CL")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && (
        <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700">
          {msg}
        </div>
      )}
    </div>
  );
}
