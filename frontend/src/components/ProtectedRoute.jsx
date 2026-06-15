import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children, onNavigate }) {
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      onNavigate("login", { replace: true });
    }
  }, [isAuthenticated, isReady, onNavigate]);

  if (!isReady) {
    return null;
  }

  return isAuthenticated ? children : null;
}
