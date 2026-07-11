"use client";

import { useState } from "react";

interface Props {
  empresaId: string;
  periodo: string;
  onImportado: () => void;
}

export default function ImportadorRCV({ empresaId, periodo, onImportado }: Props) {
  const [tipoActivo, setTipoActivo] = useState<"venta" | "compra">("venta");
  const [archivosVenta, setArchivosVenta] = useState<File | null>(null);
  const [archivosCompra, setArchivosCompra] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [resultados, setResultados] = useState<{ tipo: string; msg: string; ok: boolean }[]>([]);

  async function subirArchivo(archivo: File, tipo: "venta" | "compra") {
    const fd = new FormData();
    fd.append("empresa_id", empresaId);
    fd.append("periodo", periodo);
    fd.append("tipo", tipo);
    fd.append("archivo", archivo);

    const res = await fetch("/api/f29/importar", { method: "POST", body: fd });
    const data = await res.json();
    return { tipo, msg: data.mensaje || data.error || "Error desconocido", ok: res.ok };
  }

  async function handleImportar() {
    if (!archivosVenta && !archivosCompra) return;
    setSubiendo(true);
    setResultados([]);

    const promesas: Promise<{ tipo: string; msg: string; ok: boolean }>[] = [];
    if (archivosVenta) promesas.push(subirArchivo(archivosVenta, "venta"));
    if (archivosCompra) promesas.push(subirArchivo(archivosCompra, "compra"));

    const res = await Promise.all(promesas);
    setResultados(res);
    setSubiendo(false);

    if (res.some((r) => r.ok)) {
      setArchivosVenta(null);
      setArchivosCompra(null);
      onImportado();
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-blue-900">
          📂 Importar desde el Registro de Compras y Ventas (SII)
        </h3>
        <p className="text-xs text-blue-700 mt-1">
          Exporta el RCV desde <strong>sii.cl → Registro de Compras y Ventas → Consultar</strong>,
          descarga los archivos de ventas y compras por separado (CSV o Excel) y súbelos aquí.
          La importación reemplaza los documentos previos del tipo seleccionado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Ventas */}
        <label className={`flex flex-col gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition
          ${archivosVenta ? "border-teal-400 bg-teal-50" : "border-blue-300 hover:border-blue-400 bg-white"}`}>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            📄 Libro de Ventas
          </span>
          {archivosVenta ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-teal-700 font-medium truncate max-w-[160px]">
                ✓ {archivosVenta.name}
              </span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setArchivosVenta(null); }}
                className="text-xs text-red-400 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Haz clic para seleccionar el archivo de ventas (.csv o .xlsx)
            </span>
          )}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => setArchivosVenta(e.target.files?.[0] || null)}
          />
        </label>

        {/* Compras */}
        <label className={`flex flex-col gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition
          ${archivosCompra ? "border-teal-400 bg-teal-50" : "border-blue-300 hover:border-blue-400 bg-white"}`}>
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            📄 Libro de Compras
          </span>
          {archivosCompra ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-teal-700 font-medium truncate max-w-[160px]">
                ✓ {archivosCompra.name}
              </span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setArchivosCompra(null); }}
                className="text-xs text-red-400 hover:text-red-700 ml-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Haz clic para seleccionar el archivo de compras (.csv o .xlsx)
            </span>
          )}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => setArchivosCompra(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      <button
        onClick={handleImportar}
        disabled={subiendo || (!archivosVenta && !archivosCompra)}
        className="rounded-lg bg-blue-700 text-white text-sm font-medium px-5 py-2.5 hover:bg-blue-800 transition disabled:opacity-50"
      >
        {subiendo ? "Importando..." : "⬆ Importar archivos seleccionados"}
      </button>

      {resultados.length > 0 && (
        <div className="space-y-1">
          {resultados.map((r, i) => (
            <div key={i} className={`text-xs rounded-lg px-3 py-2 ${r.ok ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              <span className="font-medium capitalize">{r.tipo === "venta" ? "Ventas" : "Compras"}:</span> {r.msg}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-blue-600 bg-white rounded-lg px-3 py-2 border border-blue-100 space-y-1">
        <p className="font-medium">¿Cómo exportar el RCV desde el SII?</p>
        <p>① Entra a <strong>sii.cl → Servicios online → Factura electrónica → Registro de Compras y Ventas</strong></p>
        <p>② Selecciona el período y haz clic en <strong>Consultar</strong></p>
        <p>③ En la pestaña <strong>Ventas</strong>, presiona <strong>Descargar</strong> (CSV o Excel)</p>
        <p>④ Repite en la pestaña <strong>Compras</strong></p>
        <p>⑤ Sube ambos archivos aquí</p>
      </div>
    </div>
  );
}
