"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  UserCircle,
  Building2,
  Fuel,
  BarChart3,
  Settings,
  LogOut,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
  { href: "/trips",      icon: Navigation,      label: "Corridas" },
  { href: "/drivers",    icon: UserCircle,      label: "Motoristas" },
  { href: "/vehicles",   icon: Car,             label: "Veículos" },
  { href: "/patients",   icon: Users,           label: "Pacientes" },
  { href: "/clinics",    icon: Building2,       label: "Clínicas" },
  { href: "/fuel",       icon: Fuel,            label: "Combustível" },
  { href: "/reports",    icon: BarChart3,       label: "Relatórios" },
  { href: "/users",      icon: Users,           label: "Usuários" },
  { href: "/settings",   icon: Settings,        label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-white flex flex-col h-screen">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-gray-900">TransportSaaS</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
