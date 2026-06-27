import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function CasesPage() {
  const [params] = useSearchParams();
  const [data, setData] = useState({ items: [], pagination: {} });
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ watchId: params.get("watchId") || "", priority: "Normal", summary: "" });
  const [watches, setWatches] = useState([]);
  const [notice, setNotice] = useState("");
  const load = () => api.cases({ status }).then(setData);
  useEffect(() => { load(); }, [status]);
  useEffect(() => { api.watches({ pageSize: 100 }).then((result) => setWatches(result.items)); }, []);

  async function create(event) {
    event.preventDefault();
    const result = await api.createCase(form);
    setNotice(result.message);
    setForm({ watchId: "", priority: "Normal", summary: "" });
    await load();
  }

  return (
    <>
      <PageHeader eyebrow="Authentication workflow" title="Cases" description="Submit evidence, assign reviews, request more information, and issue final authentication outcomes." />
      {notice && <div className="alert success">{notice}</div>}
      <section className="detail-grid">
        <article className="data-panel">
          <div className="table-toolbar">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["Draft", "Submitted", "InReview", "NeedsEvidence", "Completed", "Canceled"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
          <div className="record-list">
            {data.items.map((item) => (
              <Link className="record-row" to={`/dashboard/cases/${item.case_id}`} key={item.case_id}>
                <span className="soft-tag">{item.status}</span>
                <strong>{item.brand_name} {item.model_name}</strong>
                <span>{item.serial_number}</span><span>{item.priority}</span><span>{item.result}</span>
              </Link>
            ))}
            {!data.items.length && <p className="empty-copy">No cases in this view.</p>}
          </div>
        </article>
        <form className="overview-card compact-form" onSubmit={create}>
          <h2>Open a case</h2>
          <select value={form.watchId} onChange={(e) => setForm({ ...form, watchId: e.target.value })} required>
            <option value="">Select watch...</option>
            {watches.map((watch) => <option value={watch.watch_id} key={watch.watch_id}>{watch.brand_name} {watch.model_name} ({watch.serial_number})</option>)}
          </select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {["Low", "Normal", "High", "Urgent"].map((value) => <option key={value}>{value}</option>)}
          </select>
          <textarea placeholder="Initial review request" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <button className="button primary">Create case</button>
        </form>
      </section>
    </>
  );
}
