"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { UserTable } from "@/components/UserTable";
import type { Profile } from "@/types";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_access_token");
}

export default function AdminPage() {
  const { user, profile, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile !== null && !profile?.is_admin) {
      router.replace("/dashboard");
    }
  }, [user, profile, isLoading, router]);

  const fetchUsers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setUsersLoading(true);
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Error al obtener usuarios");
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && profile?.is_admin) fetchUsers();
  }, [user, profile, fetchUsers]);

  const callAction = useCallback(async (userId: string, action: string, body?: object) => {
    const token = getToken();
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error al ejecutar ${action}`);
      }
      await fetchUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error desconocido");
    }
  }, [fetchUsers]);

  const handleApprove = useCallback((userId: string) => callAction(userId, "approve"), [callAction]);
  const handleSuspend = useCallback((userId: string) => callAction(userId, "suspend"), [callAction]);
  const handleReject  = useCallback((userId: string) => {
    setRejectTarget(userId);
    setRejectReason("");
    setActionError(null);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { setActionError("Debes ingresar una razón para el rechazo"); return; }
    await callAction(rejectTarget, "reject", { reason: rejectReason });
    setRejectTarget(null);
    setRejectReason("");
  }, [rejectTarget, rejectReason, callAction]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
        <div className="flex items-center gap-4">
          <a
            href="/admin/monitor"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Monitor
          </a>
          <span className="text-sm text-gray-500">{profile?.full_name || user.email}</span>
          <button onClick={signOut} className="text-sm text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-4">
        {actionError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
            {actionError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Usuarios <span className="text-sm text-gray-500 font-normal">({users.length} en total)</span>
          </h2>
          <button
            onClick={fetchUsers}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Actualizar
          </button>
        </div>

        <UserTable
          users={users}
          isLoading={usersLoading}
          onApprove={handleApprove}
          onReject={handleReject}
          onSuspend={handleSuspend}
        />
      </main>

      {/* Modal rechazo */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Rechazar usuario</h3>
            <p className="text-sm text-gray-600">
              Ingresá la razón del rechazo para{" "}
              <strong>{users.find(u => u.id === rejectTarget)?.email}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ej: Información incompleta, documentación faltante..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); setActionError(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
