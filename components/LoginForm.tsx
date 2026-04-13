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

interface DebugStep {
  time: string;
  status: "ok" | "error" | "info";
  msg: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  const [formData, setFormData] = React.useState({ email: "", password: "" });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [debugSteps, setDebugSteps] = React.useState<DebugStep[]>([]);

  const log = (msg: string, status: DebugStep["status"] = "info") => {
    const time = new Date().toLocaleTimeString("es-AR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setDebugSteps(prev => [...prev, { time, status, msg }]);
    console.log(`[${status}] ${msg}`);
  };

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
    setDebugSteps([]);

    try {
      log("1. Iniciando signInWithPassword...");
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        log("Auth error: " + error.message, "error");
        throw new Error(error.message);
      }
      if (!data.user) {
        log("No user returned", "error");
        throw new Error("Error al autenticar");
      }

      log("2. Auth OK — user: " + data.user.id.slice(0, 8) + "...", "ok");
      log("3. Fetching profile...");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("status, is_admin")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        log("Profile error: " + profileError.message + " (code: " + profileError.code + ")", "error");
        throw new Error("Error al obtener perfil: " + profileError.message);
      }

      const profile = profileData as { status: string; is_admin: boolean } | null;

      if (!profile) {
        log("Profile is null", "error");
        throw new Error("Perfil no encontrado");
      }

      log("4. Profile OK — status: " + profile.status + ", is_admin: " + profile.is_admin, "ok");

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

      const dest = profile.is_admin ? "/admin" : "/dashboard";
      log("5. Redirigiendo a " + dest + "...", "ok");

      if (onSuccess) onSuccess({ email: formData.email, status: profile.status });

      router.push(dest);

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al iniciar sesión";
      setErrors({ general: msg });
      if (onError) onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = { ok: "#16a34a", error: "#dc2626", info: "#2563eb" };
  const statusIcon = { ok: "✓", error: "✗", info: "→" };

  return (
    <>
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

      {debugSteps.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#0f172a", borderRadius: 8, fontFamily: "monospace", fontSize: 13 }}>
          <div style={{ color: "#94a3b8", marginBottom: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
            DEBUG LOG
          </div>
          {debugSteps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, color: statusColor[s.status] }}>
              <span style={{ color: "#475569", minWidth: 70 }}>{s.time}</span>
              <span>{statusIcon[s.status]}</span>
              <span style={{ color: s.status === "error" ? "#f87171" : s.status === "ok" ? "#86efac" : "#93c5fd" }}>
                {s.msg}
              </span>
            </div>
          ))}
          {isLoading && (
            <div style={{ color: "#fbbf24", marginTop: 4 }}>⏳ Esperando respuesta...</div>
          )}
        </div>
      )}
    </>
  );
};

export { LoginForm };