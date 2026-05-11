"use client";
import { useState } from "react";
import Link from "next/link";
import { Car, Loader2, CheckCircle } from "lucide-react";

export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Car className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">TransportSaaS</span>
        </div>

        <div className="bg-white border rounded-xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Link enviado!</h1>
              <p className="text-sm text-gray-600">
                Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link de acesso em breve. O link expira em 15 minutos.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Acesso por link mágico</h1>
              <p className="text-sm text-gray-600 mb-6">
                Informe seu email e enviaremos um link de acesso sem precisar de senha.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="seu@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar link de acesso
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
