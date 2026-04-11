import { createServerSupabaseClient } from "@/lib/supabase-server";

export type AuditAction =
  | "user_registered"
  | "user_verified_email"
  | "user_approved"
  | "user_rejected"
  | "user_login"
  | "user_logout"
  | "config_updated"
  | "admin_notified";

interface CreateAuditLogParams {
  action: AuditAction;
  actorId: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.from("audit_log").insert({
      action: params.action,
      actor_id: params.actorId,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating audit log:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception creating audit log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function getAuditLogs(params?: {
  actorId?: string;
  targetId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params?.actorId) {
      query = query.eq("actor_id", params.actorId);
    }

    if (params?.targetId) {
      query = query.eq("target_id", params.targetId);
    }

    if (params?.action) {
      query = query.eq("action", params.action);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      return { data: [], count: 0, error: error.message };
    }

    return { data: data || [], count: count || 0, error: null };
  } catch (error) {
    console.error("Exception fetching audit logs:", error);
    return {
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

export async function getRecentUserActivity(userId: string, limit: number = 10) {
  return getAuditLogs({ targetId: userId, limit });
}

export async function getAdminActivity(adminId: string, limit: number = 20) {
  return getAuditLogs({ actorId: adminId, limit });
}
