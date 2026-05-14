"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Plus, Search, Loader2, Pencil } from "lucide-react";
import { VEHICLE_STATUS_LABELS, FUEL_TYPE_LABELS } from "@/types";
import type { VehicleWithDriver } from "@/types";
import { formatDistance } from "@/lib/utils";
import { VehicleForm } from "@/components/vehicles/vehicle-form";

const STATUS_COLORS = {
  ACTIVE:      "bg-green-100 text-green-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  INACTIVE:    "bg-gray-100 text-gray-700",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VehicleWithDriver | null>(null);

  async function fetchVehicles() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/vehicles?${params}`);
    const json = await res.json();
    setVehicles(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchVehicles(); }, [search, status]);

  return (
    <div>
      <Header
        title="Veículos"
        description={`${vehicles.length} veículos`}
        actions={
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </button>
        }
      />

      {showForm && (
        <VehicleForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); fetchVehicles(); }}
        />
      )}

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Buscar por placa ou modelo..."
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="MAINTENANCE">Manutenção</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Placa</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Veículo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ano</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Combustível</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Km atual</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Motorista</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum veículo encontrado</td></tr>
                ) : (
                  vehicles.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">{v.plate}</td>
                      <td className="px-5 py-3 text-gray-900">{v.brand} {v.model}</td>
                      <td className="px-5 py-3 text-gray-600">{v.year}</td>
                      <td className="px-5 py-3 text-gray-600">{FUEL_TYPE_LABELS[v.fuelType as keyof typeof FUEL_TYPE_LABELS]}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDistance(v.currentMileage)}</td>
                      <td className="px-5 py-3 text-gray-600">{v.driver?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[v.status as keyof typeof STATUS_COLORS]}`}>
                          {VEHICLE_STATUS_LABELS[v.status as keyof typeof VEHICLE_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => { setEditing(v); setShowForm(true); }} className="text-gray-400 hover:text-gray-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
