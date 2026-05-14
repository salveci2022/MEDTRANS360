"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Loader2, ShieldCheck, QrCode, CheckCircle, KeyRound, Eye, EyeOff } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  organizationName: string;
  organizationSlug: string;
  plan: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [tfaCode, setTfaCode] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaError, setTfaError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => { setUser(j.user); setLoading(false); });
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (newPassword !== confirmPassword) { setPwError("As senhas não coincidem"); return; }
    if (newPassword.length < 8) { setPwError("Nova senha deve ter pelo menos 8 caracteres"); return; }
    setPwLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    setPwLoading(false);
    if (!res.ok) { setPwError(json.error); return; }
    setPwSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSetup2FA() {
    setTfaLoading(true);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const json = await res.json();
    setQrCode(json.qrCode);
    setSecret(json.secret);
    setTfaLoading(false);
  }

  async function handleEnable2FA() {
    setTfaError("");
    setTfaLoading(true);
    const res = await fetch("/api/auth/2fa/setup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: tfaCode }),
    });
    const json = await res.json();
    setTfaLoading(false);
    if (!res.ok) { setTfaError(json.error); return; }
    setTfaEnabled(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Configurações" description="Gerenciar sua conta e segurança" />

      <div className="p-6 space-y-6 max-w-2xl">
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Informações da conta</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">{user?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Cargo</dt>
              <dd className="font-medium text-gray-900">{user?.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Empresa</dt>
              <dd className="font-medium text-gray-900">{user?.organizationName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Slug</dt>
              <dd className="font-mono text-gray-900">{user?.organizationSlug}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-5 w-5 text-slate-700" />
            <h2 className="font-semibold text-gray-900">Alterar senha</h2>
          </div>
          {pwSuccess ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Senha alterada com sucesso!
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-gray-400">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={pwLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Alterar senha
              </button>
            </form>
          )}
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Autenticação em 2 fatores (2FA)</h2>
          </div>

          {user?.twoFactorEnabled || tfaEnabled ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              2FA ativado — sua conta está protegida
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Adicione uma camada extra de segurança usando um aplicativo autenticador (Google Authenticator, Authy, etc.).
              </p>

              {!qrCode ? (
                <button
                  onClick={handleSetup2FA}
                  disabled={tfaLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {tfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  Configurar 2FA
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      1. Escaneie o QR code com seu aplicativo autenticador.
                    </p>
                    {qrCode && (
                      <div className="inline-block border rounded-lg p-2 bg-white">
                        <img src={qrCode} alt="QR Code 2FA" width={200} height={200} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Chave manual:</p>
                    <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg block font-mono">{secret}</code>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">2. Digite o código de 6 dígitos para confirmar:</p>
                    {tfaError && <p className="text-red-500 text-xs mb-2">{tfaError}</p>}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tfaCode}
                        onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="000000"
                      />
                      <button
                        onClick={handleEnable2FA}
                        disabled={tfaCode.length !== 6 || tfaLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                      >
                        {tfaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Ativar 2FA
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
