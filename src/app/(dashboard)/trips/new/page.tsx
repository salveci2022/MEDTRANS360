"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { tripSchema, type TripInput } from "@/lib/validations";
import { Loader2 } from "lucide-react";
import type { Driver, Vehicle, Patient, Clinic } from "@/types";

export default function NewTripPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TripInput>({
    resolver: zodResolver(tripSchema),
    defaultValues: { costPerKm: Number(process.env.NEXT_PUBLIC_COST_PER_KM ?? 2.5) },
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers?status=ACTIVE").then((r) => r.json()),
      fetch("/api/vehicles?status=ACTIVE").then((r) => r.json()),
      fetch("/api/patients").then((r) => r.json()),
      fetch("/api/clinics").then((r) => r.json()),
    ]).then(([d, v, p, c]) => {
      setDrivers(d.data ?? []);
      setVehicles(v.data ?? []);
      setPatients(p.data ?? []);
      setClinics(c.data ?? []);
    });
  }, []);

  async function onSubmit(data: TripInput) {
    setError("");
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    router.push("/trips");
  }

  const distanceKm = watch("distanceKm");
  const costPerKm = watch("costPerKm");
  const totalCost = distanceKm && costPerKm ? (distanceKm * costPerKm).toFixed(2) : null;

  return (
    <div>
      <Header title="Nova corrida" description="Agendar transporte de paciente" />
      <div className="p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motorista *</label>
              <select {...register("driverId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="">Selecione...</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.driverId && <p className="text-red-500 text-xs mt-1">{errors.driverId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
              <select {...register("vehicleId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="">Selecione...</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}
              </select>
              {errors.vehicleId && <p className="text-red-500 text-xs mt-1">{errors.vehicleId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              <select {...register("patientId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="">Selecione...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clínica de destino</label>
              <select {...register("clinicId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="">Nenhuma</option>
                {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
            <input
              {...register("origin")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Endereço de origem"
            />
            {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
            <input
              {...register("destination")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Endereço de destino"
            />
            {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora *</label>
            <input
              type="datetime-local"
              {...register("scheduledAt")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distância (km)</label>
              <input
                type="number"
                step="0.1"
                {...register("distanceKm", { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo por km (R$)</label>
              <input
                type="number"
                step="0.01"
                {...register("costPerKm", { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="2.50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo total (R$)</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-medium">
                {totalCost ? `R$ ${totalCost}` : "—"}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Informações adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Agendar corrida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
