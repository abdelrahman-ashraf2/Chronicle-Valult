import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id ?? user.user_id,
    username: user.username || "",
    role: user.role || "User",
    organizationId: user.organizationId ?? user.organization_id ?? null,
    organizationName: user.organizationName ?? user.organization_name ?? null,
    organizationPlan: user.organizationPlan ?? user.organization_plan ?? null
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const profile = await api.me();
      setUser(normalizeUser(profile.user));
      return profile.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials);
    const safeUser = normalizeUser(result.user);
    setUser(safeUser);
    return safeUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The local session still closes when the API is unreachable.
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsReady(true));
  }, [refresh]);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("auth-expired", expired);
    return () => window.removeEventListener("auth-expired", expired);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isReady,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refresh
    }),
    [user, isReady, login, logout, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
