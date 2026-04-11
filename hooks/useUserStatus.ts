"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { UserStatus } from "@/types";

interface UserStatusState {
  status: UserStatus | null;
  isAdmin: boolean;
  rejectionReason: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseUserStatusReturn extends UserStatusState {
  refreshStatus: () => Promise<void>;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  canAccessApp: boolean;
}

export function useUserStatus(): UseUserStatusReturn {
  const [state, setState] = useState<UserStatusState>({
    status: null,
    isAdmin: false,
    rejectionReason: null,
    isLoading: true,
    error: null,
  });

  const supabase = getSupabaseClient();

  const fetchUserStatus = async (): Promise<void> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({
          status: null,
          isAdmin: false,
          rejectionReason: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("status, is_admin, rejection_reason")
        .eq("id", user.id)
        .single();

      if (error) {
        setState({
          status: null,
          isAdmin: false,
          rejectionReason: null,
          isLoading: false,
          error: error.message,
        });
        return;
      }

      setState({
        status: (data?.status as UserStatus) || null,
        isAdmin: data?.is_admin || false,
        rejectionReason: data?.rejection_reason || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al obtener estado";
      setState({
        status: null,
        isAdmin: false,
        rejectionReason: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  const refreshStatus = async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await fetchUserStatus();
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await fetchUserStatus();
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        await fetchUserStatus();
      } else if (event === "SIGNED_OUT") {
        setState({
          status: null,
          isAdmin: false,
          rejectionReason: null,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isApproved = state.status === "approved";
  const isPending =
    state.status === "pending_verification" ||
    state.status === "pending_approval";
  const isRejected = state.status === "rejected";
  const canAccessApp = state.isAdmin || isApproved;

  return {
    ...state,
    refreshStatus,
    isApproved,
    isPending,
    isRejected,
    canAccessApp,
  };
}
