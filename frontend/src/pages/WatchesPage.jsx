import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function WatchesPage() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api.watches({ search, page, pageSize: 12 })
        .then(setData)
        .catch((requestError) => setError(requestError.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, page]);

  return (
    <>
      <PageHeader
        eyebrow="Collection registry"
        title="Watches"
        description="Open a dossier to review evidence, provenance, cases, auctions, parts, and public verification."
        actions={(
          <>
            <Link className="button primary" to="/dashboard/resources/watches">Register watch</Link>
            <a className="button secondary" href={api.exportUrl("watches")}>Export CSV</a>
          </>
        )}
      />
      <section className="data-panel">
        <div className="table-toolbar">
          <div className="search-box">
            <input
              type="search"
              placeholder="Search brand, model, or serial..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <span className="muted">{data.pagination.total || 0} watches</span>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="watch-card-grid">
          {loading ? <div className="skeleton-card" /> : data.items.map((watch) => (
            <Link className="watch-card" to={`/dashboard/watches/${watch.watch_id}`} key={watch.watch_id}>
              <div className="watch-card-visual">
                {watch.cover_image_url
                  ? <img src={watch.cover_image_url} alt="" />
                  : <span>{watch.brand_name?.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div>
                <p className="eyebrow">{watch.brand_name}</p>
                <h2>{watch.model_name}</h2>
                <p className="serial-copy">{watch.serial_number}</p>
                <div className="watch-meta">
                  <span>{watch.production_year || "Year unknown"}</span>
                  <span>{watch.watch_condition}</span>
                  <span className={`soft-tag ${watch.public_visibility === "Verified" ? "result-authentic" : ""}`}>
                    {watch.public_visibility}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {!loading && !data.items.length && <p className="empty-copy">No watches match this view.</p>}
        </div>
        <div className="pagination">
          <button className="button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.pagination.page || 1} of {data.pagination.totalPages || 1}</span>
          <button className="button secondary" disabled={page >= (data.pagination.totalPages || 1)} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </section>
    </>
  );
}
