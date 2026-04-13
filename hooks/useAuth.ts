"use client";

import { useEffect, useState, useCallback } from "react";

interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  status: string;
  isAdmin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  profile: { is_admin: boolean; full_name: string | null; status: string } | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null, profile: null, isLoading: true, error: null,
  });

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_access_token");
  };

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ user: null, profile: null, isLoading: false, error: null });
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        localStorage.removeItem("auth_access_token");
        localStorage.removeItem("auth_refresh_token");
        localStorage.removeItem("auth_user");
        setState({ user: null, profile: null, isLoading: false, error: null });
        return;
      }
      const data = await res.json();
      const u = data.user;
      setState({
        user: { id: u.id, email: u.email, fullName: u.fullName, status: u.status, isAdmin: u.isAdmin },
        profile: { is_admin: u.isAdmin, full_name: u.fullName ?? null, status: u.status },
        isLoading: false,
        error: null,
      });
    } catch {
      setState({ user: null, profile: null, isLoading: false, error: "Error de conexión" });
    }
  }, []);

  useEffect(() => {
    // Intentar leer del localStorage primero para respuesta inmediata
    const cached = localStorage.getItem("auth_user");
    if (cached) {
      try {
        const u = JSON.parse(cached);
        setState({
          user: { id: u.id, email: u.email, fullName: u.fullName, status: u.status, isAdmin: u.isAdmin },
          profile: { is_admin: u.isAdmin, full_name: u.fullName ?? null, status: u.status },
          isLoading: false,
          error: null,
        });
      } catch { /* ignorar */ }
    }
    fetchMe();
  }, [fetchMe]);

  const signOut = async () => {
    const token = getToken();
    if (token) {
      await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: "Bearer " + token } }).catch(() => {});
    }
    localStorage.removeItem("auth_access_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_user");
    setState({ user: null, profile: null, isLoading: false, error: null });
    window.location.href = "/login";
  };

  const refreshProfile = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchMe();
  };

  return { ...state, signOut, refreshProfile };
}