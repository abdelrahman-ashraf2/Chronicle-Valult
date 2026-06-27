import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { isOrgAdmin, isSuperAdmin } from "../config/roles.js";

const common = [
  ["/dashboard", "Dashboard", "DB", true],
  ["/dashboard/watches", "Watches", "WT"],
  ["/dashboard/cases", "Cases", "CA"],
  ["/dashboard/transfers", "Transfers", "TR"],
  ["/dashboard/notifications", "Notifications", "NT"]
];
const admin = [
  ["/dashboard/resources/users", "Users", "US"],
  ["/dashboard/resources/brands", "Brands", "BR"],
  ["/dashboard/resources/movements", "Movements", "MV"],
  ["/dashboard/resources/parts", "Parts", "PT"],
  ["/dashboard/resources/auctions", "Auctions", "AU"],
  ["/dashboard/resources/checks", "Checks", "CK"]
];
const organizationAdmin = [
  ["/dashboard/team", "Invitations", "IN"],
  ["/dashboard/settings", "Organization", "OR"],
  ["/dashboard/integrations", "Integrations", "API"]
];
const platform = [["/dashboard/resources/organizations", "Organizations", "OG"]];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    ...common,
    ...(isSuperAdmin(user) ? platform : []),
    ...(isSuperAdmin(user) || isOrgAdmin(user) ? admin : []),
    ...(isOrgAdmin(user) ? organizationAdmin : [])
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="sidebar-brand" onClick={() => navigate("/")}>
          <span className="mini-dial">CV</span>
          <span>
            <strong>Chronicle Vault</strong>
            <small>{user.organizationName || "Platform workspace"}</small>
          </span>
        </button>
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {links.map(([to, label, icon, end]) => (
            <NavLink
              end={end}
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">{icon}</span>{label}
            </NavLink>
          ))}
          <button
            className="nav-item signout-nav"
            onClick={async () => {
              navigate("/", { replace: true });
              await logout();
            }}
          >
            <span className="nav-icon">SO</span>Sign out
          </button>
        </nav>
        <div className="account-card">
          <span className="avatar">{user.username.slice(0, 2).toUpperCase()}</span>
          <span className="account-copy">
            <strong>{user.username}</strong>
            <small>{user.role}</small>
          </span>
        </div>
      </aside>
      <main className="dashboard-main"><Outlet /></main>
    </div>
  );
}
