import pool from "../config/db.js";

export async function findActiveSessionUser(userId) {
  const [rows] = await pool.execute(
    `SELECT u.user_id, u.username, u.role, u.organization_id, u.status,
            u.token_version, o.organization_id AS active_organization_id,
            o.organization_name,
            o.plan AS organization_plan
     FROM Users u
     LEFT JOIN Organizations o
       ON u.organization_id = o.organization_id
      AND o.archived_at IS NULL
     WHERE u.user_id = ?
       AND u.archived_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export function toSafeUser(user) {
  return {
    id: user.user_id,
    username: user.username,
    role: user.role,
    organizationId: user.organization_id,
    organizationName: user.organization_name || null,
    organizationPlan: user.organization_plan || null
  };
}
