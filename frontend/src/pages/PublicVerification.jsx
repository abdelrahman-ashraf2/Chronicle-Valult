import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api.js";

export default function PublicVerification() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.verify(token).then(setData).catch((requestError) => setError(requestError.message)); }, [token]);
  return (
    <main className="lookup-page public-certificate">
      <header className="certificate-nav"><Link to="/">Chronicle Vault</Link><Link to="/lookup">Serial lookup</Link></header>
      {error && <div className="verification-card"><div className="alert error">{error}</div></div>}
      {!error && !data && <div className="app-loading">Verifying registry certificate...</div>}
      {data && (
        <section className="certificate">
          <p className="eyebrow">Public verification certificate</p>
          <h1>{data.watch.brand_name} {data.watch.model_name}</h1>
          <p className="certificate-serial">{data.watch.serial_number}</p>
          <span className={`result-seal ${data.latestCheck?.final_result?.toLowerCase() || "pending"}`}>
            {data.latestCheck?.final_result || "Registered"}
          </span>
          <div className="verification-grid">
            <div><small>Registry</small><strong>{data.watch.organization_name}</strong></div>
            <div><small>Reference</small><strong>{data.watch.reference_number || "Not recorded"}</strong></div>
            <div><small>Production year</small><strong>{data.watch.production_year || "Unknown"}</strong></div>
            <div><small>Condition</small><strong>{data.watch.watch_condition}</strong></div>
            <div><small>Serial status</small><strong>{data.latestCheck?.serial_status || "Unknown"}</strong></div>
            <div><small>Parts status</small><strong>{data.latestCheck?.parts_status || "Unknown"}</strong></div>
            <div><small>Auction status</small><strong>{data.latestCheck?.auction_status || "Unknown"}</strong></div>
            <div><small>Last checked</small><strong>{data.latestCheck?.check_date || "No completed check"}</strong></div>
          </div>
          <p className="certificate-note">This page confirms the current public registry state. Private owner data and internal review notes are never displayed.</p>
        </section>
      )}
    </main>
  );
}
