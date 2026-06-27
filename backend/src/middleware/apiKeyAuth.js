import crypto from "node:crypto";
import pool from "../config/db.js";
import { UnauthorizedError } from "../utils/httpErrors.js";

export async function requireApiKey(req, _res, next) {
  try {
    const raw = req.get("x-api-key");
    if (!raw) throw new UnauthorizedError("API key is required.");
    const keyHash = crypto.createHash("sha256").update(raw).digest("hex");
    const [rows] = await pool.execute(
      `SELECT k.api_key_id, k.organization_id
       FROM ApiKeys k
       INNER JOIN Subscriptions s ON k.organization_id = s.organization_id
       INNER JOIN Plans p ON s.plan_id = p.plan_id
       WHERE k.key_hash = ? AND k.revoked_at IS NULL
         AND (k.expires_at IS NULL OR k.expires_at > CURRENT_TIMESTAMP)
         AND s.status IN ('Trial', 'Active') AND p.api_access = TRUE
       LIMIT 1`,
      [keyHash]
    );
    if (!rows[0]) throw new UnauthorizedError("Invalid or expired API key.");
    req.apiClient = rows[0];
    await pool.execute(
      `UPDATE ApiKeys SET last_used_at = CURRENT_TIMESTAMP WHERE api_key_id = ?`,
      [rows[0].api_key_id]
    );
    return next();
  } catch (error) {
    return next(error);
  }
}
