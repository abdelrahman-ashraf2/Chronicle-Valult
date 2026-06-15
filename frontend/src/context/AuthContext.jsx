import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const TOKEN_KEY = "vintage_watch_token";
const USER_KEY = "vintage_watch_user";

const AuthContext = createContext(null);

function readStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.user_id ?? null,
    username: user.username ?? "",
    role: user.role ?? "User",
    organizationId: user.organizationId ?? user.organization_id ?? null,
    organizationName: user.organizationName ?? user.organization_name ?? null,
    organizationPlan: user.organizationPlan ?? user.organization_plan ?? null
  };
}

function persistSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(readStoredUser);
  const [isReady, setIsReady] = useState(false);

  const logout = useCallback(async () => {
    try {
      if (readStoredToken()) {
        await api.logout();
      }
    } catch {
      // Local sign-out must still complete if the API is unavailable.
    } finally {
      clearSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.login(credentials);
    const safeUser = normalizeUser(result.user);

    persistSession(result.token, safeUser);
    setToken(result.token);
    setUser(safeUser);

    return safeUser;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedToken = readStoredToken();

      if (!storedToken) {
        setIsReady(true);
        return;
      }

      try {
        const profile = await api.me();

        if (cancelled) {
          return;
        }

        const safeUser = normalizeUser(profile.user);
        persistSession(storedToken, safeUser);
        setToken(storedToken);
        setUser(safeUser);
      } catch {
        if (cancelled) {
          return;
        }

        clearSession();
        setToken(null);
        setUser(null);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isReady,
    isAuthenticated: Boolean(token && user),
    login,
    logout
  }), [user, token, isReady, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
