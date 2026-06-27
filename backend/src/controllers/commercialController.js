import crypto from "node:crypto";
import { parse } from "csv-parse/sync";
import pool from "../config/db.js";
import { isSuperAdmin, isUser } from "../config/roles.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/httpErrors.js";
import { getOrganizationEntitlements, requireEntitlement } from "../services/entitlementService.js";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

export async function listPlans(_req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT plan_code, plan_name, monthly_price, watch_limit, user_limit,
              evidence_limit_mb, api_access, white_label
       FROM Plans ORDER BY monthly_price ASC`
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function getOrganizationSettings(req, res, next) {
  try {
    if (isUser(req.user)) throw new ForbiddenError();
    const organizationId = isSuperAdmin(req.user)
      ? Number(req.query.organizationId || 0)
      : req.user.organizationId;
    if (!organizationId) throw new BadRequestError("Organization is required.");
    const [rows] = await pool.execute(
      `SELECT o.organization_id, o.organization_name, o.slug, o.logo_url,
              o.accent_color, o.custom_domain, p.plan_name, p.watch_limit,
              p.user_limit, p.api_access, p.white_label,
              s.status AS subscription_status
       FROM Organizations o
       LEFT JOIN Subscriptions s ON o.organization_id = s.organization_id
       LEFT JOIN Plans p ON s.plan_id = p.plan_id
       WHERE o.organization_id = ? AND o.archived_at IS NULL LIMIT 1`,
      [organizationId]
    );
    if (!rows[0]) throw new NotFoundError("Organization not found.");
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

export async function updateOrganizationSettings(req, res, next) {
  try {
    if (isUser(req.user)) throw new ForbiddenError();
    const organizationId = isSuperAdmin(req.user)
      ? Number(req.body.organizationId)
      : req.user.organizationId;
    if (!organizationId) throw new BadRequestError("Organization is required.");
    await requireEntitlement(
      organizationId,
      "white_label",
      "White-label branding is not included in this plan."
    );
    await pool.execute(
      `UPDATE Organizations SET logo_url = ?, accent_color = ?, custom_domain = ?
       WHERE organization_id = ? AND archived_at IS NULL`,
      [
        req.body.logoUrl || null,
        req.body.accentColor || "#C9A227",
        req.body.customDomain || null,
        organizationId
      ]
    );
    return res.json({ message: "Organization branding updated." });
  } catch (error) {
    return next(error);
  }
}

export async function listApiKeys(req, res, next) {
  try {
    if (isUser(req.user) || isSuperAdmin(req.user)) throw new ForbiddenError();
    const [rows] = await pool.execute(
      `SELECT api_key_id, key_name, key_prefix, last_used_at, expires_at,
              revoked_at, created_at FROM ApiKeys
       WHERE organization_id = ? ORDER BY api_key_id DESC`,
      [req.user.organizationId]
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function createApiKey(req, res, next) {
  try {
    if (isUser(req.user) || isSuperAdmin(req.user)) throw new ForbiddenError();
    await requireEntitlement(req.user.organizationId, "api_access", "API access is not included in this plan.");
    const rawKey = `cv_live_${crypto.randomBytes(24).toString("hex")}`;
    const [result] = await pool.execute(
      `INSERT INTO ApiKeys
       (organization_id, created_by_user_id, key_name, key_prefix, key_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.organizationId,
        req.user.id,
        String(req.body.name || "Partner key").slice(0, 100),
        rawKey.slice(0, 16),
        hash(rawKey),
        req.body.expiresAt || null
      ]
    );
    return res.status(201).json({
      apiKeyId: result.insertId,
      apiKey: rawKey,
      message: "Copy this key now. It will not be shown again."
    });
  } catch (error) {
    return next(error);
  }
}

export async function revokeApiKey(req, res, next) {
  try {
    if (isUser(req.user) || isSuperAdmin(req.user)) throw new ForbiddenError();
    await pool.execute(
      `UPDATE ApiKeys SET revoked_at = CURRENT_TIMESTAMP
       WHERE api_key_id = ? AND organization_id = ?`,
      [req.params.id, req.user.organizationId]
    );
    return res.json({ message: "API key revoked." });
  } catch (error) {
    return next(error);
  }
}

export async function listWebhooks(req, res, next) {
  try {
    if (isUser(req.user) || isSuperAdmin(req.user)) throw new ForbiddenError();
    const [rows] = await pool.execute(
      `SELECT webhook_id, endpoint_url, event_types, status, last_delivery_at,
              last_status_code, created_at FROM Webhooks
       WHERE organization_id = ? ORDER BY webhook_id DESC`,
      [req.user.organizationId]
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function createWebhook(req, res, next) {
  try {
    if (isUser(req.user) || isSuperAdmin(req.user)) throw new ForbiddenError();
    await requireEntitlement(req.user.organizationId, "api_access", "Webhooks are not included in this plan.");
    let endpoint;
    try {
      endpoint = new URL(req.body.endpointUrl);
    } catch {
      throw new BadRequestError("Invalid webhook URL.");
    }
    if (!["https:", "http:"].includes(endpoint.protocol)) {
      throw new BadRequestError("Invalid webhook URL.");
    }
    const secret = crypto.randomBytes(24).toString("hex");
    const signingSecret = hash(secret);
    const events = Array.isArray(req.body.eventTypes)
      ? req.body.eventTypes
      : ["case.completed"];
    const [result] = await pool.execute(
      `INSERT INTO Webhooks
       (organization_id, created_by_user_id, endpoint_url, secret_hash, event_types)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.organizationId, req.user.id, endpoint.toString(), signingSecret, JSON.stringify(events)]
    );
    return res.status(201).json({
      webhookId: result.insertId,
      signingSecret,
      message: "Webhook created. Copy the signing secret now."
    });
  } catch (error) {
    return next(error);
  }
}

export async function exportResourceCsv(req, res, next) {
  try {
    const resources = {
      watches: {
        sql: `SELECT b.brand_name, w.model_name, w.serial_number, w.reference_number,
                     w.production_year, w.case_material, w.watch_condition
              FROM Watches w LEFT JOIN Brands b ON w.brand_id = b.brand_id
              WHERE w.archived_at IS NULL`,
        org: "w.organization_id",
        owner: "w.user_id"
      },
      checks: {
        sql: `SELECT w.serial_number, c.check_date, c.serial_status, c.parts_status,
                     c.auction_status, c.final_result
              FROM AuthenticationChecks c INNER JOIN Watches w ON c.watch_id = w.watch_id
              WHERE c.archived_at IS NULL AND w.archived_at IS NULL`,
        org: "w.organization_id",
        owner: "w.user_id"
      }
    };
    const config = resources[req.params.resource];
    if (!config) throw new NotFoundError("Export not found.");
    const values = [];
    let sql = config.sql;
    if (!isSuperAdmin(req.user)) {
      sql += ` AND ${config.org} = ?`;
      values.push(req.user.organizationId);
    }
    if (isUser(req.user)) {
      sql += ` AND ${config.owner} = ?`;
      values.push(req.user.id);
    }
    const [rows] = await pool.execute(sql, values);
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      headers.map(escape).join(","),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))
    ].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.resource}.csv"`);
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
}

export async function importWatchesCsv(req, res, next) {
  try {
    if (isUser(req.user) || isSuperAdmin(req.user)) throw new ForbiddenError();
    if (!req.file) throw new BadRequestError("Choose a CSV file to import.");
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
    if (!records.length || records.length > 500) {
      throw new BadRequestError("CSV imports must contain between 1 and 500 rows.");
    }
    const entitlements = await getOrganizationEntitlements(req.user.organizationId);
    const [counts] = await pool.execute(
      `SELECT COUNT(*) AS total FROM Watches
       WHERE organization_id = ? AND archived_at IS NULL`,
      [req.user.organizationId]
    );
    if (
      entitlements.watch_limit !== null &&
      Number(counts[0].total) + records.length > Number(entitlements.watch_limit)
    ) {
      throw new ForbiddenError("This import would exceed your plan's watches limit.");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let imported = 0;
      for (const [index, record] of records.entries()) {
        const rowNumber = index + 2;
        const brandName = String(record.brand_name || "").trim();
        const modelName = String(record.model_name || "").trim();
        const serialNumber = String(record.serial_number || "").trim();
        if (!brandName || !modelName || !serialNumber) {
          throw new BadRequestError(`Row ${rowNumber}: brand_name, model_name, and serial_number are required.`);
        }
        const [brands] = await connection.execute(
          `SELECT brand_id FROM Brands
           WHERE organization_id = ? AND brand_name = ? AND archived_at IS NULL LIMIT 1`,
          [req.user.organizationId, brandName]
        );
        if (!brands[0]) throw new BadRequestError(`Row ${rowNumber}: brand "${brandName}" was not found.`);

        let movementId = null;
        if (record.movement_name) {
          const [movements] = await connection.execute(
            `SELECT movement_id FROM Movements
             WHERE organization_id = ? AND movement_name = ? AND archived_at IS NULL LIMIT 1`,
            [req.user.organizationId, String(record.movement_name).trim()]
          );
          if (!movements[0]) {
            throw new BadRequestError(`Row ${rowNumber}: movement "${record.movement_name}" was not found.`);
          }
          movementId = movements[0].movement_id;
        }

        let ownerId = req.user.id;
        if (record.owner_username) {
          const [owners] = await connection.execute(
            `SELECT user_id FROM Users
             WHERE organization_id = ? AND username = ? AND status = 'Active'
               AND archived_at IS NULL LIMIT 1`,
            [req.user.organizationId, String(record.owner_username).trim()]
          );
          if (!owners[0]) {
            throw new BadRequestError(`Row ${rowNumber}: owner "${record.owner_username}" was not found.`);
          }
          ownerId = owners[0].user_id;
        }

        const year = record.production_year ? Number(record.production_year) : null;
        if (year !== null && (!Number.isInteger(year) || year < 1000 || year > 2100)) {
          throw new BadRequestError(`Row ${rowNumber}: production_year is invalid.`);
        }
        const condition = record.watch_condition || "Good";
        if (!["Mint", "Excellent", "Good", "Fair", "Poor"].includes(condition)) {
          throw new BadRequestError(`Row ${rowNumber}: watch_condition is invalid.`);
        }
        await connection.execute(
          `INSERT INTO Watches
           (organization_id, brand_id, movement_id, user_id, model_name,
            serial_number, reference_number, public_token, production_year,
            case_material, watch_condition)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.organizationId,
            brands[0].brand_id,
            movementId,
            ownerId,
            modelName.slice(0, 120),
            serialNumber.slice(0, 100),
            record.reference_number ? String(record.reference_number).slice(0, 120) : null,
            crypto.randomUUID(),
            year,
            record.case_material ? String(record.case_material).slice(0, 80) : null,
            condition
          ]
        );
        imported += 1;
      }
      await connection.commit();
      return res.status(201).json({ imported, message: `${imported} watches imported.` });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return next(error);
  }
}
