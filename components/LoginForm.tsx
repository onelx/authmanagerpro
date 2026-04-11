"use client";

import * as React from "react";
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
  const [formData, setFormData] = React.useState({ email: "", password: "" });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Credenciales inválidas");
      }

      // Establecer sesión en el cliente browser para que useAuth la detecte
      if (data.session) {
        const supabase = getSupabaseClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      if (onSuccess) onSuccess({ email: formData.email, status: data.user?.status });

      window.location.href = data.user?.isAdmin ? "/admin" : "/dashboard";
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