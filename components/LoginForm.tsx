"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";

interface LoginFormProps {
  onSuccess?: (user: { email: string; status: string }) => void;
  onError?: (error: string) => void;
}

interface DebugStep { time: string; status: "ok"|"error"|"info"; msg: string; }

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  const [formData, setFormData] = React.useState({ email: "", password: "" });
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [debugSteps, setDebugSteps] = React.useState<DebugStep[]>([]);

  const log = (msg: string, status: DebugStep["status"] = "info") => {
    const time = new Date().toLocaleTimeString("es-AR", { hour12: false });
    setDebugSteps(prev => [...prev, { time, status, msg }]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email || !formData.password) { setError("Email y contraseña son requeridos"); return; }
    setIsLoading(true); setError(""); setDebugSteps([]);

    try {
      log("1. Llamando API /auth/login...");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      log("2. Respuesta: " + res.status, res.ok ? "ok" : "error");

      if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

      // Guardar tokens en localStorage sin llamar a Supabase client
      if (data.session) {
        localStorage.setItem("auth_access_token", data.session.access_token);
        localStorage.setItem("auth_refresh_token", data.session.refresh_token);
      }
      if (data.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }
      log("3. Tokens guardados en localStorage", "ok");

      const dest = data.user?.isAdmin ? "/admin" : "/dashboard";
      log("4. Redirigiendo a " + dest, "ok");

      if (onSuccess) onSuccess({ email: formData.email, status: data.user?.status });
      router.push(dest);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
      log("Error: " + msg, "error");
      if (onError) onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const colors = { ok: "#86efac", error: "#f87171", info: "#93c5fd" };
  const icons = { ok: "✓", error: "✗", info: "→" };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Ingresá tus credenciales para acceder</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 rounded-md p-3"><p className="text-sm text-red-800">{error}</p></div>}
            <Input label="Email" type="email" name="email" placeholder="tu@email.com"
              value={formData.email} onChange={handleInputChange} required disabled={isLoading} autoComplete="email" />
            <Input label="Contraseña" type="password" name="password" placeholder="••••••••"
              value={formData.password} onChange={handleInputChange} required disabled={isLoading} autoComplete="current-password" />
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>Iniciar sesión</Button>
            <p className="text-sm text-gray-500 text-center">¿No tenés cuenta? <a href="/register" className="text-blue-600 hover:underline">Registrate</a></p>
          </CardFooter>
        </form>
      </Card>
      {debugSteps.length > 0 && (
        <div style={{ marginTop:16, padding:12, background:"#0f172a", borderRadius:8, fontFamily:"monospace", fontSize:12 }}>
          <div style={{ color:"#64748b", marginBottom:8, fontSize:11 }}>DEBUG LOG</div>
          {debugSteps.map((s,i) => (
            <div key={i} style={{ display:"flex", gap:8, marginBottom:3 }}>
              <span style={{ color:"#475569", minWidth:65 }}>{s.time}</span>
              <span style={{ color: colors[s.status] }}>{icons[s.status]} {s.msg}</span>
            </div>
          ))}
          {isLoading && <div style={{ color:"#fbbf24", marginTop:4 }}>⏳ Esperando...</div>}
        </div>
      )}
    </>
  );
};

export { LoginForm };