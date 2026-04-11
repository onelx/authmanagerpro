"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { UserTable } from "@/components/UserTable";
import type { Profile } from "@/types";

export default function AdminPage() {
  const { user, profile, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (!profile?.is_admin) router.replace("/dashboard");
  }, [user, profile, isLoading, router]);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Error al obtener usuarios");
      const data = await res.json();
      setUsers(data.users ?? data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && profile?.is_admin) fetchUsers();
  }, [user, profile, fetchUsers]);

  const handleApprove = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/approve`, { method: "POST" });
      await fetchUsers();
    } catch (err) {
      console.error("Error al aprobar:", err);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/reject`, { method: "POST" });
      await fetchUsers();
    } catch (err) {
      console.error("Error al rechazar:", err);
    }
  };

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.full_name || user.email}</span>
          <button onClick={signOut} className="text-sm text-red-600 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <UserTable
          users={users}
          isLoading={usersLoading}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </main>
    </div>
  );
}