"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const mesActual = new Date().toISOString().slice(0, 7);

export default function ReportesPage() {
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<any>(null);
  const [periodo, setPeriodo] = useState(mesActual);
  const [descargando, setDescargando] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/empresas/${id}`).then(r => r.json()).then(d => setEmpresa(d.empresa));
  }, [id]);

  function descargar(url: string, nombre: string, tipo: string) {
    setDescargando(tipo);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDescargando(null), 2000);
  }

  const reportes = [
    {
      categoria: "Remuneraciones",
      items: [
        {
          tipo: "excel_liquidaciones",
          titulo: "Liquidaciones del período — Excel",
          descripcion: "Detalle completo de haberes, descuentos y líquido de todos los trabajadores, más hoja de resumen.",
          formato: "xlsx",
          fn: () => descargar(
            `/api/reportes?empresa_id=${id}&tipo=excel_liquidaciones&periodo=${periodo}`,
            `liquidaciones_${periodo}.xlsx`, "excel_liquidaciones"
          ),
        },
      ],
    },
    {
      categoria: "F29 / IVA",
      items: [
        {
          tipo: "excel_f29",
          titulo: "F29 del período — Excel",
          descripcion: "Libro de compras y ventas del período más resumen del F29 (débito, crédito, IVA, PPM).",
          formato: "xlsx",
          fn: () => descargar(
            `/api/reportes?empresa_id=${id}&tipo=excel_f29&periodo=${periodo}`,
            `f29_${periodo}.xlsx`, "excel_f29"
          ),
        },
      ],
    },
    {
      categoria: "Contabilidad",
      items: [
        {
          tipo: "estado_resultados",
          titulo: "Estado de Resultados",
          descripcion: "Ingresos y gastos del período con utilidad o pérdida. Requiere vouchers contables ingresados.",
          formato: "pantalla",
          fn: () => window.open(`/empresas/${id}/contabilidad`, "_blank"),
        },
        {
          tipo: "balance_general",
          titulo: "Balance General",
          descripcion: "Activo, pasivo y patrimonio acumulado hasta el período seleccionado.",
          formato: "pantalla",
          fn: () => window.open(`/empresas/${id}/contabilidad`, "_blank"),
        },
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href={`/empresas/${id}`} className="text-sm text-teal-700 hover:underline">← {empresa?.razon_social}</Link>
      <h1 className="text-2xl font-semibold text-slate-900 mt-2">Reportes y Exportaciones</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <label className="text-sm font-medium text-slate-700 mr-3">Período</label>
        <input type="month" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      </div>

      {reportes.map((cat) => (
        <div key={cat.categoria}>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{cat.categoria}</h2>
          <div className="space-y-2">
            {cat.items.map((r) => (
              <div key={r.tipo} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{r.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.descripcion}</p>
                </div>
                <button
                  onClick={r.fn}
                  disabled={descargando === r.tipo}
                  className={`shrink-0 rounded-lg text-sm font-medium px-4 py-2 transition disabled:opacity-60 ${
                    r.formato === "xlsx"
                      ? "bg-green-700 text-white hover:bg-green-800"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {descargando === r.tipo
                    ? "Generando..."
                    : r.formato === "xlsx" ? "⬇ Excel" : "Ver →"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
