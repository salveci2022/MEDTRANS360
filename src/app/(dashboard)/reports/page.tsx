"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Loader2, Download, Printer } from "lucide-react";
import { formatCurrency, formatDistance, formatDate, formatDateTime } from "@/lib/utils";
import { TRIP_STATUS_LABELS, FUEL_TYPE_LABELS } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#0f172a", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export default function ReportsPage() {
  const [tab, setTab] = useState<"trips" | "fuel">("trips");
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<unknown[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);

  function exportCSV() {
    if (data.length === 0) return;

    let csv = "";
    if (tab === "trips") {
      csv = "Paciente,Motorista,Veículo,Data,Distância (km),Custo (R$),Status\n";
      csv += trips.map((t) =>
        [t.patient.name, t.driver.name, t.vehicle.plate, formatDateTime(t.scheduledAt),
          t.distanceKm ?? "", t.totalCost ?? "",
          TRIP_STATUS_LABELS[t.status as keyof typeof TRIP_STATUS_LABELS] ?? t.status]
          .map((v) => `"${v}"`).join(",")
      ).join("\n");
    } else {
      csv = "Data,Veículo,Combustível,Litros,R$/L,Total (R$),Posto\n";
      csv += fuelRecords.map((r) =>
        [formatDate(r.date), r.vehicle.plate,
          FUEL_TYPE_LABELS[r.fuelType as keyof typeof FUEL_TYPE_LABELS] ?? r.fuelType,
          r.liters.toFixed(2), r.pricePerLiter.toFixed(2), r.totalCost.toFixed(2), r.station ?? ""]
          .map((v) => `"${v}"`).join(",")
      ).join("\n");
    }

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${tab}-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchReport() {
    setLoading(true);
    const params = new URLSearchParams({ type: tab, dateFrom, dateTo });
    const res = await fetch(`/api/reports?${params}`);
    const json = await res.json();
    setData(json.data ?? []);
    setSummary(json.summary ?? {});
    setLoading(false);
  }

  useEffect(() => { fetchReport(); }, [tab, dateFrom, dateTo]);

  const trips = data as {
    id: string; patient: { name: string }; driver: { name: string }; vehicle: { plate: string };
    scheduledAt: string; distanceKm: number | null; totalCost: number | null; status: string;
  }[];

  const fuelRecords = data as {
    id: string; vehicle: { plate: string }; date: string; liters: number;
    pricePerLiter: number; totalCost: number; fuelType: string; station: string | null;
  }[];

  const statusCounts = trips.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: TRIP_STATUS_LABELS[status as keyof typeof TRIP_STATUS_LABELS] ?? status,
    value: count,
  }));

  return (
    <div>
      <Header title="Relatórios" description="Análise de operações e custos" />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex border rounded-lg overflow-hidden">
            {(["trips", "fuel"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium ${tab === t ? "bg-slate-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {t === "trips" ? "Corridas" : "Combustível"}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">De:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <label className="text-sm text-gray-600">Até:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
        </div>

        {tab === "trips" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total de corridas", value: data.length },
                { label: "Custo total", value: formatCurrency(summary?._sum?.totalCost ?? 0) },
                { label: "Distância total", value: formatDistance(summary?._sum?.distanceKm ?? 0) },
              ].map((s) => (
                <div key={s.label} className="bg-white border rounded-xl p-4">
                  <div className="text-sm text-gray-500">{s.label}</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            {statusChartData.length > 0 && (
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Status das corridas</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Detalhamento de corridas</h3>
                <div className="flex gap-2">
                  <button
                    onClick={exportCSV}
                    disabled={data.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Paciente</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Motorista</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Veículo</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Distância</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Custo</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{t.patient.name}</td>
                          <td className="px-4 py-3 text-gray-600">{t.driver.name}</td>
                          <td className="px-4 py-3 text-gray-600">{t.vehicle.plate}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDateTime(t.scheduledAt)}</td>
                          <td className="px-4 py-3 text-gray-600">{t.distanceKm ? formatDistance(t.distanceKm) : "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{t.totalCost ? formatCurrency(t.totalCost) : "—"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{TRIP_STATUS_LABELS[t.status as keyof typeof TRIP_STATUS_LABELS]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "fuel" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Custo total", value: formatCurrency((summary as { totalCost?: number }).totalCost ?? 0) },
                { label: "Total abastecido", value: `${((summary as { totalLiters?: number }).totalLiters ?? 0).toFixed(1)} L` },
                { label: "Preço médio/L", value: formatCurrency((summary as { avgPricePerLiter?: number }).avgPricePerLiter ?? 0) },
              ].map((s) => (
                <div key={s.label} className="bg-white border rounded-xl p-4">
                  <div className="text-sm text-gray-500">{s.label}</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Detalhamento de abastecimentos</h3>
                <div className="flex gap-2">
                  <button
                    onClick={exportCSV}
                    disabled={data.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Data</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Veículo</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Combustível</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Litros</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">R$/L</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Total</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Posto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelRecords.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-gray-600">{formatDate(r.date)}</td>
                        <td className="px-4 py-3 font-medium">{r.vehicle.plate}</td>
                        <td className="px-4 py-3 text-gray-600">{FUEL_TYPE_LABELS[r.fuelType as keyof typeof FUEL_TYPE_LABELS]}</td>
                        <td className="px-4 py-3 text-gray-600">{r.liters.toFixed(2)} L</td>
                        <td className="px-4 py-3 text-gray-600">{formatCurrency(r.pricePerLiter)}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(r.totalCost)}</td>
                        <td className="px-4 py-3 text-gray-600">{r.station ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
