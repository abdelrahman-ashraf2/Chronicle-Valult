import crypto from "node:crypto";
import pool from "../config/db.js";

export async function deliverWebhooks(organizationId, eventType, payload) {
  const [rows] = await pool.execute(
    `SELECT webhook_id, endpoint_url, secret_hash, event_types
     FROM Webhooks WHERE organization_id = ? AND status = 'Active'`,
    [organizationId]
  );
  await Promise.allSettled(rows.map(async (hook) => {
    const eventTypes = typeof hook.event_types === "string"
      ? JSON.parse(hook.event_types)
      : hook.event_types;
    if (!eventTypes.includes(eventType)) return;
    const body = JSON.stringify({ id: crypto.randomUUID(), type: eventType, createdAt: new Date().toISOString(), data: payload });
    const signature = crypto.createHmac("sha256", hook.secret_hash).update(body).digest("hex");
    let statusCode = null;
    try {
      const response = await fetch(hook.endpoint_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Chronicle-Signature": signature },
        body,
        signal: AbortSignal.timeout(5000)
      });
      statusCode = response.status;
    } catch {
      statusCode = 0;
    }
    await pool.execute(
      `UPDATE Webhooks SET last_delivery_at = CURRENT_TIMESTAMP, last_status_code = ?
       WHERE webhook_id = ?`,
      [statusCode, hook.webhook_id]
    );
  }));
}
