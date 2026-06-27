import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { api } from "../services/api.js";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const load = () => api.notifications().then(setItems);
  useEffect(() => {
    load();
  }, []);
  async function mark(item) {
    if (!item.read_at) await api.markNotificationRead(item.notification_id);
    await load();
  }
  return (
    <>
      <PageHeader eyebrow="Activity center" title="Notifications" description="Case decisions, transfer requests, and workflow updates appear here." />
      <section className="notification-list">
        {items.map((item) => (
          <article className={`notification-card${item.read_at ? "" : " unread"}`} key={item.notification_id}>
            <div><span className="soft-tag">{item.type}</span><h2>{item.title}</h2><p>{item.message}</p><time>{item.created_at}</time></div>
            {item.link_path && <Link className="text-button" to={item.link_path} onClick={() => mark(item)}>Open</Link>}
          </article>
        ))}
        {!items.length && <p className="empty-copy">You are all caught up.</p>}
      </section>
    </>
  );
}
