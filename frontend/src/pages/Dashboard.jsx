import { useMemo, useState } from "react";
import CrudTable from "../components/CrudTable.jsx";
import DashboardOverview from "../components/DashboardOverview.jsx";
import RoleBasedRoute from "../components/RoleBasedRoute.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  orgAdminNavigation,
  resourceConfigs,
  superAdminNavigation,
  userNavigation
} from "../config/resources.js";
import { isOrgAdmin, isSuperAdmin } from "../config/roles.js";

function navigationFor(user) {
  if (isSuperAdmin(user)) return superAdminNavigation;
  if (isOrgAdmin(user)) return orgAdminNavigation;
  return userNavigation;
}

export default function Dashboard({ onPublicNavigate }) {
  const { user, logout } = useAuth();
  const [activeResource, setActiveResource] = useState("overview");

  if (!user) {
    return null;
  }

  const navigation = navigationFor(user);
  const config = resourceConfigs[activeResource];
  const isPlatformAdmin = isSuperAdmin(user);
  const accessNote = isPlatformAdmin
    ? "Platform-wide access"
    : isOrgAdmin(user)
      ? "Organization-wide access"
      : activeResource === "watches"
        ? "Own watch management"
        : "Private read-only access";

  const currentLabel = useMemo(() => {
    if (!config) return "Dashboard";
    if (user.role === "User" && config.userLabel) return config.userLabel;
    return config.label;
  }, [config, user.role]);

  const currentDescription = useMemo(() => {
    if (!config) return "";
    if (user.role === "User" && config.userDescription) return config.userDescription;
    return config.description;
  }, [config, user.role]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="sidebar-brand" onClick={() => onPublicNavigate("home")}>
          <span className="mini-dial">CV</span>
          <span>
            <strong>Chronicle Vault</strong>
            <small>{isPlatformAdmin ? "Platform Control Center" : user.organizationName || "Private Member Workspace"}</small>
          </span>
        </button>

        <nav className="dashboard-nav" aria-label="Collection sections">
          <button
            className={activeResource === "overview" ? "nav-item active" : "nav-item"}
            onClick={() => setActiveResource("overview")}
          >
            <span className="nav-icon">DB</span>
            Dashboard
          </button>
          <span className="nav-label">
            {isPlatformAdmin ? "Platform" : isOrgAdmin(user) ? "Organization" : "Member"}
          </span>
          {navigation.map((resource) => (
            <button
              key={resource}
              className={activeResource === resource ? "nav-item active" : "nav-item"}
              onClick={() => setActiveResource(resource)}
            >
              <span className="nav-index">
                {String(navigation.indexOf(resource) + 1).padStart(2, "0")}
              </span>
              {user.role === "User" && resourceConfigs[resource].userLabel
                ? resourceConfigs[resource].userLabel
                : resourceConfigs[resource].label}
            </button>
          ))}
          <button
            className="nav-item signout-nav"
            onClick={async () => {
              await logout();
              onPublicNavigate("home", { replace: true });
            }}
          >
            <span className="nav-icon">SO</span>
            Sign out
          </button>
        </nav>

        <div className="account-card">
          <span className="avatar">{user.username.slice(0, 2).toUpperCase()}</span>
          <span className="account-copy">
            <strong>{user.username}</strong>
            <small>{user.role} {user.organizationName ? `• ${user.organizationName}` : ""}</small>
          </span>
        </div>
      </aside>

      <main className="dashboard-main">
        {activeResource === "overview" ? (
          <DashboardOverview user={user} onOpenResource={setActiveResource} />
        ) : (
          <RoleBasedRoute
            allowedRoles={config.viewRoles}
            onDenied={() => setActiveResource("overview")}
            fallback={null}
          >
            <>
              <header className="dashboard-header">
                <div>
                  <p className="eyebrow">{isPlatformAdmin ? "Platform registry" : isOrgAdmin(user) ? "Organization registry" : "Private collection"}</p>
                  <h1>{currentLabel}</h1>
                  <p>{currentDescription}</p>
                </div>
                <div className="access-note">
                  <span className="status-dot" />
                  {accessNote}
                </div>
              </header>

              <CrudTable
                key={`${activeResource}:${user.role}`}
                resource={activeResource}
                config={config}
                user={user}
              />
            </>
          </RoleBasedRoute>
        )}
      </main>
    </div>
  );
}
