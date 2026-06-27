import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function OrganizationSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [notice, setNotice] = useState("");
  useEffect(() => { api.organizationSettings().then(setSettings); }, []);
  if (!settings) return <div className="overview-loading">Loading organization settings...</div>;
  async function save(event) {
    event.preventDefault();
    const result = await api.updateOrganizationSettings({
      logoUrl: settings.logo_url,
      accentColor: settings.accent_color,
      customDomain: settings.custom_domain
    });
    setNotice(result.message);
  }
  return (
    <>
      <PageHeader eyebrow="White-label workspace" title={settings.organization_name} description="Brand the organization portal and review subscription entitlements." />
      {notice && <div className="alert success">{notice}</div>}
      <section className="detail-grid">
        <form className="overview-card compact-form" onSubmit={save}>
          <h2>Branding</h2>
          {!settings.white_label && <p className="muted">White-label branding is available on the Enterprise plan.</p>}
          <label>Logo URL<input disabled={!settings.white_label} type="url" value={settings.logo_url || ""} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} /></label>
          <label>Accent color<input disabled={!settings.white_label} type="color" value={settings.accent_color || "#C9A227"} onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })} /></label>
          <label>Custom domain<input disabled={!settings.white_label} value={settings.custom_domain || ""} onChange={(e) => setSettings({ ...settings, custom_domain: e.target.value })} placeholder="vault.example.com" /></label>
          <button className="button primary" disabled={!settings.white_label}>Save branding</button>
        </form>
        <article className="overview-card plan-card">
          <p className="eyebrow">Current plan</p><h2>{settings.plan_name}</h2>
          <strong>{settings.subscription_status}</strong>
          <div><span>Watch limit</span><b>{settings.watch_limit || "Unlimited"}</b></div>
          <div><span>User limit</span><b>{settings.user_limit || "Unlimited"}</b></div>
          <div><span>Partner API</span><b>{settings.api_access ? "Included" : "Unavailable"}</b></div>
          <div><span>White label</span><b>{settings.white_label ? "Included" : "Unavailable"}</b></div>
        </article>
      </section>
    </>
  );
}
