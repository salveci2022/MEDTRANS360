"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token não fornecido");
      return;
    }
    fetch(`/api/auth/magic-link/verify?token=${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => setError("Erro ao verificar link"));
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Car className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">TransportSaaS</span>
        </div>

        {error ? (
          <div className="bg-white border rounded-xl p-8 shadow-sm max-w-md">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Link inválido</h1>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Link href="/login" className="text-sm font-medium text-slate-900 hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-600">Verificando seu link...</p>
          </div>
        )}
      </div>
    </div>
  );
}
