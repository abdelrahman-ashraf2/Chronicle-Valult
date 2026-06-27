import pool from "../config/db.js";
import { isSuperAdmin, isUser } from "../config/roles.js";
import { writeAuditEvent } from "../services/auditService.js";
import {
  createNotification,
  getCaseForActor,
  getPagination,
  getWatchForActor
} from "../services/platformAccess.js";
import { BadRequestError, ForbiddenError } from "../utils/httpErrors.js";
import { deliverWebhooks } from "../services/webhookService.js";

export const caseTransitions = {
  Draft: ["Submitted", "Canceled"],
  Submitted: ["InReview", "NeedsEvidence", "Canceled"],
  InReview: ["NeedsEvidence", "Completed", "Canceled"],
  NeedsEvidence: ["Submitted", "InReview", "Canceled"],
  Completed: [],
  Canceled: []
};

export async function listCases(req, res, next) {
  try {
    const { page, pageSize, offset } = getPagination(req);
    const clauses = ["c.archived_at IS NULL", "w.archived_at IS NULL"];
    const values = [];
    if (!isSuperAdmin(req.user)) {
      clauses.push("c.organization_id = ?");
      values.push(req.user.organizationId);
    }
    if (isUser(req.user)) {
      clauses.push("w.user_id = ?");
      values.push(req.user.id);
    }
    if (req.query.status) {
      clauses.push("c.status = ?");
      values.push(req.query.status);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const [[items], [counts]] = await Promise.all([
      pool.execute(
        `SELECT c.case_id, c.watch_id, c.status, c.priority, c.result, c.summary,
                c.created_at, c.updated_at, w.model_name, w.serial_number,
                b.brand_name, assignee.username AS assignee_username
         FROM AuthenticationCases c
         INNER JOIN Watches w ON c.watch_id = w.watch_id
         LEFT JOIN Brands b ON w.brand_id = b.brand_id
         LEFT JOIN Users assignee ON c.assigned_to_user_id = assignee.user_id
         ${where} ORDER BY c.updated_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
        values
      ),
      pool.execute(
        `SELECT COUNT(*) AS total FROM AuthenticationCases c
         INNER JOIN Watches w ON c.watch_id = w.watch_id ${where}`,
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

export async function createCase(req, res, next) {
  try {
    const watch = await getWatchForActor(req.user, Number(req.body.watchId));
    const priority = req.body.priority || "Normal";
    if (!["Low", "Normal", "High", "Urgent"].includes(priority)) {
      throw new BadRequestError("Invalid priority.");
    }
    const [result] = await pool.execute(
      `INSERT INTO AuthenticationCases
       (organization_id, watch_id, requested_by_user_id, priority, summary)
       VALUES (?, ?, ?, ?, ?)`,
      [watch.organization_id, watch.watch_id, req.user.id, priority, req.body.summary || null]
    );
    await pool.execute(
      `INSERT INTO ProvenanceEvents
       (organization_id, watch_id, created_by_user_id, event_type, event_date, title, description)
       VALUES (?, ?, ?, 'Authentication', CURRENT_DATE, 'Authentication case opened', ?)`,
      [watch.organization_id, watch.watch_id, req.user.id, req.body.summary || null]
    );
    await writeAuditEvent({
      req,
      action: "case.create",
      resourceType: "authentication_cases",
      resourceId: result.insertId,
      organizationId: watch.organization_id
    });
    return res.status(201).json({ caseId: result.insertId, message: "Authentication case created." });
  } catch (error) {
    return next(error);
  }
}

export async function getCaseDetail(req, res, next) {
  try {
    const record = await getCaseForActor(req.user, Number(req.params.id));
    const [[comments], [evidence]] = await Promise.all([
      pool.execute(
        `SELECT cc.comment_id, cc.comment_text, cc.is_internal, cc.created_at,
                u.username FROM CaseComments cc
         INNER JOIN Users u ON cc.user_id = u.user_id
         WHERE cc.case_id = ? ${isUser(req.user) ? "AND cc.is_internal = FALSE" : ""}
         ORDER BY cc.comment_id ASC`,
        [record.case_id]
      ),
      pool.execute(
        `SELECT evidence_id, category, original_name, mime_type, size_bytes,
                description, created_at FROM EvidenceFiles
         WHERE case_id = ? AND archived_at IS NULL ORDER BY evidence_id DESC`,
        [record.case_id]
      )
    ]);
    return res.json({
      case: record,
      comments,
      evidence,
      allowedTransitions: caseTransitions[record.status]
    });
  } catch (error) {
    return next(error);
  }
}

export async function transitionCase(req, res, next) {
  try {
    const record = await getCaseForActor(req.user, Number(req.params.id));
    const nextStatus = req.body.status;
    if (!caseTransitions[record.status]?.includes(nextStatus)) {
      throw new BadRequestError(`Cannot move a case from ${record.status} to ${nextStatus}.`);
    }
    if (isUser(req.user) && !["Submitted", "Canceled"].includes(nextStatus)) {
      throw new ForbiddenError("Members can only submit or cancel their cases.");
    }
    const result = req.body.result || record.result;
    if (nextStatus === "Completed" && !["Authentic", "Questionable", "Counterfeit"].includes(result)) {
      throw new BadRequestError("A completed case requires a final result.");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let assignedToUserId = null;
      if (req.body.assignedToUserId) {
        const [assignees] = await connection.execute(
          `SELECT user_id FROM Users
           WHERE user_id = ? AND organization_id = ? AND status = 'Active'
             AND archived_at IS NULL LIMIT 1`,
          [req.body.assignedToUserId, record.organization_id]
        );
        if (!assignees[0]) throw new BadRequestError("Assignee must be an active organization member.");
        assignedToUserId = assignees[0].user_id;
      }
      await connection.execute(
        `UPDATE AuthenticationCases
         SET status = ?, result = ?, summary = COALESCE(?, summary),
             assigned_to_user_id = COALESCE(?, assigned_to_user_id),
             submitted_at = IF(? = 'Submitted', COALESCE(submitted_at, CURRENT_TIMESTAMP), submitted_at),
             completed_at = IF(? = 'Completed', CURRENT_TIMESTAMP, completed_at)
         WHERE case_id = ?`,
        [
          nextStatus,
          result,
          req.body.summary || null,
          assignedToUserId,
          nextStatus,
          nextStatus,
          record.case_id
        ]
      );
      if (nextStatus === "Completed") {
        await connection.execute(
          `INSERT INTO AuthenticationChecks
           (organization_id, watch_id, user_id, check_date, serial_status, parts_status,
            auction_status, final_result, notes)
           VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?)`,
          [
            record.organization_id,
            record.watch_id,
            record.owner_user_id,
            req.body.serialStatus || "Unknown",
            req.body.partsStatus || "Unknown",
            req.body.auctionStatus || "No Record",
            result,
            req.body.summary || record.summary
          ]
        );
      }
      await createNotification(
        connection,
        record.owner_user_id,
        "case.status",
        `Authentication case ${nextStatus}`,
        `${record.brand_name || ""} ${record.model_name} is now ${nextStatus}.`.trim(),
        `/dashboard/cases/${record.case_id}`
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    await writeAuditEvent({
      req,
      action: "case.transition",
      resourceType: "authentication_cases",
      resourceId: record.case_id,
      metadata: { from: record.status, to: nextStatus, result }
    });
    if (nextStatus === "Completed") {
      void deliverWebhooks(record.organization_id, "case.completed", {
        caseId: record.case_id,
        watchId: record.watch_id,
        result
      });
    }
    return res.json({ message: `Case moved to ${nextStatus}.` });
  } catch (error) {
    return next(error);
  }
}

export async function addCaseComment(req, res, next) {
  try {
    const record = await getCaseForActor(req.user, Number(req.params.id));
    const text = String(req.body.comment || "").trim();
    if (!text || text.length > 4000) {
      throw new BadRequestError("Comment must contain 1 to 4000 characters.");
    }
    const internal = !isUser(req.user) && Boolean(req.body.internal);
    const [result] = await pool.execute(
      `INSERT INTO CaseComments (case_id, user_id, comment_text, is_internal)
       VALUES (?, ?, ?, ?)`,
      [record.case_id, req.user.id, text, internal]
    );
    return res.status(201).json({ commentId: result.insertId, message: "Comment added." });
  } catch (error) {
    return next(error);
  }
}
