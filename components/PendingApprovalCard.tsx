"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface PendingApprovalCardProps {
  email: string;
  onLogout?: () => void;
}

const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({
  email,
  onLogout,
}) => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (onLogout) {
        onLogout();
      }
      window.location.href = "/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <CardTitle className="text-center">
            Cuenta pendiente de aprobación
          </CardTitle>
          <CardDescription className="text-center">
            Tu registro fue verificado exitosamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              ¿Qué sigue ahora?
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Un administrador revisará tu solicitud de acceso</li>
              <li>Recibirás un email cuando tu cuenta sea aprobada</li>
              <li>Podrás iniciar sesión una vez aprobado</li>
            </ol>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Email registrado:</span>
            </p>
            <p className="text-sm text-gray-900 font-mono">{email}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-900 mb-1">
                  Tiempo de espera
                </p>
                <p className="text-sm text-yellow-800">
                  El proceso de aprobación puede tomar entre 24 y 48 horas
                  hábiles. Te notificaremos por email sobre cualquier
                  actualización.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="flex-1"
            >
              Cerrar sesión
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Verificar estado
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              ¿Tenés algún problema?{" "}
              <a
                href="mailto:soporte@ejemplo.com"
                className="text-blue-600 hover:underline"
              >
                Contactá a soporte
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { PendingApprovalCard };
