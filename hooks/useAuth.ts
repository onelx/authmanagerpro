"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { Profile } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    error: null,
  });

  const supabase = getSupabaseClient();

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error("Exception fetching profile:", err);
      return null;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const profile = await fetchProfile(user.id);
      setState((prev) => ({
        ...prev,
        profile,
        isLoading: false,
        error: null,
      }));
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setState((prev) => ({
          ...prev,
          error: error.message,
        }));
        throw error;
      }

      setState({
        user: null,
        profile: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al cerrar sesión";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && mounted) {
          const profile = await fetchProfile(user.id);
          setState({
            user,
            profile,
            isLoading: false,
            error: null,
          });
        } else if (mounted) {
          setState({
            user: null,
            profile: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (mounted) {
          const errorMessage =
            err instanceof Error ? err.message : "Error al inicializar auth";
          setState({
            user: null,
            profile: null,
            isLoading: false,
            error: errorMessage,
          });
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          profile,
          isLoading: false,
          error: null,
        });
      } else if (event === "SIGNED_OUT") {
        setState({
          user: null,
          profile: null,
          isLoading: false,
          error: null,
        });
      } else if (event === "USER_UPDATED" && session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState((prev) => ({
          ...prev,
          user: session.user,
          profile,
        }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    signOut,
    refreshProfile,
  };
}
