"use client";
import { Car, Users, Navigation, DollarSign, UserCircle, Building2 } from "lucide-react";
import { formatCurrency, formatDistance } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Corridas hoje",
      value: stats.tripsToday,
      sub: `${stats.tripsInProgress} em andamento`,
      icon: Navigation,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total de corridas",
      value: stats.totalTrips,
      sub: "desde o início",
      icon: Navigation,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Motoristas ativos",
      value: stats.activeDrivers,
      sub: `${stats.totalDrivers} cadastrados`,
      icon: UserCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Veículos ativos",
      value: stats.activeVehicles,
      sub: `${stats.totalVehicles} no total`,
      icon: Car,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Pacientes",
      value: stats.totalPatients,
      sub: "cadastrados",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Custo mensal",
      value: formatCurrency(stats.totalCostMonth),
      sub: formatDistance(stats.totalDistanceMonth) + " percorridos",
      icon: DollarSign,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white border rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
