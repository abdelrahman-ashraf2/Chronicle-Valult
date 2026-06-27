import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { env } from "../config/env.js";
import { writeAuditEvent } from "../services/auditService.js";
import { toSafeUser } from "../services/userSessionService.js";
import { UnauthorizedError } from "../utils/httpErrors.js";

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.username, u.password, u.role, u.organization_id,
              u.status, u.token_version,
              o.organization_name, o.plan AS organization_plan
       FROM Users u
       LEFT JOIN Organizations o
         ON u.organization_id = o.organization_id
        AND o.archived_at IS NULL
       WHERE u.username = ?
         AND u.archived_at IS NULL
       LIMIT 1`,
      [username]
    );
    const user = rows[0];

    if (
      !user ||
      user.status !== "Active" ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new UnauthorizedError("Invalid username or password.");
    }

    const safeUser = toSafeUser(user);
    const token = jwt.sign(
      {
        username: safeUser.username,
        tokenVersion: user.token_version
      },
      env.jwt.secret,
      {
        algorithm: "HS256",
        subject: String(user.user_id),
        expiresIn: env.jwt.expiresIn,
        issuer: env.jwt.issuer,
        audience: env.jwt.audience
      }
    );

    await pool.execute(
      `UPDATE Users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [user.user_id]
    );
    await writeAuditEvent({
      req,
      action: "auth.login",
      resourceType: "users",
      resourceId: user.user_id,
      organizationId: user.organization_id,
      actorUserId: user.user_id
    });

    res.cookie(env.authCookieName, token, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 30 * 60 * 1000,
      path: "/"
    });
    return res.json({ user: safeUser });
  } catch (error) {
    return next(error);
  }
}

export function getProfile(req, res) {
  return res.json({ user: req.user });
}

export async function logout(req, res, next) {
  try {
    await pool.execute(
      `UPDATE Users
       SET token_version = token_version + 1
       WHERE user_id = ? AND archived_at IS NULL`,
      [req.user.id]
    );
    await writeAuditEvent({
      req,
      action: "auth.logout_all",
      resourceType: "users",
      resourceId: req.user.id
    });
    res.clearCookie(env.authCookieName, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      path: "/"
    });
    return res.json({ message: "Signed out." });
  } catch (error) {
    return next(error);
  }
}
