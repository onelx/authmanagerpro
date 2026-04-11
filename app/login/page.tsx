"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user && profile?.is_admin) router.replace("/admin");
    else if (user) router.replace("/dashboard");
  }, [user, profile, isLoading, router]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AuthManagerPro</h1>
          <p className="text-gray-500 mt-2">Iniciá sesión en tu cuenta</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿No tenés cuenta?{" "}
          <a href="/register" className="text-blue-600 hover:underline font-medium">
            Registrate
          </a>
        </p>
      </div>
    </div>
  );
}