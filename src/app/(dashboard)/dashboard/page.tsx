"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TripsChart, CostChart } from "@/components/dashboard/trips-chart";
import type { DashboardStats, TripWithRelations } from "@/types";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { TRIP_STATUS_LABELS } from "@/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS = {
  SCHEDULED:   "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTrips, setRecentTrips] = useState<TripWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports?type=dashboard").then((r) => r.json()),
      fetch("/api/trips?pageSize=5").then((r) => r.json()),
    ]).then(([statsData, tripsData]) => {
      setStats(statsData);
      setRecentTrips(tripsData.data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" description="Visão geral da operação" />
      <div className="p-6 space-y-6">
        {stats && <StatsCards stats={stats} />}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TripsChart data={stats.tripsTrend} />
            <CostChart data={stats.tripsTrend} />
          </div>
        )}

        <div className="bg-white border rounded-xl">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Corridas recentes</h3>
            <Link href="/trips" className="text-sm text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Paciente</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Motorista</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Agendamento</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Custo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      Nenhuma corrida encontrada
                    </td>
                  </tr>
                ) : (
                  recentTrips.map((trip) => (
                    <tr key={trip.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{trip.patient.name}</td>
                      <td className="px-5 py-3 text-gray-600">{trip.driver.name}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDateTime(trip.scheduledAt)}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {trip.totalCost ? formatCurrency(trip.totalCost) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status as keyof typeof STATUS_COLORS]}`}>
                          {TRIP_STATUS_LABELS[trip.status as keyof typeof TRIP_STATUS_LABELS]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
