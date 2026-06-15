import assert from "node:assert/strict";
import test from "node:test";
import { createRequireAuth, requireRole } from "../src/middleware/auth.js";
import { ROLES } from "../src/config/roles.js";
import { UnauthorizedError } from "../src/utils/httpErrors.js";

function requestWithToken() {
  return {
    headers: { authorization: "Bearer test-token" }
  };
}

async function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error));
  });
}

function activeUser(overrides = {}) {
  return {
    user_id: 42,
    username: "member",
    role: ROLES.USER,
    organization_id: 7,
    active_organization_id: 7,
    organization_name: "Heritage",
    organization_plan: "Professional",
    status: "Active",
    token_version: 3,
    ...overrides
  };
}

test("requireAuth reloads current role and organization from the database", async () => {
  const middleware = createRequireAuth({
    verifyToken: () => ({
      sub: "42",
      role: ROLES.SUPER_ADMIN,
      organizationId: 999,
      tokenVersion: 3
    }),
    findSessionUser: async () => activeUser()
  });
  const req = requestWithToken();
  const error = await runMiddleware(middleware, req);

  assert.equal(error, undefined);
  assert.equal(req.user.role, ROLES.USER);
  assert.equal(req.user.organizationId, 7);
});

test("requireAuth rejects revoked token versions", async () => {
  const middleware = createRequireAuth({
    verifyToken: () => ({ sub: "42", tokenVersion: 2 }),
    findSessionUser: async () => activeUser()
  });
  const error = await runMiddleware(middleware, requestWithToken());

  assert.ok(error instanceof UnauthorizedError);
});

test("requireAuth rejects disabled and archived-organization accounts", async () => {
  const disabled = createRequireAuth({
    verifyToken: () => ({ sub: "42", tokenVersion: 3 }),
    findSessionUser: async () => activeUser({ status: "Disabled" })
  });
  const archivedOrganization = createRequireAuth({
    verifyToken: () => ({ sub: "42", tokenVersion: 3 }),
    findSessionUser: async () => activeUser({ active_organization_id: null })
  });

  assert.ok(
    (await runMiddleware(disabled, requestWithToken())) instanceof UnauthorizedError
  );
  assert.ok(
    (await runMiddleware(archivedOrganization, requestWithToken())) instanceof UnauthorizedError
  );
});

test("requireRole uses the refreshed role", async () => {
  const middleware = requireRole(ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN);
  const denied = await runMiddleware(middleware, {
    user: { role: ROLES.USER }
  });
  const allowed = await runMiddleware(middleware, {
    user: { role: ROLES.ORG_ADMIN }
  });

  assert.equal(denied.statusCode, 403);
  assert.equal(allowed, undefined);
});
