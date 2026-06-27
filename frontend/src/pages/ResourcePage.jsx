import { Navigate, useParams } from "react-router-dom";
import CrudTable from "../components/CrudTable.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { resourceConfigs } from "../config/resources.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ResourcePage() {
  const { resource } = useParams();
  const { user } = useAuth();
  const config = resourceConfigs[resource];
  if (!config || !config.viewRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return (
    <>
      <PageHeader eyebrow="Registry data" title={config.label} description={config.description} />
      <CrudTable resource={resource} config={config} user={user} />
    </>
  );
}
