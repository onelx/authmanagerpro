"use client";

import * as React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";

interface UserApprovalActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  onApprove: (userId: string) => void;
  onReject: (userId: string, reason: string) => void;
  onCancel?: () => void;
}

type Action = "approve" | "reject" | null;

const UserApprovalActions: React.FC<UserApprovalActionsProps> = ({
  userId,
  userName,
  userEmail,
  onApprove,
  onReject,
  onCancel,
}) => {
  const [action, setAction] = React.useState<Action>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleApproveClick = () => {
    setAction("approve");
  };

  const handleRejectClick = () => {
    setAction("reject");
  };

  const handleConfirmApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(userId);
      setAction(null);
    } catch (error) {
      console.error("Error al aprobar:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Por favor ingresá un motivo de rechazo");
      return;
    }

    setIsProcessing(true);
    try {
      await onReject(userId, rejectionReason);
      setAction(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error al rechazar:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setAction(null);
    setRejectionReason("");
    if (onCancel) {
      onCancel();
    }
  };

  if (action === "approve") {
    return (
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="text-green-900">Confirmar aprobación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                Estás por aprobar el acceso de:
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900">
                  {userName}
                </p>
                <p className="text-sm text-green-700 font-mono">{userEmail}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5"
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
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    ¿Qué sucede al aprobar?
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>El usuario recibirá un email de bienvenida</li>
                    <li>Podrá iniciar sesión inmediatamente</li>
                    <li>Tendrá acceso completo al sistema</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmApprove}
            isLoading={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 focus-visible:ring-green-600"
          >
            Confirmar aprobación
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (action === "reject") {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Rechazar solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-2">
                Estás por rechazar el acceso de:
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-900">{userName}</p>
                <p className="text-sm text-red-700 font-mono">{userEmail}</p>
              </div>
            </div>

            <Input
              label="Motivo del rechazo"
              type="text"
              placeholder="Ej: No cumple con los requisitos de acceso"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              helperText="El usuario recibirá este mensaje por email"
              required
              disabled={isProcessing}
            />

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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Importante
                  </p>
                  <p className="text-sm text-yellow-800">
                    El usuario será notificado del rechazo y no podrá acceder al
                    sistema. Esta acción puede revertirse desde el panel de
                    administración.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmReject}
            isLoading={isProcessing}
            disabled={!rejectionReason.trim()}
            className="flex-1"
          >
            Rechazar solicitud
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones de aprobación</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Usuario seleccionado:</p>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-sm text-gray-700 font-mono">{userEmail}</p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p className="mb-2">Podés realizar las siguientes acciones:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Aprobar:</strong> Otorgar acceso completo al sistema
              </li>
              <li>
                <strong>Rechazar:</strong> Denegar el acceso con motivo
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button
          variant="destructive"
          onClick={handleRejectClick}
          className="flex-1"
        >
          Rechazar
        </Button>
        <Button
          variant="primary"
          onClick={handleApproveClick}
          className="flex-1 bg-green-600 hover:bg-green-700 focus-visible:ring-green-600"
        >
          Aprobar
        </Button>
      </CardFooter>
    </Card>
  );
};

export { UserApprovalActions };
