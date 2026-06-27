import pool from "../config/db.js";
import { isSuperAdmin, isUser } from "../config/roles.js";
import { writeAuditEvent } from "../services/auditService.js";
import { getPagination, getWatchForActor } from "../services/platformAccess.js";
import { BadRequestError, ForbiddenError } from "../utils/httpErrors.js";

export async function listWatchesV1(req, res, next) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const search = String(req.query.search || "").trim();
    const clauses = ["w.archived_at IS NULL"];
    const values = [];
    if (!isSuperAdmin(req.user)) {
      clauses.push("w.organization_id = ?");
      values.push(req.user.organizationId);
    }
    if (isUser(req.user)) {
      clauses.push("w.user_id = ?");
      values.push(req.user.id);
    }
    if (search) {
      clauses.push("(w.model_name LIKE ? OR w.serial_number LIKE ? OR b.brand_name LIKE ?)");
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const [[items], [counts]] = await Promise.all([
      pool.execute(
        `SELECT w.watch_id, w.user_id, w.model_name, w.serial_number, w.reference_number,
                w.production_year, w.case_material, w.watch_condition,
                w.public_visibility, w.cover_image_url, b.brand_name,
                m.movement_name, u.username AS owner_username
         FROM Watches w
         LEFT JOIN Brands b ON w.brand_id = b.brand_id
         LEFT JOIN Movements m ON w.movement_id = m.movement_id
         LEFT JOIN Users u ON w.user_id = u.user_id
         ${where}
         ORDER BY w.updated_at DESC, w.watch_id DESC LIMIT ${pageSize} OFFSET ${offset}`,
        values
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM Watches w
         LEFT JOIN Brands b ON w.brand_id = b.brand_id ${where}`,
        values
      )
    ]);
    return res.json({
      items,
      pagination: {
        page,
        pageSize,
        total: counts[0].total,
        totalPages: Math.ceil(counts[0].total / pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getWatchDetail(req, res, next) {
  try {
    const watch = await getWatchForActor(req.user, Number(req.params.id));
    const [[parts], [auctions], [checks], [cases], [evidence], [provenance]] =
      await Promise.all([
        pool.execute(
          `SELECT part_id, part_name, part_status, created_at FROM WatchParts
           WHERE watch_id = ? AND archived_at IS NULL ORDER BY part_id DESC`,
          [watch.watch_id]
        ),
        pool.execute(
          `SELECT auction_id, auction_house, auction_date, sale_price, currency
           FROM AuctionRecords WHERE watch_id = ? AND archived_at IS NULL
           ORDER BY auction_date DESC`,
          [watch.watch_id]
        ),
        pool.execute(
          `SELECT check_id, check_date, serial_status, parts_status, auction_status,
                  final_result, notes FROM AuthenticationChecks
           WHERE watch_id = ? AND archived_at IS NULL
           ORDER BY check_date DESC, check_id DESC`,
          [watch.watch_id]
        ),
        pool.execute(
          `SELECT case_id, status, priority, result, summary, created_at, updated_at
           FROM AuthenticationCases WHERE watch_id = ? AND archived_at IS NULL
           ORDER BY case_id DESC`,
          [watch.watch_id]
        ),
        pool.execute(
          `SELECT evidence_id, case_id, category, original_name, mime_type,
                  size_bytes, description, created_at FROM EvidenceFiles
           WHERE watch_id = ? AND archived_at IS NULL ORDER BY evidence_id DESC`,
          [watch.watch_id]
        ),
        pool.execute(
          `SELECT event_id, event_type, event_date, title, description, source_url,
                  created_at FROM ProvenanceEvents WHERE watch_id = ?
           ORDER BY event_date DESC, event_id DESC`,
          [watch.watch_id]
        )
      ]);
    return res.json({ watch, parts, auctions, checks, cases, evidence, provenance });
  } catch (error) {
    return next(error);
  }
}

export async function updateWatchPublishing(req, res, next) {
  try {
    const watch = await getWatchForActor(req.user, Number(req.params.id));
    if (isUser(req.user)) {
      throw new ForbiddenError("Only organization administrators can publish verification records.");
    }
    if (!["Private", "Verified"].includes(req.body.publicVisibility)) {
      throw new BadRequestError("Invalid public visibility.");
    }
    await pool.execute(
      `UPDATE Watches SET public_visibility = ? WHERE watch_id = ?`,
      [req.body.publicVisibility, watch.watch_id]
    );
    await writeAuditEvent({
      req,
      action: "watch.visibility",
      resourceType: "watches",
      resourceId: watch.watch_id,
      metadata: { visibility: req.body.publicVisibility }
    });
    return res.json({
      message: "Publishing settings updated.",
      publicToken: watch.public_token,
      publicVisibility: req.body.publicVisibility
    });
  } catch (error) {
    return next(error);
  }
}

export async function addProvenanceEvent(req, res, next) {
  try {
    const watch = await getWatchForActor(req.user, Number(req.params.id));
    const allowed = ["Ownership", "Service", "Auction", "Authentication", "Document", "Note"];
    if (!allowed.includes(req.body.eventType) || !req.body.eventDate || !req.body.title) {
      throw new BadRequestError("Event type, date, and title are required.");
    }
    const [result] = await pool.execute(
      `INSERT INTO ProvenanceEvents
       (organization_id, watch_id, created_by_user_id, event_type, event_date,
        title, description, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        watch.organization_id,
        watch.watch_id,
        req.user.id,
        req.body.eventType,
        req.body.eventDate,
        req.body.title,
        req.body.description || null,
        req.body.sourceUrl || null
      ]
    );
    return res.status(201).json({ eventId: result.insertId, message: "Provenance event added." });
  } catch (error) {
    return next(error);
  }
}
