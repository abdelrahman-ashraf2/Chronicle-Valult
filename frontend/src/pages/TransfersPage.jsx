import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

export default function TransfersPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [watches, setWatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ watchId: "", toUserId: "", note: "" });
  const [notice, setNotice] = useState("");
  const load = () => api.transfers().then(setRecords);
  useEffect(() => {
    load();
    api.watches({ pageSize: 100 }).then((result) => setWatches(result.items));
    api.organizationMembers().then(setUsers).catch(() => setUsers([]));
  }, []);
  async function create(event) {
    event.preventDefault();
    const result = await api.createTransfer(form);
    setNotice(result.message);
    await load();
  }
  async function respond(id, action) {
    const result = await api.respondTransfer(id, action);
    setNotice(result.message);
    await load();
  }
  return (
    <>
      <PageHeader eyebrow="Ownership workflow" title="Transfers" description="Ownership changes require an explicit request and acceptance trail." />
      {notice && <div className="alert success">{notice}</div>}
      <section className="detail-grid">
        <article className="data-panel record-list">
          {records.map((item) => (
            <div className="record-row" key={item.transfer_id}>
              <span className="soft-tag">{item.status}</span>
              <strong>{item.brand_name} {item.model_name}</strong>
              <span>{item.from_username} → {item.to_username}</span>
              {item.status === "Pending" && item.to_user_id === user.id && (
                <span className="row-actions">
                  <button className="text-button" onClick={() => respond(item.transfer_id, "Accepted")}>Accept</button>
                  <button className="text-button danger" onClick={() => respond(item.transfer_id, "Declined")}>Decline</button>
                </span>
              )}
            </div>
          ))}
        </article>
        {users.length > 0 && (
          <form className="overview-card compact-form" onSubmit={create}>
            <h2>Request transfer</h2>
            <select value={form.watchId} onChange={(e) => setForm({ ...form, watchId: e.target.value })} required>
              <option value="">Select watch...</option>
              {watches.map((watch) => <option value={watch.watch_id} key={watch.watch_id}>{watch.brand_name} {watch.model_name}</option>)}
            </select>
            <select value={form.toUserId} onChange={(e) => setForm({ ...form, toUserId: e.target.value })} required>
              <option value="">New owner...</option>
              {users.filter((member) => member.user_id !== user.id).map((member) => <option value={member.user_id} key={member.user_id}>{member.username}</option>)}
            </select>
            <textarea placeholder="Transfer note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="button primary">Request transfer</button>
          </form>
        )}
      </section>
    </>
  );
}
