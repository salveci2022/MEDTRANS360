"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { tripSchema, type TripInput } from "@/lib/validations";
import { Loader2, ArrowLeft, Pencil, X } from "lucide-react";
import { formatDateTime, formatCurrency, formatDistance } from "@/lib/utils";
import { TRIP_STATUS_LABELS } from "@/types";
import type { TripWithRelations, Driver, Vehicle, Patient, Clinic } from "@/types";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED:   "bg-green-100 text-green-700",
  CANCELLED:   "bg-red-100 text-red-700",
};

export default function TripDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [trip, setTrip] = useState<TripWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TripInput>({ resolver: zodResolver(tripSchema) });

  async function fetchTrip() {
    const res = await fetch(`/api/trips/${id}`);
    const json = await res.json();
    setTrip(json.data);
    setLoading(false);
  }

  useEffect(() => { fetchTrip(); }, [id]);

  useEffect(() => {
    if (!editing) return;
    Promise.all([
      fetch("/api/drivers").then((r) => r.json()),
      fetch("/api/vehicles").then((r) => r.json()),
      fetch("/api/patients").then((r) => r.json()),
      fetch("/api/clinics").then((r) => r.json()),
    ]).then(([d, v, p, c]) => {
      setDrivers(d.data ?? []);
      setVehicles(v.data ?? []);
      setPatients(p.data ?? []);
      setClinics(c.data ?? []);
    });

    if (trip) {
      reset({
        driverId: trip.driverId,
        vehicleId: trip.vehicleId,
        patientId: trip.patientId,
        clinicId: trip.clinicId ?? undefined,
        origin: trip.origin,
        destination: trip.destination,
        scheduledAt: new Date(trip.scheduledAt).toISOString().slice(0, 16),
        distanceKm: trip.distanceKm ?? undefined,
        costPerKm: trip.costPerKm ?? undefined,
        notes: trip.notes ?? undefined,
      });
    }
  }, [editing, trip]);

  const distanceKm = watch("distanceKm");
  const costPerKm = watch("costPerKm");
  const totalCost = distanceKm && costPerKm ? (distanceKm * costPerKm).toFixed(2) : null;

  async function onSubmit(data: TripInput) {
    setError("");
    const res = await fetch(`/api/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setTrip(json.data);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Excluir esta corrida?")) return;
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/trips");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Corrida não encontrada.</p>
        <Link href="/trips" className="text-sm text-blue-600 hover:underline mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={`Corrida — ${trip.patient.name}`}
        description={`${trip.origin} → ${trip.destination}`}
        actions={
          <div className="flex gap-2">
            <Link href="/trips" className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-2xl space-y-5">
        {!editing ? (
          <>
            <div className="bg-white border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Informações da corrida</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[trip.status]}`}>
                  {TRIP_STATUS_LABELS[trip.status as keyof typeof TRIP_STATUS_LABELS]}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">Paciente</dt><dd className="font-medium">{trip.patient.name}</dd></div>
                <div><dt className="text-gray-500">Motorista</dt><dd className="font-medium">{trip.driver.name}</dd></div>
                <div><dt className="text-gray-500">Veículo</dt><dd className="font-medium">{trip.vehicle.plate} — {trip.vehicle.model}</dd></div>
                <div><dt className="text-gray-500">Clínica</dt><dd className="font-medium">{trip.clinic?.name ?? "—"}</dd></div>
                <div><dt className="text-gray-500">Agendamento</dt><dd className="font-medium">{formatDateTime(trip.scheduledAt)}</dd></div>
                {trip.startedAt && <div><dt className="text-gray-500">Iniciada</dt><dd className="font-medium">{formatDateTime(trip.startedAt)}</dd></div>}
                {trip.completedAt && <div><dt className="text-gray-500">Concluída</dt><dd className="font-medium">{formatDateTime(trip.completedAt)}</dd></div>}
                <div className="col-span-2"><dt className="text-gray-500">Origem</dt><dd className="font-medium">{trip.origin}</dd></div>
                <div className="col-span-2"><dt className="text-gray-500">Destino</dt><dd className="font-medium">{trip.destination}</dd></div>
                {trip.distanceKm && <div><dt className="text-gray-500">Distância</dt><dd className="font-medium">{formatDistance(trip.distanceKm)}</dd></div>}
                {trip.totalCost && <div><dt className="text-gray-500">Custo total</dt><dd className="font-medium">{formatCurrency(trip.totalCost)}</dd></div>}
                {trip.notes && <div className="col-span-2"><dt className="text-gray-500">Observações</dt><dd className="font-medium">{trip.notes}</dd></div>}
              </dl>
            </div>

            {trip.status !== "IN_PROGRESS" && trip.status !== "COMPLETED" && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-600 hover:underline"
              >
                Excluir corrida
              </button>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900">Editar corrida</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motorista *</label>
                <select {...register("driverId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.driverId && <p className="text-red-500 text-xs mt-1">{errors.driverId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                <select {...register("vehicleId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}
                </select>
                {errors.vehicleId && <p className="text-red-500 text-xs mt-1">{errors.vehicleId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select {...register("patientId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {errors.patientId && <p className="text-red-500 text-xs mt-1">{errors.patientId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clínica</label>
                <select {...register("clinicId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                  <option value="">Nenhuma</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origem *</label>
              <input {...register("origin")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
              <input {...register("destination")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora *</label>
              <input type="datetime-local" {...register("scheduledAt")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distância (km)</label>
                <input type="number" step="0.1" {...register("distanceKm", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo por km</label>
                <input type="number" step="0.01" {...register("costPerKm", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custo total</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
                  {totalCost ? `R$ ${totalCost}` : "—"}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea {...register("notes")} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar alterações
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
