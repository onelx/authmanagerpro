"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserStatus } from "@/hooks/useUserStatus";
import { PendingApprovalCard } from "@/components/PendingApprovalCard";

export default function DashboardPage() {
  const { user, profile, isLoading, signOut } = useAuth();
  const { status } = useUserStatus();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (profile?.role === "admin") router.replace("/admin");
  }, [user, profile, isLoading, router]);

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (status === "pending") {
    return <PendingApprovalCard user={user} profile={profile} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.full_name || user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-red-600 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Bienvenido, {profile?.full_name || "usuario"}
          </h2>
          <p className="text-gray-500 text-sm">
            Tu cuenta está activa. Estado: <span className="font-medium text-green-600">{status}</span>
          </p>
        </div>
      </main>
    </div>
  );
}