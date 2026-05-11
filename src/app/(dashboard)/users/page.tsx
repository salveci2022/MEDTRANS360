"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Plus, Loader2, Pencil, Ban, CheckCircle, Copy, Check } from "lucide-react";
import { ROLE_LABELS } from "@/types";
import type { Role } from "@/types";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const ROLE_OPTIONS: Role[] = ["ADMIN", "MANAGER", "OPERATOR", "DRIVER"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("OPERATOR");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("OPERATOR");

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const json = await res.json();
    setUsers(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: inviteName, email: inviteEmail, userRole: inviteRole }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) { setInviteError(json.error); return; }
    setTempPassword(json.tempPassword);
    setInviteName("");
    setInviteEmail("");
    fetchUsers();
  }

  async function handleToggleActive(user: UserRow) {
    if (!confirm(`${user.active ? "Desativar" : "Reativar"} ${user.name ?? user.email}?`)) return;
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    fetchUsers();
  }

  async function handleUpdateRole(userId: string) {
    await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userRole: editRole }),
    });
    setEditingId(null);
    fetchUsers();
  }

  function copyTempPassword() {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <Header
        title="Usuários"
        description={`${users.length} usuários na organização`}
        actions={
          <button
            onClick={() => { setShowInvite(!showInvite); setTempPassword(""); setInviteError(""); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Convidar usuário
          </button>
        }
      />

      <div className="p-6 space-y-5">
        {showInvite && (
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Convidar novo usuário</h2>

            {tempPassword ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  Usuário criado! Compartilhe as credenciais abaixo (o email de convite também foi enviado).
                </div>
                <div className="bg-gray-50 border rounded-lg p-3 text-sm font-mono flex items-center justify-between">
                  <span>Senha temporária: <strong>{tempPassword}</strong></span>
                  <button onClick={copyTempPassword} className="text-gray-500 hover:text-gray-700 ml-3">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <button onClick={() => { setShowInvite(false); setTempPassword(""); }} className="text-sm text-gray-600 hover:underline">
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {inviteError}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="João Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="joao@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Role)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={inviting} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                    {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar convite
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Perfil</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">2FA</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhum usuário encontrado</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{u.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{u.email}</td>
                      <td className="px-5 py-3">
                        {editingId === u.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as Role)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs"
                            >
                              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                            <button onClick={() => handleUpdateRole(u.id)} className="text-xs text-green-600 hover:underline">Salvar</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
                          </div>
                        ) : (
                          <span className="text-gray-600">{ROLE_LABELS[u.role as Role] ?? u.role}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {u.twoFactorEnabled ? (
                          <span className="text-xs text-green-600 font-medium">Ativo</span>
                        ) : (
                          <span className="text-xs text-gray-400">Inativo</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {u.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingId(u.id); setEditRole(u.role as Role); }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Alterar perfil"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`${u.active ? "text-gray-400 hover:text-red-600" : "text-gray-400 hover:text-green-600"}`}
                            title={u.active ? "Desativar" : "Reativar"}
                          >
                            {u.active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
