import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();
  if (!isReady) return <div className="app-loading">Checking your vault...</div>;
  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
