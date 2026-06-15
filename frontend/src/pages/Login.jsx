import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login({ onNavigate, onSuccess }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      onSuccess();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <Navbar onNavigate={onNavigate} />
      <button className="back-link" onClick={() => onNavigate("home")}>Back to Chronicle Vault</button>
      <section className="login-panel">
        <div className="brand-mark" aria-hidden="true">
          <span>12</span>
          <span className="brand-hand" />
        </div>
        <p className="eyebrow">Private Collection Registry</p>
        <h1>Chronicle Vault</h1>
        <p className="muted">Enter your private collection workspace.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="button primary wide" disabled={loading}>
            {loading ? "Opening vault..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
