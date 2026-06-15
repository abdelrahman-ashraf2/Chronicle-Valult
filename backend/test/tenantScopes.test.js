import assert from "node:assert/strict";
import test from "node:test";
import { resources } from "../src/config/resources.js";
import { ROLES } from "../src/config/roles.js";

test("normal users are scoped to their own watches", () => {
  const scope = resources.watches.scope({
    id: 15,
    role: ROLES.USER,
    organizationId: 8
  });

  assert.equal(scope.clause, "w.organization_id = ? AND w.user_id = ?");
  assert.deepEqual(scope.values, [8, 15]);
});

test("organization admins are scoped to their organization", () => {
  const watchScope = resources.watches.scope({
    id: 4,
    role: ROLES.ORG_ADMIN,
    organizationId: 8
  });
  const partScope = resources.parts.scope({
    id: 4,
    role: ROLES.ORG_ADMIN,
    organizationId: 8
  });

  assert.deepEqual(watchScope.values, [8]);
  assert.deepEqual(partScope.values, [8]);
  assert.match(partScope.clause, /w\.organization_id/);
});

test("super admins have platform-wide scope", () => {
  assert.equal(
    resources.watches.scope({ role: ROLES.SUPER_ADMIN }),
    null
  );
  assert.equal(
    resources.checks.scope({ role: ROLES.SUPER_ADMIN }),
    null
  );
});

test("normal users cannot mutate related registry records", () => {
  for (const name of ["parts", "auctions", "checks"]) {
    assert.equal(resources[name].createRoles.includes(ROLES.USER), false);
    assert.equal(resources[name].updateRoles.includes(ROLES.USER), false);
    assert.equal(resources[name].deleteRoles.includes(ROLES.USER), false);
  }
});
