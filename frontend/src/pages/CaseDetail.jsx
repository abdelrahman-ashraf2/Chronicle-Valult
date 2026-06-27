import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isUser } from "../config/roles.js";
import { api } from "../services/api.js";

export default function CaseDetail() {
  const { caseId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [transition, setTransition] = useState({ status: "", result: "Authentic", summary: "", serialStatus: "Verified", partsStatus: "Original", auctionStatus: "Clear" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = () => api.case(caseId).then(setData).catch((requestError) => setError(requestError.message));
  useEffect(() => {
    load();
  }, [caseId]);
  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="overview-loading">Preparing authentication workspace...</div>;

  async function addComment(event) {
    event.preventDefault();
    await api.addCaseComment(caseId, { comment, internal });
    setComment("");
    setNotice("Comment added.");
    await load();
  }
  async function moveCase(event) {
    event.preventDefault();
    await api.transitionCase(caseId, transition);
    setNotice("Case status updated.");
    await load();
  }

  return (
    <>
      <PageHeader
        eyebrow={`Case #${data.case.case_id}`}
        title={`${data.case.brand_name} ${data.case.model_name}`}
        description={`${data.case.serial_number} · Requested by ${data.case.requester_username}`}
        actions={<Link className="button secondary" to="/dashboard/cases">Back to cases</Link>}
      />
      {notice && <div className="alert success">{notice}</div>}
      <section className="case-status-strip">
        <span className="soft-tag">{data.case.status}</span>
        <div><small>Priority</small><strong>{data.case.priority}</strong></div>
        <div><small>Result</small><strong>{data.case.result}</strong></div>
        <div><small>Assigned to</small><strong>{data.case.assignee_username || "Unassigned"}</strong></div>
      </section>
      <section className="detail-grid">
        <article className="overview-card">
          <div className="card-heading"><h2>Case discussion</h2></div>
          <div className="comment-thread">
            {data.comments.map((item) => (
              <div className={`comment${item.is_internal ? " internal" : ""}`} key={item.comment_id}>
                <div><strong>{item.username}</strong><time>{item.created_at}</time></div>
                <p>{item.comment_text}</p>
                {item.is_internal ? <span className="soft-tag">Internal</span> : null}
              </div>
            ))}
            {!data.comments.length && <p className="empty-copy">No discussion yet.</p>}
          </div>
          <form className="compact-form" onSubmit={addComment}>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a case comment..." required />
            {!isUser(user) && <label className="checkbox-field"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal team note</label>}
            <button className="button primary">Add comment</button>
          </form>
        </article>
        <aside className="overview-card">
          <h2>Workflow</h2>
          {data.allowedTransitions.length ? (
            <form className="compact-form" onSubmit={moveCase}>
              <select value={transition.status} onChange={(e) => setTransition({ ...transition, status: e.target.value })} required>
                <option value="">Select next status...</option>
                {data.allowedTransitions.map((value) => <option key={value}>{value}</option>)}
              </select>
              {transition.status === "Completed" && (
                <>
                  <select value={transition.result} onChange={(e) => setTransition({ ...transition, result: e.target.value })}>
                    {["Authentic", "Questionable", "Counterfeit"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <select value={transition.serialStatus} onChange={(e) => setTransition({ ...transition, serialStatus: e.target.value })}>
                    {["Verified", "Mismatch", "Unknown"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <select value={transition.partsStatus} onChange={(e) => setTransition({ ...transition, partsStatus: e.target.value })}>
                    {["Original", "Mixed", "Replacement", "Unknown"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <select value={transition.auctionStatus} onChange={(e) => setTransition({ ...transition, auctionStatus: e.target.value })}>
                    {["Clear", "Flagged", "No Record"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </>
              )}
              <textarea placeholder="Decision summary" value={transition.summary} onChange={(e) => setTransition({ ...transition, summary: e.target.value })} />
              <button className="button primary">Update case</button>
            </form>
          ) : <p className="muted">This case has reached a final state.</p>}
          <div className="case-evidence">
            <h3>Evidence</h3>
            {data.evidence.map((item) => <a href={api.evidenceUrl(item.evidence_id)} target="_blank" rel="noreferrer" key={item.evidence_id}>{item.category}: {item.original_name}</a>)}
          </div>
        </aside>
      </section>
    </>
  );
}
