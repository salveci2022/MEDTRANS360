"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import type { PatientWithClinic } from "@/types";
import { PatientForm } from "@/components/patients/patient-form";

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PatientWithClinic | null>(null);

  async function fetchPatients() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/patients?${params}`);
    const json = await res.json();
    setPatients(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchPatients(); }, [search]);

  async function handleDelete(id: string) {
    if (!confirm("Desativar paciente?")) return;
    await fetch(`/api/patients/${id}`, { method: "DELETE" });
    fetchPatients();
  }

  return (
    <div>
      <Header
        title="Pacientes"
        description={`${patients.length} pacientes`}
        actions={
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Novo paciente
          </button>
        }
      />

      {showForm && (
        <PatientForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); fetchPatients(); }}
        />
      )}

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Buscar por nome, CPF ou telefone..."
          />
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">CPF</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Telefone</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Clínica</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Endereço</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum paciente encontrado</td></tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3 text-gray-600">{p.cpf ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{p.phone ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{p.clinic?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{p.address ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
