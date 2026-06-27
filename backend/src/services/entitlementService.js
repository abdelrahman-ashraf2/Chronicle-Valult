import pool from "../config/db.js";
import { ForbiddenError } from "../utils/httpErrors.js";

export async function getOrganizationEntitlements(organizationId) {
  const [rows] = await pool.execute(
    `SELECT s.status, p.plan_code, p.watch_limit, p.user_limit,
            p.evidence_limit_mb, p.api_access, p.white_label
     FROM Subscriptions s
     INNER JOIN Plans p ON s.plan_id = p.plan_id
     WHERE s.organization_id = ? LIMIT 1`,
    [organizationId]
  );
  const entitlements = rows[0];
  if (!entitlements || !["Trial", "Active"].includes(entitlements.status)) {
    throw new ForbiddenError("An active subscription is required.");
  }
  return entitlements;
}

export async function assertResourceCapacity(organizationId, resource) {
  const entitlements = await getOrganizationEntitlements(organizationId);
  const config = {
    watches: ["watch_limit", "Watches", "organization_id = ? AND archived_at IS NULL"],
    users: ["user_limit", "Users", "organization_id = ? AND archived_at IS NULL"]
  }[resource];
  if (!config || entitlements[config[0]] === null) return entitlements;

  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM ${config[1]} WHERE ${config[2]}`,
    [organizationId]
  );
  if (Number(rows[0].total) >= Number(entitlements[config[0]])) {
    throw new ForbiddenError(`Your plan's ${resource} limit has been reached.`);
  }
  return entitlements;
}

export async function assertEvidenceCapacity(organizationId, incomingBytes) {
  const entitlements = await getOrganizationEntitlements(organizationId);
  if (entitlements.evidence_limit_mb === null) return entitlements;
  const [rows] = await pool.execute(
    `SELECT COALESCE(SUM(size_bytes), 0) AS total_bytes
     FROM EvidenceFiles
     WHERE organization_id = ? AND archived_at IS NULL`,
    [organizationId]
  );
  const limitBytes = Number(entitlements.evidence_limit_mb) * 1024 * 1024;
  if (Number(rows[0].total_bytes) + incomingBytes > limitBytes) {
    throw new ForbiddenError("Your plan's evidence storage limit has been reached.");
  }
  return entitlements;
}

export async function requireEntitlement(organizationId, entitlement, message) {
  const entitlements = await getOrganizationEntitlements(organizationId);
  if (!entitlements[entitlement]) {
    throw new ForbiddenError(message);
  }
  return entitlements;
}
