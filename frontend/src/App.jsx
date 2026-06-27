import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRouteAdapter from "./components/PublicRouteAdapter.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import CaseDetail from "./pages/CaseDetail.jsx";
import CasesPage from "./pages/CasesPage.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import IntegrationsPage from "./pages/IntegrationsPage.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage.jsx";
import PublicVerification from "./pages/PublicVerification.jsx";
import ResourcePage from "./pages/ResourcePage.jsx";
import SerialLookup from "./pages/SerialLookup.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import TransfersPage from "./pages/TransfersPage.jsx";
import WatchDetail from "./pages/WatchDetail.jsx";
import WatchesPage from "./pages/WatchesPage.jsx";
import { ROLES } from "./config/roles.js";
import AcceptInvitation from "./pages/AcceptInvitation.jsx";

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  const paths = { home: "/", lookup: "/lookup", dashboard: "/dashboard", login: "/login" };
  return (
    <Login
      onNavigate={(name) => navigate(paths[name] || "/")}
      onSuccess={() => navigate(location.state?.from || "/dashboard", { replace: true })}
    />
  );
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role)
    ? children
    : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRouteAdapter component={Landing} />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/lookup" element={<PublicRouteAdapter component={SerialLookup} />} />
      <Route path="/verify/:token" element={<PublicVerification />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitation />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="watches" element={<WatchesPage />} />
          <Route path="watches/:watchId" element={<WatchDetail />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseId" element={<CaseDetail />} />
          <Route path="resources/:resource" element={<ResourcePage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="team" element={<RoleGate roles={[ROLES.ORG_ADMIN]}><TeamPage /></RoleGate>} />
          <Route path="settings" element={<RoleGate roles={[ROLES.ORG_ADMIN]}><OrganizationSettingsPage /></RoleGate>} />
          <Route path="integrations" element={<RoleGate roles={[ROLES.ORG_ADMIN]}><IntegrationsPage /></RoleGate>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
