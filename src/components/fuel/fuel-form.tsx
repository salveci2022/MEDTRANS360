"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { fuelRecordSchema, type FuelRecordInput } from "@/lib/validations";
import type { Vehicle } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface FuelFormProps {
  onClose: () => void;
}

export function FuelForm({ onClose }: FuelFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FuelRecordInput>({
    resolver: zodResolver(fuelRecordSchema),
    defaultValues: {
      fuelType: "FLEX",
      date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    fetch("/api/vehicles?status=ACTIVE").then((r) => r.json()).then((j) => setVehicles(j.data ?? []));
  }, []);

  async function onSubmit(data: FuelRecordInput) {
    setError("");
    const res = await fetch("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    onClose();
  }

  const liters = watch("liters");
  const pricePerLiter = watch("pricePerLiter");
  const totalCost = liters && pricePerLiter ? liters * pricePerLiter : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Registrar abastecimento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
              <select {...register("vehicleId")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="">Selecione...</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
              </select>
              {errors.vehicleId && <p className="text-red-500 text-xs mt-1">{errors.vehicleId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" {...register("date")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de combustível</label>
              <select {...register("fuelType")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="FLEX">Flex</option>
                <option value="GASOLINE">Gasolina</option>
                <option value="ETHANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Litros *</label>
              <input type="number" step="0.001" {...register("liters", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="0.000" />
              {errors.liters && <p className="text-red-500 text-xs mt-1">{errors.liters.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço por litro (R$) *</label>
              <input type="number" step="0.001" {...register("pricePerLiter", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="0.000" />
              {errors.pricePerLiter && <p className="text-red-500 text-xs mt-1">{errors.pricePerLiter.message}</p>}
            </div>

            {totalCost && (
              <div className="col-span-2 bg-gray-50 border rounded-lg p-3 text-sm">
                <span className="text-gray-500">Total calculado: </span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalCost)}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Km no abastecimento *</label>
              <input type="number" step="0.1" {...register("mileageAtFuel", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.mileageAtFuel && <p className="text-red-500 text-xs mt-1">{errors.mileageAtFuel.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posto</label>
              <input {...register("station")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Nome do posto" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota fiscal</label>
              <input {...register("invoiceNumber")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
