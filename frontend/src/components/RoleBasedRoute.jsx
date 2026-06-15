import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function RoleBasedRoute({
  allowedRoles,
  children,
  fallback = null,
  onDenied
}) {
  const { user } = useAuth();
  const isAllowed = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isAllowed && onDenied) {
      onDenied();
    }
  }, [isAllowed, onDenied]);

  return isAllowed ? children : fallback;
}
