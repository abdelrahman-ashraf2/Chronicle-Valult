import pool from "../config/db.js";
import { isSuperAdmin, isUser } from "../config/roles.js";
import { NotFoundError } from "../utils/httpErrors.js";

export function getPagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export async function getWatchForActor(actor, watchId) {
  const [rows] = await pool.execute(
    `SELECT w.*, b.brand_name, m.movement_name, u.username AS owner_username
     FROM Watches w
     LEFT JOIN Brands b ON w.brand_id = b.brand_id
     LEFT JOIN Movements m ON w.movement_id = m.movement_id
     LEFT JOIN Users u ON w.user_id = u.user_id
     WHERE w.watch_id = ? AND w.archived_at IS NULL LIMIT 1`,
    [watchId]
  );
  const watch = rows[0];
  if (
    !watch ||
    (!isSuperAdmin(actor) && watch.organization_id !== actor.organizationId) ||
    (isUser(actor) && watch.user_id !== actor.id)
  ) {
    throw new NotFoundError("Watch not found.");
  }
  return watch;
}

export async function getCaseForActor(actor, caseId) {
  const [rows] = await pool.execute(
    `SELECT c.*, w.user_id AS owner_user_id, w.model_name, w.serial_number,
            b.brand_name, requester.username AS requester_username,
            assignee.username AS assignee_username
     FROM AuthenticationCases c
     INNER JOIN Watches w ON c.watch_id = w.watch_id
     LEFT JOIN Brands b ON w.brand_id = b.brand_id
     LEFT JOIN Users requester ON c.requested_by_user_id = requester.user_id
     LEFT JOIN Users assignee ON c.assigned_to_user_id = assignee.user_id
     WHERE c.case_id = ? AND c.archived_at IS NULL AND w.archived_at IS NULL
     LIMIT 1`,
    [caseId]
  );
  const record = rows[0];
  if (
    !record ||
    (!isSuperAdmin(actor) && record.organization_id !== actor.organizationId) ||
    (isUser(actor) && record.owner_user_id !== actor.id)
  ) {
    throw new NotFoundError("Authentication case not found.");
  }
  return record;
}

export async function createNotification(
  executor,
  userId,
  type,
  title,
  message,
  linkPath = null
) {
  await executor.execute(
    `INSERT INTO Notifications (user_id, type, title, message, link_path)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message, linkPath]
  );
}
