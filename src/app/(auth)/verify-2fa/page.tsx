"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Loader2, ShieldCheck } from "lucide-react";

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error); return; }
    router.push("/dashboard");
  }

  return (
    <div className="bg-white border rounded-xl p-8 shadow-sm">
      <div className="flex justify-center mb-4">
        <ShieldCheck className="h-10 w-10 text-blue-600" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">Verificação em 2 etapas</h1>
      <p className="text-sm text-gray-600 text-center mb-6">
        Insira o código de 6 dígitos do seu aplicativo autenticador.
      </p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="000000"
          maxLength={6}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-slate-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Verificar
        </button>
      </form>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Car className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">MedTrans 360</span>
        </div>
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <Verify2FAContent />
        </Suspense>
      </div>
    </div>
  );
}
