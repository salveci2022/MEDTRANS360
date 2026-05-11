"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Plus, Search, Loader2, Pencil, Ban, CheckCircle } from "lucide-react";
import { DRIVER_STATUS_LABELS } from "@/types";
import type { DriverWithRelations } from "@/types";
import { formatDate } from "@/lib/utils";
import { DriverForm } from "@/components/drivers/driver-form";

const STATUS_COLORS = {
  ACTIVE:    "bg-green-100 text-green-700",
  INACTIVE:  "bg-gray-100 text-gray-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DriverWithRelations | null>(null);

  async function fetchDrivers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/drivers?${params}`);
    const json = await res.json();
    setDrivers(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchDrivers(); }, [search]);

  async function handleDeactivate(id: string) {
    if (!confirm("Desativar motorista?")) return;
    await fetch(`/api/drivers/${id}`, { method: "DELETE" });
    fetchDrivers();
  }

  return (
    <div>
      <Header
        title="Motoristas"
        description={`${drivers.length} motoristas`}
        actions={
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Novo motorista
          </button>
        }
      />

      {showForm && (
        <DriverForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); fetchDrivers(); }}
        />
      )}

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Buscar por nome ou CPF..."
          />
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
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">CPF</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Telefone</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">CNH</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Validade CNH</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Veículo</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">Nenhum motorista encontrado</td>
                  </tr>
                ) : (
                  drivers.map((driver) => (
                    <tr key={driver.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{driver.name}</td>
                      <td className="px-5 py-3 text-gray-600">{driver.cpf}</td>
                      <td className="px-5 py-3 text-gray-600">{driver.phone}</td>
                      <td className="px-5 py-3 text-gray-600">{driver.licenseNumber}</td>
                      <td className="px-5 py-3 text-gray-600">{formatDate(driver.licenseExpiry)}</td>
                      <td className="px-5 py-3 text-gray-600">{driver.vehicle?.plate ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[driver.status as keyof typeof STATUS_COLORS]}`}>
                          {DRIVER_STATUS_LABELS[driver.status as keyof typeof DRIVER_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditing(driver); setShowForm(true); }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {driver.status === "ACTIVE" && (
                            <button
                              onClick={() => handleDeactivate(driver.id)}
                              className="text-gray-400 hover:text-red-600"
                              title="Desativar"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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
