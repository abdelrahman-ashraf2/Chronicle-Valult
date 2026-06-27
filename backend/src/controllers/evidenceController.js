import fs from "node:fs/promises";
import path from "node:path";
import pool from "../config/db.js";
import { env } from "../config/env.js";
import { isSuperAdmin, isUser } from "../config/roles.js";
import { getCaseForActor, getWatchForActor } from "../services/platformAccess.js";
import { assertEvidenceCapacity } from "../services/entitlementService.js";
import { BadRequestError, NotFoundError } from "../utils/httpErrors.js";

export async function uploadEvidence(req, res, next) {
  try {
    if (!req.file) throw new BadRequestError("Evidence file is required.");
    const watch = await getWatchForActor(req.user, Number(req.body.watchId));
    await assertEvidenceCapacity(watch.organization_id, req.file.size);
    let caseId = null;
    if (req.body.caseId) {
      const record = await getCaseForActor(req.user, Number(req.body.caseId));
      if (record.watch_id !== watch.watch_id) {
        throw new BadRequestError("Evidence case and watch must match.");
      }
      caseId = record.case_id;
    }
    const allowed = ["Watch", "Dial", "Movement", "Case", "Serial", "Certificate", "Receipt", "Auction", "Other"];
    const category = allowed.includes(req.body.category) ? req.body.category : "Other";
    const [result] = await pool.execute(
      `INSERT INTO EvidenceFiles
       (organization_id, watch_id, case_id, uploaded_by_user_id, category,
        original_name, storage_name, mime_type, size_bytes, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        watch.organization_id,
        watch.watch_id,
        caseId,
        req.user.id,
        category,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.body.description || null
      ]
    );
    await pool.execute(
      `INSERT INTO ProvenanceEvents
       (organization_id, watch_id, created_by_user_id, event_type, event_date, title, description)
       VALUES (?, ?, ?, 'Document', CURRENT_DATE, ?, ?)`,
      [
        watch.organization_id,
        watch.watch_id,
        req.user.id,
        `${category} evidence uploaded`,
        req.body.description || req.file.originalname
      ]
    );
    return res.status(201).json({ evidenceId: result.insertId, message: "Evidence uploaded." });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return next(error);
  }
}

export async function downloadEvidence(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, w.user_id AS owner_user_id
       FROM EvidenceFiles e INNER JOIN Watches w ON e.watch_id = w.watch_id
       WHERE e.evidence_id = ? AND e.archived_at IS NULL AND w.archived_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    const evidence = rows[0];
    if (
      !evidence ||
      (!isSuperAdmin(req.user) && evidence.organization_id !== req.user.organizationId) ||
      (isUser(req.user) && evidence.owner_user_id !== req.user.id)
    ) {
      throw new NotFoundError("Evidence not found.");
    }
    return res.download(path.resolve(env.uploadDir, evidence.storage_name), evidence.original_name);
  } catch (error) {
    return next(error);
  }
}
