import assert from "node:assert/strict";
import test, { after } from "node:test";
import request from "supertest";

const runDatabaseTests = process.env.RUN_DB_TESTS === "1";
let databasePool;

after(async () => {
  if (databasePool) await databasePool.end();
});

test("live API enforces secure sessions and tenant boundaries", { skip: !runDatabaseTests }, async () => {
  process.env.NODE_ENV = "test";
  const { app } = await import("../src/server.js");
  databasePool = (await import("../src/config/db.js")).default;
  const agent = request.agent(app);

  const login = await agent
    .post("/api/auth/login")
    .send({ username: "viewer", password: "Vintage123!" });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "User");
  assert.equal(Object.hasOwn(login.body.user, "password"), false);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);

  const profile = await agent.get("/api/auth/me");
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.username, "viewer");

  const watches = await agent.get("/api/v1/watches?page=1&pageSize=10");
  assert.equal(watches.status, 200);
  assert.ok(Array.isArray(watches.body.items));
  assert.ok(watches.body.items.every((watch) => watch.user_id === login.body.user.id));

  const foreignWatch = await agent.get("/api/v1/watches/3");
  assert.equal(foreignWatch.status, 404);

  const csrfBlocked = await agent
    .post("/api/v1/cases")
    .send({ watchId: watches.body.items[0]?.watch_id });
  assert.equal(csrfBlocked.status, 403);

  const publicVerification = await request(app).get(
    "/api/public/lookup/CV-OMEGA-1969-001"
  );
  assert.equal(publicVerification.status, 200);
  assert.equal(Object.hasOwn(publicVerification.body, "user_id"), false);
  assert.equal(Object.hasOwn(publicVerification.body, "notes"), false);
});
