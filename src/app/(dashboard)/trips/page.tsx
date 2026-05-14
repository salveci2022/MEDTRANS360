"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { TRIP_STATUS_LABELS } from "@/types";
import type { TripWithRelations } from "@/types";

const STATUS_COLORS = {
  SCHEDULED:   "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<TripWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  async function fetchTrips() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);
    const res = await fetch(`/api/trips?${params}`);
    const json = await res.json();
    setTrips(json.data ?? []);
    setTotal(json.total ?? 0);
    setTotalPages(json.totalPages ?? 1);
    setLoading(false);
  }

  useEffect(() => { fetchTrips(); }, [page, status]);

  async function handleStatusChange(tripId: string, newStatus: string) {
    await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        ...(newStatus === "IN_PROGRESS" && { startedAt: new Date().toISOString() }),
        ...(newStatus === "COMPLETED" && { completedAt: new Date().toISOString() }),
      }),
    });
    fetchTrips();
  }

  return (
    <div>
      <Header
        title="Corridas"
        description={`${total} corridas registradas`}
        actions={
          <Link
            href="/trips/new"
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nova corrida
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Buscar por paciente, motorista..."
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">Todos os status</option>
            <option value="SCHEDULED">Agendadas</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="COMPLETED">Concluídas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Paciente</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Motorista</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Veículo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Origem → Destino</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Agendamento</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Custo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      Nenhuma corrida encontrada
                    </td>
                  </tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{trip.patient.name}</td>
                      <td className="px-5 py-3 text-gray-600">{trip.driver.name}</td>
                      <td className="px-5 py-3 text-gray-600">{trip.vehicle.plate}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                        {trip.origin.substring(0, 20)}… → {trip.destination.substring(0, 20)}…
                      </td>
                      <td className="px-5 py-3 text-gray-600">{formatDateTime(trip.scheduledAt)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {trip.totalCost ? formatCurrency(trip.totalCost) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status as keyof typeof STATUS_COLORS]}`}>
                          {TRIP_STATUS_LABELS[trip.status as keyof typeof TRIP_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          {trip.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleStatusChange(trip.id, "IN_PROGRESS")}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Iniciar
                            </button>
                          )}
                          {trip.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleStatusChange(trip.id, "COMPLETED")}
                              className="text-xs text-green-600 hover:underline"
                            >
                              Concluir
                            </button>
                          )}
                          <Link
                            href={`/trips/${trip.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Ver / Editar
                          </Link>
                        </div>
                      </td>
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
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
