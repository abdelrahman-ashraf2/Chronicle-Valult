import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import SerialLookup from "./pages/SerialLookup.jsx";

function currentRoute() {
  const path = window.location.pathname;

  if (path === "/login") return "login";
  if (path === "/lookup") return "lookup";
  if (path.startsWith("/dashboard")) return "dashboard";
  return "home";
}

export default function App() {
  const { isAuthenticated, isReady, logout } = useAuth();
  const [route, setRoute] = useState(currentRoute);

  const navigate = useCallback((nextRoute, options = {}) => {
    const paths = {
      home: "/",
      login: "/login",
      lookup: "/lookup",
      dashboard: "/dashboard"
    };
    const nextPath = paths[nextRoute] || "/";

    if (options.replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }

    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(currentRoute());

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (route === "dashboard" && !isAuthenticated) {
      navigate("login", { replace: true });
      return;
    }

    if (route === "login" && isAuthenticated) {
      navigate("dashboard", { replace: true });
    }
  }, [route, isAuthenticated, isReady, navigate]);

  useEffect(() => {
    function handleExpired() {
      logout();
      navigate("login", { replace: true });
    }

    window.addEventListener("auth-expired", handleExpired);

    return () => {
      window.removeEventListener("auth-expired", handleExpired);
    };
  }, [logout, navigate]);

  if (!isReady) {
    return <div className="app-loading">Checking your vault...</div>;
  }

  if (route === "dashboard") {
    return (
      <ProtectedRoute onNavigate={navigate}>
        <Dashboard onPublicNavigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (route === "login") {
    return isAuthenticated ? null : (
      <Login
        onNavigate={navigate}
        onSuccess={() => navigate("dashboard", { replace: true })}
      />
    );
  }

  if (route === "lookup") {
    return <SerialLookup onNavigate={navigate} />;
  }

  return <Landing onNavigate={navigate} />;
}
