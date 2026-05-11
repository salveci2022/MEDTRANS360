"use client";
import { useState } from "react";
import Link from "next/link";
import { Car, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Esqueceu a senha?</h1>
          <p className="text-sm text-gray-600 mb-6">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg text-sm text-center">
              <p className="font-medium mb-1">Link enviado!</p>
              <p>Verifique sua caixa de email. O link expira em 1 hora.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}
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
                  disabled={loading || !email}
                  className="w-full bg-slate-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar link de redefinição
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
