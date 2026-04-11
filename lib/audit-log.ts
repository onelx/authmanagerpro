import { getSupabaseClient } from "@/lib/supabase";

export type AuditAction =
  | "user_registered"
  | "user_verified_email"
  | "email_verified"
  | "user_approved"
  | "user_rejected"
  | "user_login"
  | "user_logout"
  | "config_updated"
  | "admin_notified";

interface CreateAuditLogParams {
  action: AuditAction;
  actorId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("audit_log").insert({
      action: params.action,
      actor_id: params.actorId || null,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

// Alias para compatibilidad
export const logAudit = createAuditLog;
