import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ROLES, isSuperAdmin } from "../config/roles.js";
import { findActiveSessionUser, toSafeUser } from "../services/userSessionService.js";
import { ForbiddenError, UnauthorizedError } from "../utils/httpErrors.js";

export function createRequireAuth({
  verifyToken = (token) =>
    jwt.verify(token, env.jwt.secret, {
      algorithms: ["HS256"],
      issuer: env.jwt.issuer,
      audience: env.jwt.audience
    }),
  findSessionUser = findActiveSessionUser
} = {}) {
  return async function requireAuthMiddleware(req, _res, next) {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;
    const token = req.cookies?.[env.authCookieName] || bearerToken;

    if (!token) {
      return next(new UnauthorizedError("Authentication token is required."));
    }

    try {
      const claims = verifyToken(token);
      const user = await findSessionUser(claims.sub || claims.id);

      if (
        !user ||
        user.status !== "Active" ||
        Number(user.token_version) !== Number(claims.tokenVersion) ||
        (user.role !== ROLES.SUPER_ADMIN && !user.active_organization_id)
      ) {
        throw new UnauthorizedError("This session is no longer valid.");
      }

      req.user = toSafeUser(user);
      return next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return next(error);
      }

      return next(new UnauthorizedError("Invalid or expired authentication token."));
    }
  };
}

export const requireAuth = createRequireAuth();

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ForbiddenError("You do not have permission to perform this action."));
    }

    return next();
  };
}

export function requireOrganizationAccess(req, _res, next) {
  if (isSuperAdmin(req.user)) {
    return next();
  }

  if (!req.user?.organizationId) {
    return next(new ForbiddenError("This account is not assigned to an organization."));
  }

  return next();
}

export { ROLES };
