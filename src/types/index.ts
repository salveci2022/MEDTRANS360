import type {
  Organization,
  User,
  Vehicle,
  Driver,
  Patient,
  Clinic,
  Trip,
  FuelRecord,
  GpsLog,
} from "@prisma/client";

export type {
  Organization,
  User,
  Vehicle,
  Driver,
  Patient,
  Clinic,
  Trip,
  FuelRecord,
  GpsLog,
};

// String literal types (substituem os enums do Prisma com SQLite)
export type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "OPERATOR" | "DRIVER";
export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export type FuelType = "GASOLINE" | "ETHANOL" | "DIESEL" | "FLEX" | "ELECTRIC" | "HYBRID";
export type DriverStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type TripStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  twoFactorEnabled: boolean;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalTrips: number;
  tripsToday: number;
  tripsInProgress: number;
  totalDrivers: number;
  activeDrivers: number;
  totalVehicles: number;
  activeVehicles: number;
  totalPatients: number;
  totalCostMonth: number;
  totalDistanceMonth: number;
  tripsTrend: { date: string; count: number; cost: number }[];
}

export type TripWithRelations = Trip & {
  driver: Driver;
  vehicle: Vehicle;
  patient: Patient;
  clinic: Clinic | null;
};

export type DriverWithRelations = Driver & {
  vehicle: Vehicle | null;
  user: User | null;
};

export type VehicleWithDriver = Vehicle & {
  driver: Driver | null;
};

export type PatientWithClinic = Patient & {
  clinic: Clinic | null;
};

export const PLAN_LIMITS: Record<Plan, { maxUsers: number; maxVehicles: number; label: string }> = {
  FREE:         { maxUsers: 5,   maxVehicles: 10,  label: "Gratuito" },
  STARTER:      { maxUsers: 20,  maxVehicles: 50,  label: "Starter" },
  PROFESSIONAL: { maxUsers: 100, maxVehicles: 200, label: "Profissional" },
  ENTERPRISE:   { maxUsers: -1,  maxVehicles: -1,  label: "Enterprise" },
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Administrador",
  MANAGER:     "Gerente",
  OPERATOR:    "Operador",
  DRIVER:      "Motorista",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  SCHEDULED:   "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED:   "Concluída",
  CANCELLED:   "Cancelada",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE:      "Ativo",
  MAINTENANCE: "Manutenção",
  INACTIVE:    "Inativo",
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ACTIVE:    "Ativo",
  INACTIVE:  "Inativo",
  SUSPENDED: "Suspenso",
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  GASOLINE: "Gasolina",
  ETHANOL:  "Etanol",
  DIESEL:   "Diesel",
  FLEX:     "Flex",
  ELECTRIC: "Elétrico",
  HYBRID:   "Híbrido",
};
