import pool from "../config/db.js";

function requestIp(req) {
  return req.ip || req.socket?.remoteAddress || null;
}

export async function writeAuditEvent({
  executor = pool,
  req,
  action,
  resourceType,
  resourceId = null,
  organizationId = null,
  metadata = null,
  actorUserId = null
}) {
  await executor.execute(
    `INSERT INTO AuditLogs (
       organization_id, actor_user_id, action, resource_type, resource_id,
       ip_address, user_agent, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationId ?? req?.user?.organizationId ?? null,
      actorUserId ?? req?.user?.id ?? null,
      action,
      resourceType,
      resourceId,
      req ? requestIp(req) : null,
      req?.get?.("user-agent")?.slice(0, 255) || null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}
