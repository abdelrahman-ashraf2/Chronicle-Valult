import { useNavigate } from "react-router-dom";

const paths = {
  home: "/",
  login: "/login",
  lookup: "/lookup",
  dashboard: "/dashboard"
};

export default function PublicRouteAdapter({ component: Component, ...props }) {
  const navigate = useNavigate();
  const onNavigate = (name, options = {}) =>
    navigate(paths[name] || "/", { replace: Boolean(options.replace) });
  return <Component {...props} onNavigate={onNavigate} />;
}
