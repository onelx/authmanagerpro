import { getSupabaseClient } from "@/lib/supabase";

export interface AdminConfigData {
  adminEmail: string;
  appName: string;
  supportEmail: string;
  approvalEmailSubject: string;
  approvalEmailBody: string;
  rejectionEmailSubject: string;
  rejectionEmailBody: string;
  pendingEmailSubject: string;
  pendingEmailBody: string;
}

const DEFAULT_CONFIG: AdminConfigData = {
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  appName: "AuthManagerPro",
  supportEmail: process.env.SUPPORT_EMAIL || "support@example.com",
  approvalEmailSubject: "✓ Tu cuenta ha sido aprobada - AuthManagerPro",
  approvalEmailBody:
    "¡Bienvenido! Tu cuenta ha sido aprobada exitosamente. Ya puedes acceder a la aplicación.",
  rejectionEmailSubject: "Actualización sobre tu solicitud - AuthManagerPro",
  rejectionEmailBody:
    "Lamentamos informarte que tu solicitud de registro no ha sido aprobada en este momento.",
  pendingEmailSubject: "✓ Email verificado - Pendiente de aprobación",
  pendingEmailBody:
    "Gracias por registrarte. Tu email ha sido verificado. Espera la aprobación de un administrador.",
};

export async function getAdminConfig(): Promise<AdminConfigData> {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("admin_config")
      .select("key, value")
      .in("key", Object.keys(DEFAULT_CONFIG));

    if (error) {
      console.error("Error fetching admin config:", error);
      return DEFAULT_CONFIG;
    }

    if (!data || data.length === 0) {
      return DEFAULT_CONFIG;
    }

    const config: Partial<AdminConfigData> = {};
    data.forEach((item) => {
      const key = item.key as keyof AdminConfigData;
      config[key] = item.value as string;
    });

    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error("Exception fetching admin config:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateAdminConfig(
  key: keyof AdminConfigData,
  value: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseClient();

    const { error: upsertError } = await supabase
      .from("admin_config")
      .upsert(
        {
          key,
          value,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        }
      );

    if (upsertError) {
      console.error("Error updating admin config:", upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception updating admin config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function bulkUpdateAdminConfig(
  updates: Partial<AdminConfigData>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseClient();

    const records = Object.entries(updates).map(([key, value]) => ({
      key,
      value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("admin_config")
      .upsert(records, {
        onConflict: "key",
      });

    if (upsertError) {
      console.error("Error bulk updating admin config:", upsertError);
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception bulk updating admin config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
