import { env } from "../config/env.js";
import { ForbiddenError } from "../utils/httpErrors.js";

export function requireTrustedOrigin(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!req.cookies?.[env.authCookieName]) return next();
  const origin = req.get("origin");
  if (!origin || !env.clientOrigins.includes(origin)) {
    return next(new ForbiddenError("Untrusted request origin."));
  }
  return next();
}
