import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function IntegrationsPage() {
  const [keys, setKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [keyName, setKeyName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [secret, setSecret] = useState(null);
  const [importNotice, setImportNotice] = useState("");
  const load = () => Promise.all([api.apiKeys(), api.webhooks()]).then(([a, b]) => { setKeys(a); setWebhooks(b); });
  useEffect(() => {
    load();
  }, []);
  async function createKey(event) {
    event.preventDefault();
    const result = await api.createApiKey({ name: keyName });
    setSecret({ label: "API key", value: result.apiKey });
    setKeyName("");
    await load();
  }
  async function createWebhook(event) {
    event.preventDefault();
    const result = await api.createWebhook({ endpointUrl: endpoint, eventTypes: ["case.completed", "transfer.accepted"] });
    setSecret({ label: "Webhook signing secret", value: result.signingSecret });
    setEndpoint("");
    await load();
  }
  async function importWatches(event) {
    event.preventDefault();
    const file = event.currentTarget.elements.file.files[0];
    const formData = new FormData();
    formData.append("file", file);
    const result = await api.importWatches(formData);
    setImportNotice(result.message);
    event.currentTarget.reset();
  }
  return (
    <>
      <PageHeader eyebrow="Partner platform" title="Integrations" description="Issue revocable API credentials and configure signed webhook destinations." />
      {secret && <div className="secret-reveal"><strong>{secret.label}</strong><code>{secret.value}</code><small>This value is shown once.</small></div>}
      <section className="integration-grid">
        <article className="overview-card">
          <h2>API keys</h2>
          <form className="inline-form" onSubmit={createKey}><input placeholder="Key name" value={keyName} onChange={(e) => setKeyName(e.target.value)} required /><button className="button primary">Create key</button></form>
          <div className="record-list">
            {keys.map((item) => <div className="record-row" key={item.api_key_id}><strong>{item.key_name}</strong><code>{item.key_prefix}...</code><span>{item.revoked_at ? "Revoked" : "Active"}</span></div>)}
          </div>
        </article>
        <article className="overview-card">
          <h2>Webhooks</h2>
          <form className="inline-form" onSubmit={createWebhook}><input type="url" placeholder="https://partner.example/webhooks" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} required /><button className="button primary">Add webhook</button></form>
          <div className="record-list">
            {webhooks.map((item) => <div className="record-row" key={item.webhook_id}><strong>{item.endpoint_url}</strong><span className="soft-tag">{item.status}</span></div>)}
          </div>
        </article>
      </section>
      <section className="overview-card import-panel">
        <h2>Bulk data</h2>
        <p className="muted">Import up to 500 watches from CSV. Required columns: brand_name, model_name, serial_number.</p>
        {importNotice && <div className="alert success">{importNotice}</div>}
        <form className="inline-form" onSubmit={importWatches}>
          <input name="file" type="file" accept=".csv,text/csv" required />
          <button className="button primary">Import watches</button>
          <a className="button secondary" href={api.exportUrl("watches")}>Export watches</a>
          <a className="button secondary" href={api.exportUrl("checks")}>Export checks</a>
        </form>
      </section>
    </>
  );
}
