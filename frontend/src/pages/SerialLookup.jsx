import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../services/api.js";

export default function SerialLookup({ onNavigate }) {
  const [serial, setSerial] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLookup(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      setResult(await api.lookup(serial.trim()));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lookup-page">
      <Navbar onNavigate={onNavigate} />
      <section className="lookup-hero">
        <p className="eyebrow">Public Lookup</p>
        <h1>Serial Number Lookup</h1>
        <p>Enter a serial number to view only the safe public authentication fields for a registered watch.</p>
        <form className="lookup-form" onSubmit={handleLookup}>
          <input
            value={serial}
            onChange={(event) => setSerial(event.target.value)}
            placeholder="Enter serial number"
            required
          />
          <button className="button primary" disabled={loading}>
            {loading ? "Searching..." : "Lookup"}
          </button>
        </form>
        {error && <div className="alert error lookup-alert">{error}</div>}
      </section>

      {result && (
        <section className="verification-card">
          <div className="verification-heading">
            <div>
              <span className="verification-kicker">Public result</span>
              <h2>{result.watch.brand_name} {result.watch.model_name}</h2>
              <p>{result.watch.serial_number}</p>
            </div>
            <span className={`result-seal ${result.latestCheck?.final_result?.toLowerCase() || "pending"}`}>
              {result.latestCheck?.final_result || "Registered"}
            </span>
          </div>

          <div className="verification-grid">
            <div><small>Brand</small><strong>{result.watch.brand_name}</strong></div>
            <div><small>Model</small><strong>{result.watch.model_name}</strong></div>
            <div><small>Production Year</small><strong>{result.watch.production_year || "Unknown"}</strong></div>
            <div><small>Case Material</small><strong>{result.watch.case_material || "Not recorded"}</strong></div>
            <div><small>Condition</small><strong>{result.watch.watch_condition || "Unknown"}</strong></div>
            <div><small>Final Result</small><strong>{result.latestCheck?.final_result || "No check"}</strong></div>
            <div><small>Serial Status</small><strong>{result.latestCheck?.serial_status || "Unknown"}</strong></div>
            <div><small>Parts Status</small><strong>{result.latestCheck?.parts_status || "Unknown"}</strong></div>
          </div>

          <div className="check-summary safe-summary">
            <div className="summary-title">
              <span>Latest auction status</span>
              <time>{result.latestCheck?.check_date || "No dated check"}</time>
            </div>
            <div className="status-row">
              <span>Auction <b>{result.latestCheck?.auction_status || "Unknown"}</b></span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
