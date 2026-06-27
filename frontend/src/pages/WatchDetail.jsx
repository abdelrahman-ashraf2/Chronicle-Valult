import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isUser } from "../config/roles.js";
import { api } from "../services/api.js";

const tabs = ["provenance", "evidence", "cases", "parts", "auctions", "checks"];

export default function WatchDetail() {
  const { watchId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [active, setActive] = useState("provenance");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evidence, setEvidence] = useState({ file: null, category: "Watch", description: "" });
  const [event, setEvent] = useState({
    eventType: "Service",
    eventDate: new Date().toISOString().slice(0, 10),
    title: "",
    description: "",
    sourceUrl: ""
  });

  const load = () => api.watch(watchId).then(setData).catch((requestError) => setError(requestError.message));
  useEffect(() => {
    load();
  }, [watchId]);
  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="overview-loading">Opening watch dossier...</div>;
  const { watch } = data;
  const publicUrl = `${window.location.origin}/verify/${watch.public_token}`;

  async function upload(eventObject) {
    eventObject.preventDefault();
    const form = new FormData();
    form.append("watchId", watch.watch_id);
    form.append("category", evidence.category);
    form.append("description", evidence.description);
    form.append("file", evidence.file);
    try {
      await api.uploadEvidence(form);
      setNotice("Evidence uploaded.");
      setEvidence({ file: null, category: "Watch", description: "" });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addEvent(eventObject) {
    eventObject.preventDefault();
    try {
      await api.addProvenance(watch.watch_id, event);
      setNotice("Provenance event added.");
      setEvent({ ...event, title: "", description: "", sourceUrl: "" });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function togglePublishing() {
    const next = watch.public_visibility === "Verified" ? "Private" : "Verified";
    await api.publishWatch(watch.watch_id, next);
    setNotice(`Public verification is now ${next}.`);
    await load();
  }

  return (
    <>
      <PageHeader
        eyebrow={`${watch.brand_name} dossier`}
        title={watch.model_name}
        description={`${watch.serial_number} · ${watch.production_year || "Production year unknown"} · ${watch.owner_username}`}
        actions={<Link className="button secondary" to="/dashboard/watches">Back to watches</Link>}
      />
      {notice && <div className="alert success">{notice}</div>}
      <section className="dossier-hero">
        <div className="dossier-dial">{watch.brand_name?.slice(0, 2).toUpperCase()}</div>
        <div className="dossier-facts">
          <div><small>Reference</small><strong>{watch.reference_number || "Not recorded"}</strong></div>
          <div><small>Movement</small><strong>{watch.movement_name || "Not recorded"}</strong></div>
          <div><small>Case</small><strong>{watch.case_material || "Not recorded"}</strong></div>
          <div><small>Condition</small><strong>{watch.watch_condition}</strong></div>
        </div>
        {!isUser(user) && (
          <div className="verification-share">
            <QRCodeSVG value={publicUrl} size={96} bgColor="transparent" fgColor="#E5C76B" />
            <span className="soft-tag">{watch.public_visibility}</span>
            <button className="text-button" onClick={togglePublishing}>
              {watch.public_visibility === "Verified" ? "Make private" : "Publish verification"}
            </button>
          </div>
        )}
      </section>
      <nav className="detail-tabs">
        {tabs.map((tab) => (
          <button className={active === tab ? "active" : ""} onClick={() => setActive(tab)} key={tab}>
            {tab} <span>{data[tab]?.length || 0}</span>
          </button>
        ))}
      </nav>

      {active === "provenance" && (
        <section className="detail-grid">
          <article className="overview-card">
            <div className="card-heading"><h2>Provenance timeline</h2></div>
            <div className="timeline">
              {data.provenance.map((item) => (
                <div className="timeline-item" key={item.event_id}>
                  <time>{item.event_date}</time>
                  <div><span className="soft-tag">{item.event_type}</span><h3>{item.title}</h3><p>{item.description}</p></div>
                </div>
              ))}
              {!data.provenance.length && <p className="empty-copy">No provenance events yet.</p>}
            </div>
          </article>
          <form className="overview-card compact-form" onSubmit={addEvent}>
            <h2>Add provenance</h2>
            <select value={event.eventType} onChange={(e) => setEvent({ ...event, eventType: e.target.value })}>
              {["Ownership", "Service", "Auction", "Authentication", "Document", "Note"].map((value) => <option key={value}>{value}</option>)}
            </select>
            <input type="date" value={event.eventDate} onChange={(e) => setEvent({ ...event, eventDate: e.target.value })} required />
            <input placeholder="Event title" value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} required />
            <textarea placeholder="Description" value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} />
            <input type="url" placeholder="Source URL" value={event.sourceUrl} onChange={(e) => setEvent({ ...event, sourceUrl: e.target.value })} />
            <button className="button primary">Add event</button>
          </form>
        </section>
      )}

      {active === "evidence" && (
        <section className="detail-grid">
          <article className="overview-card evidence-grid">
            {data.evidence.map((item) => (
              <a className="evidence-card" href={api.evidenceUrl(item.evidence_id)} target="_blank" rel="noreferrer" key={item.evidence_id}>
                <span>{item.category}</span><strong>{item.original_name}</strong><small>{Math.ceil(item.size_bytes / 1024)} KB</small>
              </a>
            ))}
            {!data.evidence.length && <p className="empty-copy">No evidence uploaded yet.</p>}
          </article>
          <form className="overview-card compact-form" onSubmit={upload}>
            <h2>Upload evidence</h2>
            <select value={evidence.category} onChange={(e) => setEvidence({ ...evidence, category: e.target.value })}>
              {["Watch", "Dial", "Movement", "Case", "Serial", "Certificate", "Receipt", "Auction", "Other"].map((value) => <option key={value}>{value}</option>)}
            </select>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setEvidence({ ...evidence, file: e.target.files[0] })} required />
            <textarea placeholder="Description" value={evidence.description} onChange={(e) => setEvidence({ ...evidence, description: e.target.value })} />
            <button className="button primary">Upload file</button>
          </form>
        </section>
      )}

      {active === "cases" && (
        <section className="record-list">
          {data.cases.map((item) => (
            <Link className="record-row" to={`/dashboard/cases/${item.case_id}`} key={item.case_id}>
              <span className="soft-tag">{item.status}</span><strong>Case #{item.case_id}</strong><span>{item.priority}</span><span>{item.result}</span>
            </Link>
          ))}
          <Link className="button primary" to={`/dashboard/cases?watchId=${watch.watch_id}`}>Open authentication case</Link>
        </section>
      )}

      {["parts", "auctions", "checks"].includes(active) && (
        <section className="record-list">
          {data[active].map((item) => (
            <div className="record-row" key={item.part_id || item.auction_id || item.check_id}>
              {Object.entries(item).filter(([key]) => !key.endsWith("_id") && key !== "notes").slice(0, 5).map(([key, value]) => (
                <span key={key}><small>{key.replaceAll("_", " ")}</small>{String(value ?? "-")}</span>
              ))}
            </div>
          ))}
          {!data[active].length && <p className="empty-copy">No records in this section.</p>}
        </section>
      )}
    </>
  );
}
