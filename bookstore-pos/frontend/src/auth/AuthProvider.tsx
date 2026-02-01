import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export type AuthState = {
  token: string | null;
  username: string | null;
  role: string | null;
};

type AuthContextValue = AuthState & {
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "bookstore_auth";

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ token: null, username: null, role: null });

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

  const login = (token: string, username: string, role: string) => {
    const next = { token, username, role };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const logout = () => {
    setState({ token: null, username: null, role: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshMe = async () => {
    if (!state.token) return;
    const res = await api.get("/auth/me");
    const next = { token: state.token, username: res.data.username, role: res.data.role };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo(() => ({ ...state, login, logout, refreshMe }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
