import { useNavigate } from "react-router-dom";
import DashboardOverview from "../components/DashboardOverview.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const routes = {
  watches: "/dashboard/watches",
  checks: "/dashboard/resources/checks",
  users: "/dashboard/resources/users",
  organizations: "/dashboard/resources/organizations",
  parts: "/dashboard/resources/parts",
  auctions: "/dashboard/resources/auctions"
};

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return <DashboardOverview user={user} onOpenResource={(name) => navigate(routes[name] || "/dashboard")} />;
}
