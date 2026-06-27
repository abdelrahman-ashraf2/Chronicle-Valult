import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { isSuperAdmin, isUser } from "../config/roles.js";
import { createNotification, getWatchForActor } from "../services/platformAccess.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/httpErrors.js";
import { deliverWebhooks } from "../services/webhookService.js";
import { assertResourceCapacity } from "../services/entitlementService.js";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

export async function listOrganizationMembers(req, res, next) {
  try {
    if (isSuperAdmin(req.user) && !req.query.organizationId) {
      return res.json([]);
    }
    const organizationId = isSuperAdmin(req.user)
      ? Number(req.query.organizationId)
      : req.user.organizationId;
    const [rows] = await pool.execute(
      `SELECT user_id, username, role
       FROM Users
       WHERE organization_id = ? AND status = 'Active' AND archived_at IS NULL
       ORDER BY username`,
      [organizationId]
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function listInvitations(req, res, next) {
  try {
    if (isUser(req.user)) throw new ForbiddenError();
    const organizationId = isSuperAdmin(req.user)
      ? Number(req.query.organizationId || 0)
      : req.user.organizationId;
    if (!organizationId) return res.json([]);
    const [rows] = await pool.execute(
      `SELECT invitation_id, email, role, status, expires_at, created_at
       FROM Invitations WHERE organization_id = ? ORDER BY invitation_id DESC`,
      [organizationId]
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function createInvitation(req, res, next) {
  try {
    if (isUser(req.user)) throw new ForbiddenError();
    const organizationId = isSuperAdmin(req.user)
      ? Number(req.body.organizationId)
      : req.user.organizationId;
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = req.body.role === "OrgAdmin" ? "OrgAdmin" : "User";
    if (!organizationId || !email.includes("@")) {
      throw new BadRequestError("Organization and a valid email are required.");
    }
    const token = crypto.randomBytes(32).toString("hex");
    const [result] = await pool.execute(
      `INSERT INTO Invitations
       (organization_id, invited_by_user_id, email, role, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY))`,
      [organizationId, req.user.id, email, role, hash(token)]
    );
    return res.status(201).json({
      invitationId: result.insertId,
      invitationToken: token,
      message: "Invitation created. Send the token through your email provider."
    });
  } catch (error) {
    return next(error);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const tokenHash = hash(String(req.body.token || ""));
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!username || username.length > 80 || password.length < 10) {
      throw new BadRequestError("A username and password of at least 10 characters are required.");
    }
    const [rows] = await pool.execute(
      `SELECT invitation_id, organization_id, role
       FROM Invitations
       WHERE token_hash = ? AND status = 'Pending' AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenHash]
    );
    const invitation = rows[0];
    if (!invitation) throw new NotFoundError("Invitation is invalid or expired.");
    await assertResourceCapacity(invitation.organization_id, "users");

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO Users
         (organization_id, username, password, role, status, password_changed_at)
         VALUES (?, ?, ?, ?, 'Active', CURRENT_TIMESTAMP)`,
        [
          invitation.organization_id,
          username,
          await bcrypt.hash(password, 12),
          invitation.role
        ]
      );
      const [updated] = await connection.execute(
        `UPDATE Invitations SET status = 'Accepted'
         WHERE invitation_id = ? AND status = 'Pending'`,
        [invitation.invitation_id]
      );
      if (!updated.affectedRows) throw new BadRequestError("Invitation was already used.");
      await connection.commit();
      return res.status(201).json({ message: "Account created. You can now sign in." });
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

export async function listTransfers(req, res, next) {
  try {
    const clauses = [];
    const values = [];
    if (!isSuperAdmin(req.user)) {
      clauses.push("t.organization_id = ?");
      values.push(req.user.organizationId);
    }
    if (isUser(req.user)) {
      clauses.push("(t.from_user_id = ? OR t.to_user_id = ?)");
      values.push(req.user.id, req.user.id);
    }
    const [rows] = await pool.execute(
      `SELECT t.*, w.model_name, w.serial_number, b.brand_name,
              from_user.username AS from_username, to_user.username AS to_username
       FROM OwnershipTransfers t
       INNER JOIN Watches w ON t.watch_id = w.watch_id
       LEFT JOIN Brands b ON w.brand_id = b.brand_id
       INNER JOIN Users from_user ON t.from_user_id = from_user.user_id
       INNER JOIN Users to_user ON t.to_user_id = to_user.user_id
       ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY t.transfer_id DESC`,
      values
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function createTransfer(req, res, next) {
  try {
    const watch = await getWatchForActor(req.user, Number(req.body.watchId));
    const toUserId = Number(req.body.toUserId);
    const [users] = await pool.execute(
      `SELECT user_id FROM Users
       WHERE user_id = ? AND organization_id = ? AND status = 'Active' AND archived_at IS NULL`,
      [toUserId, watch.organization_id]
    );
    if (!users[0] || toUserId === watch.user_id) {
      throw new BadRequestError("Select another active member in this organization.");
    }
    const [result] = await pool.execute(
      `INSERT INTO OwnershipTransfers
       (organization_id, watch_id, from_user_id, to_user_id, initiated_by_user_id, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [watch.organization_id, watch.watch_id, watch.user_id, toUserId, req.user.id, req.body.note || null]
    );
    await createNotification(
      pool,
      toUserId,
      "ownership.transfer",
      "Watch transfer requested",
      `${watch.brand_name || ""} ${watch.model_name} has been offered to you.`.trim(),
      "/dashboard/transfers"
    );
    return res.status(201).json({ transferId: result.insertId, message: "Transfer requested." });
  } catch (error) {
    return next(error);
  }
}

export async function respondTransfer(req, res, next) {
  try {
    const action = req.body.action;
    if (!["Accepted", "Declined", "Canceled"].includes(action)) {
      throw new BadRequestError("Invalid transfer action.");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        `SELECT * FROM OwnershipTransfers WHERE transfer_id = ? FOR UPDATE`,
        [req.params.id]
      );
      const transfer = rows[0];
      if (!transfer || transfer.status !== "Pending") {
        throw new NotFoundError("Pending transfer not found.");
      }
      const canRespond =
        isSuperAdmin(req.user) ||
        (action === "Canceled" && transfer.from_user_id === req.user.id) ||
        (action !== "Canceled" && transfer.to_user_id === req.user.id);
      if (!canRespond || (!isSuperAdmin(req.user) && transfer.organization_id !== req.user.organizationId)) {
        throw new ForbiddenError();
      }
      await connection.execute(
        `UPDATE OwnershipTransfers SET status = ?, responded_at = CURRENT_TIMESTAMP
         WHERE transfer_id = ?`,
        [action, transfer.transfer_id]
      );
      if (action === "Accepted") {
        await connection.execute(
          `UPDATE Watches SET user_id = ? WHERE watch_id = ? AND user_id = ?`,
          [transfer.to_user_id, transfer.watch_id, transfer.from_user_id]
        );
        await connection.execute(
          `INSERT INTO ProvenanceEvents
           (organization_id, watch_id, created_by_user_id, event_type, event_date, title, description)
           VALUES (?, ?, ?, 'Ownership', CURRENT_DATE, 'Ownership transferred', ?)`,
          [transfer.organization_id, transfer.watch_id, req.user.id, transfer.note]
        );
      }
      await connection.commit();
      if (action === "Accepted") {
        void deliverWebhooks(transfer.organization_id, "transfer.accepted", {
          transferId: transfer.transfer_id,
          watchId: transfer.watch_id,
          fromUserId: transfer.from_user_id,
          toUserId: transfer.to_user_id
        });
      }
      return res.json({ message: `Transfer ${action.toLowerCase()}.` });
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

export async function listNotifications(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT notification_id, type, title, message, link_path, read_at, created_at
       FROM Notifications WHERE user_id = ? ORDER BY notification_id DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    await pool.execute(
      `UPDATE Notifications SET read_at = CURRENT_TIMESTAMP
       WHERE notification_id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    return res.json({ message: "Notification marked as read." });
  } catch (error) {
    return next(error);
  }
}
