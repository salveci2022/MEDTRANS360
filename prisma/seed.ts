import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("admin123456", 12);

  const org = await prisma.organization.upsert({
    where: { slug: "clinica-demo" },
    update: {},
    create: {
      name: "Clínica Demo Transportes",
      slug: "clinica-demo",
      cnpj: "00.000.000/0001-00",
      phone: "(11) 3000-0000",
      plan: "PROFESSIONAL",
      maxUsers: 100,
      maxVehicles: 200,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Admin Demo",
      email: "admin@demo.com",
      password: hashedPassword,
      role: "ADMIN",
      organizationId: org.id,
      emailVerified: new Date(),
    },
  });

  await prisma.subscription.upsert({
    where: { id: "demo-sub" },
    update: {},
    create: {
      id: "demo-sub",
      organizationId: org.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      startDate: new Date(),
    },
  });

  const vehicle1 = await prisma.vehicle.upsert({
    where: { plate_organizationId: { plate: "ABC-1234", organizationId: org.id } },
    update: {},
    create: {
      plate: "ABC-1234",
      brand: "Toyota",
      model: "Corolla",
      year: 2022,
      color: "Prata",
      fuelType: "FLEX",
      capacity: 4,
      currentMileage: 45000,
      organizationId: org.id,
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { plate_organizationId: { plate: "XYZ-5678", organizationId: org.id } },
    update: {},
    create: {
      plate: "XYZ-5678",
      brand: "Renault",
      model: "Master",
      year: 2021,
      color: "Branco",
      fuelType: "DIESEL",
      capacity: 15,
      currentMileage: 78000,
      organizationId: org.id,
    },
  });

  const driver1 = await prisma.driver.upsert({
    where: { cpf_organizationId: { cpf: "123.456.789-00", organizationId: org.id } },
    update: {},
    create: {
      name: "João Silva",
      cpf: "123.456.789-00",
      phone: "(11) 99999-1111",
      licenseNumber: "12345678901",
      licenseExpiry: new Date("2026-12-31"),
      licenseCategory: "B",
      organizationId: org.id,
      vehicleId: vehicle1.id,
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { cpf_organizationId: { cpf: "987.654.321-00", organizationId: org.id } },
    update: {},
    create: {
      name: "Maria Santos",
      cpf: "987.654.321-00",
      phone: "(11) 99999-2222",
      licenseNumber: "98765432100",
      licenseExpiry: new Date("2027-06-30"),
      licenseCategory: "D",
      organizationId: org.id,
      vehicleId: vehicle2.id,
    },
  });

  const clinic1 = await prisma.clinic.upsert({
    where: { id: "clinic-hosp-central" },
    update: {},
    create: {
      id: "clinic-hosp-central",
      name: "Hospital Central",
      phone: "(11) 3000-1111",
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      organizationId: org.id,
    },
  });

  const clinic2 = await prisma.clinic.upsert({
    where: { id: "clinic-upa-norte" },
    update: {},
    create: {
      id: "clinic-upa-norte",
      name: "UPA Norte",
      phone: "(11) 3000-2222",
      address: "Rua das Flores, 500 - Vila Norte, São Paulo - SP",
      organizationId: org.id,
    },
  });

  const patient1 = await prisma.patient.upsert({
    where: { id: "patient-ana" },
    update: {},
    create: {
      id: "patient-ana",
      name: "Ana Oliveira",
      cpf: "111.222.333-44",
      phone: "(11) 98888-1111",
      address: "Rua das Rosas, 100 - Jardim, São Paulo - SP",
      organizationId: org.id,
      clinicId: clinic1.id,
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { id: "patient-carlos" },
    update: {},
    create: {
      id: "patient-carlos",
      name: "Carlos Ferreira",
      cpf: "555.666.777-88",
      phone: "(11) 97777-2222",
      address: "Av. Brasil, 200 - Centro, São Paulo - SP",
      organizationId: org.id,
      clinicId: clinic2.id,
    },
  });

  await prisma.trip.create({
    data: {
      organizationId: org.id,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      patientId: patient1.id,
      clinicId: clinic1.id,
      origin: "Rua das Rosas, 100 - São Paulo",
      destination: "Av. Paulista, 1000 - São Paulo",
      scheduledAt: new Date(),
      status: "COMPLETED",
      completedAt: new Date(),
      distanceKm: 12.5,
      costPerKm: 2.5,
      totalCost: 31.25,
      mileageStart: 45000,
      mileageEnd: 45012.5,
    },
  });

  await prisma.fuelRecord.create({
    data: {
      organizationId: org.id,
      vehicleId: vehicle1.id,
      liters: 40,
      pricePerLiter: 5.89,
      totalCost: 235.6,
      mileageAtFuel: 45000,
      fuelType: "FLEX",
      date: new Date(),
      station: "Posto Shell - Av. Paulista",
    },
  });

  console.log("Seed completed!");
  console.log("Login: admin@demo.com / admin123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
