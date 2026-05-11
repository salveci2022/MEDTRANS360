import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  organizationName: z.string().min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
  organizationCnpj: z.string().optional(),
});

export const magicLinkSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const twoFactorSchema = z.object({
  code: z.string().length(6, "Código deve ter 6 dígitos"),
});

export const vehicleSchema = z.object({
  plate: z.string().min(7, "Placa inválida").max(8),
  model: z.string().min(2, "Modelo obrigatório"),
  brand: z.string().min(2, "Marca obrigatória"),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  capacity: z.number().min(1).max(50).default(4),
  fuelType: z.enum(["GASOLINE", "ETHANOL", "DIESEL", "FLEX", "ELECTRIC", "HYBRID"]),
  currentMileage: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const driverSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cpf: z.string().min(11, "CPF inválido").max(14),
  phone: z.string().min(10, "Telefone inválido"),
  licenseNumber: z.string().min(8, "CNH inválida"),
  licenseExpiry: z.string(),
  licenseCategory: z.string().default("B"),
  vehicleId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const patientSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  clinicId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const clinicSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5, "Endereço obrigatório"),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

export const tripSchema = z.object({
  driverId: z.string().min(1, "Motorista obrigatório"),
  vehicleId: z.string().min(1, "Veículo obrigatório"),
  patientId: z.string().min(1, "Paciente obrigatório"),
  clinicId: z.string().optional().nullable(),
  origin: z.string().min(3, "Origem obrigatória"),
  destination: z.string().min(3, "Destino obrigatório"),
  scheduledAt: z.string(),
  distanceKm: z.number().optional().nullable(),
  costPerKm: z.number().optional().nullable(),
  mileageStart: z.number().optional().nullable(),
  notes: z.string().optional(),
});

export const fuelRecordSchema = z.object({
  vehicleId: z.string().min(1, "Veículo obrigatório"),
  liters: z.number().min(0.1, "Litros deve ser maior que 0"),
  pricePerLiter: z.number().min(0.01),
  mileageAtFuel: z.number().min(0),
  fuelType: z.enum(["GASOLINE", "ETHANOL", "DIESEL", "FLEX", "ELECTRIC", "HYBRID"]),
  date: z.string(),
  station: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type ClinicInput = z.infer<typeof clinicSchema>;
export type TripInput = z.infer<typeof tripSchema>;
export type FuelRecordInput = z.infer<typeof fuelRecordSchema>;
