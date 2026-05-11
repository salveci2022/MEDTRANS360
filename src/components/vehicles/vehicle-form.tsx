"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { vehicleSchema, type VehicleInput } from "@/lib/validations";
import type { VehicleWithDriver } from "@/types";

interface VehicleFormProps {
  initial: VehicleWithDriver | null;
  onClose: () => void;
}

export function VehicleForm({ initial, onClose }: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initial
      ? {
          plate: initial.plate,
          model: initial.model,
          brand: initial.brand,
          year: initial.year,
          capacity: initial.capacity,
          currentMileage: initial.currentMileage,
          fuelType: initial.fuelType as VehicleInput["fuelType"],
          color: initial.color ?? undefined,
          notes: initial.notes ?? undefined,
        }
      : { fuelType: "FLEX", capacity: 4, currentMileage: 0 },
  });

  async function onSubmit(data: VehicleInput) {
    const url = initial ? `/api/vehicles/${initial.id}` : "/api/vehicles";
    const res = await fetch(url, {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">{initial ? "Editar veículo" : "Novo veículo"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
              <input {...register("plate")} placeholder="ABC-1234" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.plate && <p className="text-red-500 text-xs mt-1">{errors.plate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
              <input type="number" {...register("year", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
              <input {...register("brand")} placeholder="Toyota" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
              <input {...register("model")} placeholder="Corolla" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
              {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <input {...register("color")} placeholder="Prata" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
              <input type="number" {...register("capacity", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Combustível *</label>
              <select {...register("fuelType")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="FLEX">Flex</option>
                <option value="GASOLINE">Gasolina</option>
                <option value="ETHANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
                <option value="ELECTRIC">Elétrico</option>
                <option value="HYBRID">Híbrido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Km atual</label>
              <input type="number" step="0.1" {...register("currentMileage", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea {...register("notes")} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
