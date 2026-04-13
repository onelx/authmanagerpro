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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AuthManagerPro</h1>
          <p className="text-gray-500 mt-2">Iniciá sesión en tu cuenta</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}