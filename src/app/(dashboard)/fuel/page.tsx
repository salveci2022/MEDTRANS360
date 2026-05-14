"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Plus, Loader2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FUEL_TYPE_LABELS } from "@/types";
import { FuelForm } from "@/components/fuel/fuel-form";

interface FuelRecord {
  id: string;
  date: string;
  vehicle: { plate: string; model: string };
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelType: string;
  mileageAtFuel: number;
  station: string | null;
}

interface Summary {
  totalCost: number;
  totalLiters: number;
  avgPricePerLiter: number;
}

export default function FuelPage() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalCost: 0, totalLiters: 0, avgPricePerLiter: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchRecords() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    const res = await fetch(`/api/fuel?${params}`);
    const json = await res.json();
    setRecords(json.data ?? []);
    setTotal(json.total ?? 0);
    setTotalPages(json.totalPages ?? 1);
    setSummary(json.summary ?? { totalCost: 0, totalLiters: 0, avgPricePerLiter: 0 });
    setLoading(false);
  }

  useEffect(() => { fetchRecords(); }, [page]);

  return (
    <div>
      <Header
        title="Combustível"
        description="Controle de abastecimentos"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Registrar abastecimento
          </button>
        }
      />

      {showForm && <FuelForm onClose={() => { setShowForm(false); fetchRecords(); }} />}

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Custo total", value: formatCurrency(summary.totalCost) },
            { label: "Total abastecido", value: `${summary.totalLiters.toFixed(1)} L` },
            { label: "Preço médio/L", value: formatCurrency(summary.avgPricePerLiter) },
          ].map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4">
              <div className="text-sm text-gray-500">{s.label}</div>
              <div className="text-xl font-bold text-gray-900 mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Data</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Veículo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Combustível</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Litros</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">R$/L</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Total</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Km</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Posto</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum abastecimento registrado</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-600">{formatDate(r.date)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{r.vehicle.plate}</td>
                      <td className="px-5 py-3 text-gray-600">{FUEL_TYPE_LABELS[r.fuelType as keyof typeof FUEL_TYPE_LABELS]}</td>
                      <td className="px-5 py-3 text-gray-600">{r.liters.toFixed(2)} L</td>
                      <td className="px-5 py-3 text-gray-600">{formatCurrency(r.pricePerLiter)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{formatCurrency(r.totalCost)}</td>
                      <td className="px-5 py-3 text-gray-600">{r.mileageAtFuel.toFixed(0)} km</td>
                      <td className="px-5 py-3 text-gray-600">{r.station ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{total} registros</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Anterior</button>
              <span className="px-3 py-1">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
