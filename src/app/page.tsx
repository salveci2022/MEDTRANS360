import Link from "next/link";
import { Car, Users, BarChart3, Shield, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  { icon: Car, title: "Gestão de Frotas", desc: "Controle veículos, quilometragem, combustível e manutenções em tempo real." },
  { icon: Users, title: "Motoristas e Pacientes", desc: "Cadastre motoristas, pacientes e clínicas com todos os dados necessários." },
  { icon: BarChart3, title: "Relatórios Detalhados", desc: "Relatórios de custos, distâncias, corridas e consumo de combustível." },
  { icon: Shield, title: "Multi-empresa Seguro", desc: "Isolamento total de dados por empresa com autenticação robusta e 2FA." },
];

const plans = [
  { name: "Gratuito", price: "R$ 0", users: "5 usuários", vehicles: "10 veículos", highlight: false },
  { name: "Starter", price: "R$ 99/mês", users: "20 usuários", vehicles: "50 veículos", highlight: true },
  { name: "Profissional", price: "R$ 299/mês", users: "100 usuários", vehicles: "200 veículos", highlight: false },
  { name: "Enterprise", price: "Consulte", users: "Ilimitado", vehicles: "Ilimitado", highlight: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Car className="h-6 w-6 text-blue-600" />
          TransportSaaS
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Gestão de transporte de pacientes<br />
            <span className="text-blue-600">simples e eficiente</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Controle motoristas, veículos, corridas, combustível e custos operacionais em uma única plataforma SaaS multi-empresa.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
            >
              Começar gratuitamente <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Fazer login
            </Link>
          </div>
        </section>

        <section className="bg-gray-50 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Tudo que você precisa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f) => (
                <div key={f.title} className="bg-white p-6 rounded-xl border">
                  <f.icon className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Planos e preços</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-6 rounded-xl border-2 ${
                    plan.highlight ? "border-blue-600 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  {plan.highlight && (
                    <div className="text-xs font-semibold text-blue-600 uppercase mb-2">Popular</div>
                  )}
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <div className="text-2xl font-bold text-gray-900 my-3">{plan.price}</div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />{plan.users}</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />{plan.vehicles}</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Relatórios completos</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Suporte por email</li>
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-6 block text-center py-2 px-4 rounded-lg text-sm font-medium ${
                      plan.highlight
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Começar agora
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} TransportSaaS. Todos os direitos reservados.
      </footer>
    </div>
  );
}
