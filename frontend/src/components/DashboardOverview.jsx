import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { ROLES } from "../config/roles.js";

const adminStatMeta = {
  organizations: ["Organizations", "O"],
  users: ["Users", "U"],
  watches: ["Watches", "W"],
  parts: ["Parts", "P"],
  auctions: ["Auctions", "A"],
  checks: ["Checks", "C"]
};

export default function DashboardOverview({ user, onOpenResource }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const isMember = user.role === ROLES.USER;
  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

  useEffect(() => {
    const loader = isMember ? api.meDashboard() : api.dashboard();
    loader.then(setData).catch((requestError) => setError(requestError.message));
  }, [isMember]);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="overview-loading">Preparing your vault...</div>;

  const recentWatches = data.latestWatches || data.recentWatches || [];
  const latestChecks = data.latestChecks || [];

  return (
    <div className="overview">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">
            {isMember ? "User Dashboard" : isSuperAdmin ? "Platform Overview" : "Organization Dashboard"}
          </p>
          <h1>
            {isMember
              ? `Welcome back, ${user.username}`
              : isSuperAdmin
                ? "Chronicle Vault overview"
                : user.organizationName || "Organization workspace"}
          </h1>
          <p>
            {isMember
              ? "Review your watches, monitor authentication outcomes, and register a new watch to your private collection."
              : isSuperAdmin
                ? "Manage organizations, members, and records across the entire Chronicle Vault platform."
                : "Manage members and registry data within your organization boundary."}
          </p>
        </div>
        <div className="welcome-actions">
          {isMember && (
            <button className="button primary" onClick={() => onOpenResource("watches")}>
              Register New Watch
            </button>
          )}
          <div className="welcome-monogram">{user.username.slice(0, 2).toUpperCase()}</div>
        </div>
      </section>

      <section className="stat-grid">
        {!isMember ? (
          Object.entries(data.stats).map(([key, value]) => (
            <button
              className="stat-card"
              key={key}
              onClick={() => onOpenResource(key)}
            >
              <span>{adminStatMeta[key]?.[1] || "•"}</span>
              <strong>{value}</strong>
              <small>{adminStatMeta[key]?.[0] || key}</small>
            </button>
          ))
        ) : (
          <>
            <button className="stat-card" onClick={() => onOpenResource("watches")}>
              <span>W</span>
              <strong>{data.totalWatchesOwned}</strong>
              <small>My Watches</small>
            </button>
            <button className="stat-card" onClick={() => onOpenResource("checks")}>
              <span>C</span>
              <strong>{data.totalAuthenticationChecks}</strong>
              <small>Authentication Checks</small>
            </button>
            <button className="stat-card" onClick={() => onOpenResource("checks")}>
              <span>A</span>
              <strong>{data.authenticCount}</strong>
              <small>Authentic Watches</small>
            </button>
            <button className="stat-card" onClick={() => onOpenResource("checks")}>
              <span>R</span>
              <strong>{data.needsReviewCount}</strong>
              <small>Needs Review</small>
            </button>
          </>
        )}
      </section>

      <section className="overview-grid">
        <article className="overview-card">
          <div className="card-heading">
            <div><p className="eyebrow">Collection</p><h2>My Recent Watches</h2></div>
            <button className="text-button" onClick={() => onOpenResource("watches")}>View all</button>
          </div>
          <div className="activity-list">
            {recentWatches.length ? recentWatches.map((watch) => (
              <div className="activity-item" key={watch.watch_id}>
                <span className="activity-mark">{watch.brand_name?.slice(0, 1)}</span>
                <div>
                  <strong>{watch.brand_name} {watch.model_name}</strong>
                  <small>{watch.serial_number} - {watch.production_year}</small>
                </div>
                <span className="soft-tag">{watch.watch_condition}</span>
              </div>
            )) : <p className="empty-copy">No watches are registered here yet.</p>}
          </div>
        </article>

        <article className="overview-card">
          <div className="card-heading">
            <div><p className="eyebrow">Authentication</p><h2>Latest Authentication Results</h2></div>
            <button className="text-button" onClick={() => onOpenResource("checks")}>View all</button>
          </div>
          <div className="activity-list">
            {latestChecks.length ? latestChecks.map((check) => (
              <div className="activity-item" key={check.check_id}>
                <span className="activity-mark check">OK</span>
                <div>
                  <strong>{check.brand_name} {check.model_name}</strong>
                  <small>{check.check_date} - {check.serial_number}</small>
                </div>
                <span className={`soft-tag result-${check.final_result.toLowerCase()}`}>{check.final_result}</span>
              </div>
            )) : <p className="empty-copy">No authentication checks are available yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
