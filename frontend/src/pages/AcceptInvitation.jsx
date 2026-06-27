import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api.js";

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.acceptInvitation({ token, ...form });
      navigate("/login", { replace: true, state: { invitationAccepted: true } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Organization invitation</p>
        <h1>Create your account</h1>
        <p>Choose credentials for your Chronicle Vault workspace.</p>
        {error && <div className="alert error">{error}</div>}
        <form className="compact-form" onSubmit={submit}>
          <label>
            Username
            <input autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" minLength="10" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </label>
          <button className="button primary" disabled={saving}>
            {saving ? "Creating account..." : "Accept invitation"}
          </button>
        </form>
        <Link className="text-button" to="/">Back to Chronicle Vault</Link>
      </section>
    </main>
  );
}
