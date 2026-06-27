import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function TeamPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ email: "", role: "User" });
  const [secret, setSecret] = useState("");
  const [notice, setNotice] = useState("");
  const load = () => api.invitations().then(setItems);
  useEffect(() => {
    load();
  }, []);
  async function create(event) {
    event.preventDefault();
    const result = await api.createInvitation(form);
    setSecret(result.invitationToken);
    setNotice(result.message);
    setForm({ email: "", role: "User" });
    await load();
  }
  return (
    <>
      <PageHeader eyebrow="Organization access" title="Team invitations" description="Invite members without sharing passwords. Invitation tokens expire after seven days." />
      {notice && <div className="alert success">{notice}</div>}
      {secret && <div className="secret-reveal"><strong>Invitation link</strong><code>{`${window.location.origin}/accept-invite/${secret}`}</code><small>This is shown once. Deliver it securely to the invited member.</small></div>}
      <section className="detail-grid">
        <article className="data-panel record-list">
          {items.map((item) => (
            <div className="record-row" key={item.invitation_id}>
              <span className="soft-tag">{item.status}</span><strong>{item.email}</strong><span>{item.role}</span><span>{item.expires_at}</span>
            </div>
          ))}
          {!items.length && <p className="empty-copy">No invitations yet.</p>}
        </article>
        <form className="overview-card compact-form" onSubmit={create}>
          <h2>Invite member</h2>
          <input type="email" placeholder="member@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option>User</option><option>OrgAdmin</option>
          </select>
          <button className="button primary">Create invitation</button>
        </form>
      </section>
    </>
  );
}
