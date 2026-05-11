"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import type { Clinic } from "@/types";
import { ClinicForm } from "@/components/clinics/clinic-form";

type ClinicWithCount = Clinic & { _count: { patients: number; trips: number } };

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<ClinicWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);

  async function fetchClinics() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/clinics?${params}`);
    const json = await res.json();
    setClinics(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchClinics(); }, [search]);

  async function handleDelete(id: string) {
    if (!confirm("Desativar clínica?")) return;
    await fetch(`/api/clinics/${id}`, { method: "DELETE" });
    fetchClinics();
  }

  return (
    <div>
      <Header
        title="Clínicas"
        description={`${clinics.length} clínicas`}
        actions={
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Nova clínica
          </button>
        }
      />

      {showForm && (
        <ClinicForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); fetchClinics(); }}
        />
      )}

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Buscar por nome ou endereço..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : clinics.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">Nenhuma clínica encontrada</div>
          ) : (
            clinics.map((clinic) => (
              <div key={clinic.id} className="bg-white border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(clinic); setShowForm(true); }} className="text-gray-400 hover:text-gray-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(clinic.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-1">{clinic.address}</p>
                {clinic.phone && <p className="text-sm text-gray-500 mb-1">{clinic.phone}</p>}
                {clinic.email && <p className="text-sm text-gray-500 mb-3">{clinic.email}</p>}
                <div className="flex gap-4 pt-3 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{clinic._count.patients}</div>
                    <div className="text-xs text-gray-400">Pacientes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{clinic._count.trips}</div>
                    <div className="text-xs text-gray-400">Corridas</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
