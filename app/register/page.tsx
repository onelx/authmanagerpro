"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) router.replace("/dashboard");
  }, [user, isLoading, router]);

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
          <p className="text-gray-500 mt-2">Creá tu cuenta nueva</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="text-blue-600 hover:underline font-medium">
            Iniciá sesión
          </a>
        </p>
      </div>
    </div>
  );
}