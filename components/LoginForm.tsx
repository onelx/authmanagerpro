"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { getSupabaseClient } from "@/lib/supabase";

interface LoginFormProps {
  onSuccess?: (user: { email: string; status: string }) => void;
  onError?: (error: string) => void;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  const [formData, setFormData] = React.useState({ email: "", password: "" });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setErrors({ general: "Email y contraseña son requeridos" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("Error al autenticar");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("status, is_admin")
        .eq("id", data.user.id)
        .single();

      const profile = profileData as { status: string; is_admin: boolean } | null;

      if (profileError || !profile) {
        throw new Error("Error al obtener perfil: " + (profileError?.message ?? "no encontrado"));
      }

      if (profile.status === "pending_verification") {
        await supabase.auth.signOut();
        throw new Error("Por favor verificá tu email antes de iniciar sesión");
      }
      if (profile.status === "pending_approval") {
        await supabase.auth.signOut();
        throw new Error("Tu cuenta está pendiente de aprobación");
      }
      if (profile.status === "rejected") {
        await supabase.auth.signOut();
        throw new Error("Tu cuenta fue rechazada");
      }

      if (onSuccess) onSuccess({ email: formData.email, status: profile.status });

      router.push(profile.is_admin ? "/admin" : "/dashboard");

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al iniciar sesión";
      setErrors({ general: msg });
      if (onError) onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingresá tus credenciales para acceder</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}
          <Input label="Email" type="email" name="email" placeholder="tu@email.com"
            value={formData.email} onChange={handleInputChange} error={errors.email}
            required disabled={isLoading} autoComplete="email" />
          <Input label="Contraseña" type="password" name="password" placeholder="••••••••"
            value={formData.password} onChange={handleInputChange} error={errors.password}
            required disabled={isLoading} autoComplete="current-password" />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Iniciar sesión
          </Button>
          <p className="text-sm text-gray-500 text-center">
            ¿No tenés cuenta?{" "}
            <a href="/register" className="text-blue-600 hover:underline">Registrate</a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export { LoginForm };