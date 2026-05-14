"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TripsTrendProps {
  data: { date: string; count: number; cost: number }[];
}

export function TripsChart({ data }: TripsTrendProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "dd/MM", { locale: ptBR }),
  }));

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Corridas nos últimos 30 dias</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) =>
              name === "count" ? [value, "Corridas"] : [value, ""]
            }
          />
          <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} name="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostChart({ data }: TripsTrendProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "dd/MM", { locale: ptBR }),
  }));

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Custos nos últimos 30 dias (R$)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Custo"]}
          />
          <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
