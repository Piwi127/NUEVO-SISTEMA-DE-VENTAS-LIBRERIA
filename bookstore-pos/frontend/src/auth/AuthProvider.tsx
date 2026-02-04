import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { logout as apiLogout } from "../api/auth";

export type AuthState = {
  username: string | null;
  role: string | null;
  csrfToken?: string | null;
};

type AuthContextValue = AuthState & {
  login: (username: string, role: string, csrfToken?: string | null) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "bookstore_auth";

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ username: null, role: null, csrfToken: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthState;
        setState(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    refreshMe().catch(() => {
      // ignore
    }).finally(() => {
      setReady(true);
    });
  }, []);

  const login = (username: string, role: string, csrfToken?: string | null) => {
    const next = { username, role, csrfToken: csrfToken ?? null };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const logout = () => {
    apiLogout().catch(() => {
      // ignore
    });
    setState({ username: null, role: null, csrfToken: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshMe = async () => {
    const res = await api.get("/auth/me");
    const next = { username: res.data.username, role: res.data.role, csrfToken: state.csrfToken ?? null };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo(() => ({ ...state, login, logout, refreshMe, ready }), [state, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
