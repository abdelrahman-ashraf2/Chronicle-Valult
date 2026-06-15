import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { getResource } from "../config/resources.js";
import { ROLES, isOrgAdmin, isSuperAdmin, isUser } from "../config/roles.js";
import { writeAuditEvent } from "../services/auditService.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} from "../utils/httpErrors.js";

function quote(identifier) {
  return `\`${identifier}\``;
}

function normalizeValue(value) {
  return value === "" || value === undefined ? null : value;
}

function writablePayload(body, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, normalizeValue(body[field])])
  );
}

function ensureActionAllowed(resource, action, user) {
  const allowedRoles = resource[`${action}Roles`] || [];

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError("You do not have permission to perform this action.");
  }
}

function getUserScope(req, resource) {
  if (!resource.scope) {
    return null;
  }

  return resource.scope(req.user);
}

function buildWhere(req, resource, search) {
  const clauses = [];
  const values = [];
  const userScope = getUserScope(req, resource);

  if (resource.activeClause) {
    clauses.push(resource.activeClause);
  }

  if (userScope) {
    clauses.push(userScope.clause);
    values.push(...userScope.values);
  }

  if (search && resource.search.length) {
    clauses.push(
      `(${resource.search
        .map((column) => `CAST(${column} AS CHAR) LIKE ?`)
        .join(" OR ")})`
    );
    values.push(...resource.search.map(() => `%${search}%`));
  }

  return {
    sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    values
  };
}

async function userCanAccessRecord(req, resource, id) {
  const userScope = getUserScope(req, resource);
  const from = resource.from || resource.table;
  const idColumn = resource.alias
    ? `${resource.alias}.${resource.id}`
    : quote(resource.id);
  const clauses = [`${idColumn} = ?`];
  const values = [id];

  if (userScope) {
    clauses.push(userScope.clause);
    values.push(...userScope.values);
  }

  if (resource.activeClause) {
    clauses.push(resource.activeClause);
  }

  const [rows] = await pool.execute(
    `SELECT ${idColumn} FROM ${from} WHERE ${clauses.join(" AND ")} LIMIT 1`,
    values
  );
  return Boolean(rows[0]);
}

async function fetchUserById(userId) {
  const [rows] = await pool.execute(
    `SELECT user_id, username, role, status, token_version, organization_id
     FROM Users
     WHERE user_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function fetchOrganizationById(organizationId) {
  const [rows] = await pool.execute(
    `SELECT organization_id, organization_name
     FROM Organizations
     WHERE organization_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [organizationId]
  );
  return rows[0] || null;
}

async function fetchBrandById(brandId) {
  const [rows] = await pool.execute(
    `SELECT brand_id, organization_id
     FROM Brands
     WHERE brand_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [brandId]
  );
  return rows[0] || null;
}

async function fetchMovementById(movementId) {
  if (!movementId) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT movement_id, organization_id
     FROM Movements
     WHERE movement_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [movementId]
  );
  return rows[0] || null;
}

async function fetchWatchById(watchId) {
  const [rows] = await pool.execute(
    `SELECT watch_id, organization_id, user_id, brand_id, movement_id
     FROM Watches
     WHERE watch_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [watchId]
  );
  return rows[0] || null;
}

async function fetchOrganizationRecord(recordId) {
  const [rows] = await pool.execute(
    `SELECT organization_id, owner_user_id
     FROM Organizations
     WHERE organization_id = ?
       AND archived_at IS NULL
     LIMIT 1`,
    [recordId]
  );
  return rows[0] || null;
}

function ensureSameOrganization(organizationId, entity, label) {
  if (!entity || entity.organization_id !== organizationId) {
    throw new NotFoundError(`${label} not found.`);
  }
}

function ensureWatchAccess(actor, watch) {
  if (!watch) {
    throw new NotFoundError("Watch not found.");
  }

  if (isSuperAdmin(actor)) {
    return;
  }

  if (watch.organization_id !== actor.organizationId) {
    throw new NotFoundError("Watch not found.");
  }

  if (isUser(actor) && watch.user_id !== actor.id) {
    throw new NotFoundError("Watch not found.");
  }
}

async function prepareOrganizationCreate(req, data) {
  return {
    organization_name: data.organization_name,
    plan: data.plan || "Professional",
    owner_user_id: null
  };
}

async function prepareOrganizationUpdate(_req, data, existing) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(data, "organization_name")) {
    payload.organization_name = data.organization_name;
  }

  if (Object.prototype.hasOwnProperty.call(data, "plan")) {
    payload.plan = data.plan || "Professional";
  }

  if (Object.prototype.hasOwnProperty.call(data, "owner_user_id")) {
    const ownerUserId = data.owner_user_id ? Number(data.owner_user_id) : null;

    if (!ownerUserId) {
      payload.owner_user_id = null;
    } else {
      const owner = await fetchUserById(ownerUserId);

      if (!owner || owner.organization_id !== existing.organization_id) {
        throw new BadRequestError("Organization owner must belong to the same organization.");
      }

      payload.owner_user_id = owner.user_id;
    }
  }

  return payload;
}

async function prepareUserCreate(req, data) {
  const payload = {
    username: data.username,
    password: await bcrypt.hash(data.password, 12),
    role: data.role,
    status: data.status || "Active",
    password_changed_at: new Date()
  };

  if (isOrgAdmin(req.user)) {
    if (data.role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError("Org administrators cannot create SuperAdmin accounts.");
    }

    payload.organization_id = req.user.organizationId;
    return payload;
  }

  if (data.role === ROLES.SUPER_ADMIN) {
    payload.organization_id = data.organization_id || null;
    return payload;
  }

  const organizationId = Number(data.organization_id);
  const organization = await fetchOrganizationById(organizationId);

  if (!organization) {
    throw new BadRequestError("A valid organization is required.");
  }

  payload.organization_id = organization.organization_id;
  return payload;
}

async function prepareUserUpdate(req, data, existing, recordId) {
  const payload = {};

  if (existing.user_id === req.user.id && data.role && data.role !== existing.role) {
    throw new BadRequestError("You cannot change your own role.");
  }

  if (data.username !== undefined) {
    payload.username = data.username;
  }

  if (data.role !== undefined) {
    if (isOrgAdmin(req.user) && data.role === ROLES.SUPER_ADMIN) {
      throw new ForbiddenError("Org administrators cannot assign the SuperAdmin role.");
    }

    if (Number(recordId) === req.user.id && data.role !== req.user.role) {
      throw new BadRequestError("You cannot change your own role.");
    }

    payload.role = data.role;
  }

  if (data.status !== undefined) {
    if (Number(recordId) === req.user.id && data.status !== "Active") {
      throw new BadRequestError("You cannot disable your own account.");
    }

    payload.status = data.status;
  }

  if (data.password) {
    payload.password = await bcrypt.hash(data.password, 12);
    payload.password_changed_at = new Date();
  }

  if (
    data.password ||
    (data.role !== undefined && data.role !== existing.role) ||
    (data.status !== undefined && data.status !== existing.status)
  ) {
    payload.token_version = Number(existing.token_version) + 1;
  }

  return payload;
}

async function prepareBrandCreate(req, data) {
  const organizationId = isSuperAdmin(req.user)
    ? Number(data.organization_id)
    : req.user.organizationId;
  const organization = await fetchOrganizationById(organizationId);

  if (!organization) {
    throw new BadRequestError("A valid organization is required.");
  }

  return {
    organization_id: organization.organization_id,
    brand_name: data.brand_name,
    country: data.country
  };
}

async function prepareMovementCreate(req, data) {
  const organizationId = isSuperAdmin(req.user)
    ? Number(data.organization_id)
    : req.user.organizationId;
  const organization = await fetchOrganizationById(organizationId);

  if (!organization) {
    throw new BadRequestError("A valid organization is required.");
  }

  return {
    organization_id: organization.organization_id,
    movement_name: data.movement_name,
    movement_type: data.movement_type,
    jewel_count: data.jewel_count
  };
}

async function prepareWatchCreate(req, data) {
  const ownerUser = isUser(req.user)
    ? await fetchUserById(req.user.id)
    : await fetchUserById(Number(data.user_id));

  if (!ownerUser) {
    throw new BadRequestError("A valid owner is required.");
  }

  if (!isSuperAdmin(req.user) && ownerUser.organization_id !== req.user.organizationId) {
    throw new NotFoundError("Owner not found.");
  }

  if (isUser(req.user) && ownerUser.user_id !== req.user.id) {
    throw new ForbiddenError("You cannot assign a watch to another user.");
  }

  const brand = await fetchBrandById(Number(data.brand_id));

  if (!brand || brand.organization_id !== ownerUser.organization_id) {
    throw new BadRequestError("Brand must belong to the owner's organization.");
  }

  const movement = await fetchMovementById(data.movement_id ? Number(data.movement_id) : null);

  if (data.movement_id && (!movement || movement.organization_id !== ownerUser.organization_id)) {
    throw new BadRequestError("Movement must belong to the owner's organization.");
  }

  return {
    organization_id: ownerUser.organization_id,
    brand_id: brand.brand_id,
    movement_id: movement?.movement_id || null,
    user_id: ownerUser.user_id,
    model_name: data.model_name,
    serial_number: data.serial_number,
    production_year: data.production_year,
    case_material: data.case_material,
    watch_condition: data.watch_condition
  };
}

async function prepareWatchUpdate(req, data, existing) {
  const currentWatch = existing || await fetchWatchById(existing.watch_id);
  const ownerUser = data.user_id
    ? await fetchUserById(Number(data.user_id))
    : await fetchUserById(currentWatch.user_id);

  if (!ownerUser) {
    throw new BadRequestError("A valid owner is required.");
  }

  if (!isSuperAdmin(req.user) && ownerUser.organization_id !== req.user.organizationId) {
    throw new NotFoundError("Owner not found.");
  }

  const organizationId = ownerUser.organization_id;
  const brandId = data.brand_id ? Number(data.brand_id) : currentWatch.brand_id;
  const movementId = Object.prototype.hasOwnProperty.call(data, "movement_id")
    ? (data.movement_id ? Number(data.movement_id) : null)
    : currentWatch.movement_id;

  const brand = await fetchBrandById(brandId);

  if (!brand || brand.organization_id !== organizationId) {
    throw new BadRequestError("Brand must belong to the owner's organization.");
  }

  const movement = movementId ? await fetchMovementById(movementId) : null;

  if (movementId && (!movement || movement.organization_id !== organizationId)) {
    throw new BadRequestError("Movement must belong to the owner's organization.");
  }

  return {
    ...(data.brand_id !== undefined ? { brand_id: brand.brand_id } : {}),
    ...(Object.prototype.hasOwnProperty.call(data, "movement_id") ? { movement_id: movement?.movement_id || null } : {}),
    ...(data.user_id !== undefined ? { user_id: ownerUser.user_id } : {}),
    ...(data.model_name !== undefined ? { model_name: data.model_name } : {}),
    ...(data.serial_number !== undefined ? { serial_number: data.serial_number } : {}),
    ...(data.production_year !== undefined ? { production_year: data.production_year } : {}),
    ...(data.case_material !== undefined ? { case_material: data.case_material } : {}),
    ...(data.watch_condition !== undefined ? { watch_condition: data.watch_condition } : {})
  };
}

async function preparePartCreate(req, data) {
  const watch = await fetchWatchById(Number(data.watch_id));
  ensureWatchAccess(req.user, watch);

  return {
    watch_id: watch.watch_id,
    part_name: data.part_name,
    part_status: data.part_status
  };
}

async function prepareAuctionCreate(req, data) {
  const watch = await fetchWatchById(Number(data.watch_id));
  ensureWatchAccess(req.user, watch);

  return {
    watch_id: watch.watch_id,
    auction_house: data.auction_house,
    auction_date: data.auction_date,
    sale_price: data.sale_price,
    currency: data.currency
  };
}

async function prepareCheckCreate(req, data) {
  const watch = await fetchWatchById(Number(data.watch_id));
  ensureWatchAccess(req.user, watch);

  const checkedUser = isUser(req.user)
    ? await fetchUserById(req.user.id)
    : await fetchUserById(Number(data.user_id || watch.user_id));

  if (!checkedUser) {
    throw new BadRequestError("A valid account is required.");
  }

  if (!isSuperAdmin(req.user) && checkedUser.organization_id !== req.user.organizationId) {
    throw new NotFoundError("Account not found.");
  }

  if (checkedUser.organization_id !== watch.organization_id) {
    throw new BadRequestError("Authentication checks must stay within one organization.");
  }

  return {
    watch_id: watch.watch_id,
    user_id: checkedUser.user_id,
    organization_id: watch.organization_id,
    check_date: data.check_date,
    serial_status: data.serial_status,
    parts_status: data.parts_status,
    auction_status: data.auction_status,
    final_result: data.final_result,
    notes: data.notes
  };
}

async function preparePartAuctionOrCheckUpdate(req, data, existing, kind) {
  const currentWatchId = data.watch_id ? Number(data.watch_id) : existing.watch_id;
  const watch = await fetchWatchById(currentWatchId);
  ensureWatchAccess(req.user, watch);

  if (kind === "checks") {
    const checkedUser = data.user_id
      ? await fetchUserById(Number(data.user_id))
      : await fetchUserById(existing.user_id);

    if (!checkedUser) {
      throw new BadRequestError("A valid account is required.");
    }

    if (!isSuperAdmin(req.user) && checkedUser.organization_id !== req.user.organizationId) {
      throw new NotFoundError("Account not found.");
    }

    if (checkedUser.organization_id !== watch.organization_id) {
      throw new BadRequestError("Authentication checks must stay within one organization.");
    }

    return {
      ...(data.watch_id !== undefined ? { watch_id: watch.watch_id } : {}),
      ...(data.user_id !== undefined ? { user_id: checkedUser.user_id } : {}),
      ...(data.check_date !== undefined ? { check_date: data.check_date } : {}),
      ...(data.serial_status !== undefined ? { serial_status: data.serial_status } : {}),
      ...(data.parts_status !== undefined ? { parts_status: data.parts_status } : {}),
      ...(data.auction_status !== undefined ? { auction_status: data.auction_status } : {}),
      ...(data.final_result !== undefined ? { final_result: data.final_result } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {})
    };
  }

  if (kind === "parts") {
    return {
      ...(data.watch_id !== undefined ? { watch_id: watch.watch_id } : {}),
      ...(data.part_name !== undefined ? { part_name: data.part_name } : {}),
      ...(data.part_status !== undefined ? { part_status: data.part_status } : {})
    };
  }

  return {
    ...(data.watch_id !== undefined ? { watch_id: watch.watch_id } : {}),
    ...(data.auction_house !== undefined ? { auction_house: data.auction_house } : {}),
    ...(data.auction_date !== undefined ? { auction_date: data.auction_date } : {}),
    ...(data.sale_price !== undefined ? { sale_price: data.sale_price } : {}),
    ...(data.currency !== undefined ? { currency: data.currency } : {})
  };
}

async function buildCreatePayload(req, resourceName, data) {
  switch (resourceName) {
    case "organizations":
      return prepareOrganizationCreate(req, data);
    case "users":
      return prepareUserCreate(req, data);
    case "brands":
      return prepareBrandCreate(req, data);
    case "movements":
      return prepareMovementCreate(req, data);
    case "watches":
      return prepareWatchCreate(req, data);
    case "parts":
      return preparePartCreate(req, data);
    case "auctions":
      return prepareAuctionCreate(req, data);
    case "checks":
      return prepareCheckCreate(req, data);
    default:
      throw new NotFoundError("Unknown resource.");
  }
}

async function buildUpdatePayload(req, resourceName, data, existing) {
  switch (resourceName) {
    case "organizations":
      return prepareOrganizationUpdate(req, data, existing);
    case "users":
      return prepareUserUpdate(req, data, existing, existing.user_id);
    case "brands":
      return {
        ...(data.brand_name !== undefined ? { brand_name: data.brand_name } : {}),
        ...(data.country !== undefined ? { country: data.country } : {})
      };
    case "movements":
      return {
        ...(data.movement_name !== undefined ? { movement_name: data.movement_name } : {}),
        ...(data.movement_type !== undefined ? { movement_type: data.movement_type } : {}),
        ...(data.jewel_count !== undefined ? { jewel_count: data.jewel_count } : {})
      };
    case "watches":
      return prepareWatchUpdate(req, data, existing);
    case "parts":
      return preparePartAuctionOrCheckUpdate(req, data, existing, "parts");
    case "auctions":
      return preparePartAuctionOrCheckUpdate(req, data, existing, "auctions");
    case "checks":
      return preparePartAuctionOrCheckUpdate(req, data, existing, "checks");
    default:
      throw new NotFoundError("Unknown resource.");
  }
}

async function loadExistingForUpdate(resourceName, recordId) {
  switch (resourceName) {
    case "organizations":
      return fetchOrganizationRecord(recordId);
    case "users":
      return fetchUserById(recordId);
    case "brands":
      return fetchBrandById(recordId);
    case "movements":
      return fetchMovementById(recordId);
    case "watches":
      return fetchWatchById(recordId);
    case "parts": {
      const [rows] = await pool.execute(`SELECT part_id, watch_id FROM WatchParts WHERE part_id = ? AND archived_at IS NULL LIMIT 1`, [recordId]);
      return rows[0] || null;
    }
    case "auctions": {
      const [rows] = await pool.execute(`SELECT auction_id, watch_id FROM AuctionRecords WHERE auction_id = ? AND archived_at IS NULL LIMIT 1`, [recordId]);
      return rows[0] || null;
    }
    case "checks": {
      const [rows] = await pool.execute(
        `SELECT check_id, watch_id, user_id, organization_id
         FROM AuthenticationChecks
         WHERE check_id = ?
           AND archived_at IS NULL
         LIMIT 1`,
        [recordId]
      );
      return rows[0] || null;
    }
    default:
      return null;
  }
}

async function assertScopedForMutation(req, resourceName, existing) {
  if (!existing) {
    throw new NotFoundError("Record not found.");
  }

  switch (resourceName) {
    case "organizations":
      if (!isSuperAdmin(req.user)) {
        throw new NotFoundError("Record not found.");
      }
      return;
    case "users":
    case "brands":
    case "movements":
      if (!isSuperAdmin(req.user) && existing.organization_id !== req.user.organizationId) {
        throw new NotFoundError("Record not found.");
      }
      return;
    case "watches":
      ensureWatchAccess(req.user, existing);
      return;
    case "parts":
    case "auctions":
    case "checks": {
      const watch = await fetchWatchById(existing.watch_id);
      ensureWatchAccess(req.user, watch);
      return;
    }
    default:
      throw new NotFoundError("Unknown resource.");
  }
}

export async function listRecords(req, res, next) {
  try {
    const resource = getResource(req.params.resource);

    if (!resource) {
      throw new NotFoundError("Unknown resource.");
    }

    ensureActionAllowed(resource, "list", req.user);

    const search = String(req.query.search || "").trim();
    const from = resource.from || resource.table;
    const select = resource.select || "*";
    const idColumn = resource.alias
      ? `${resource.alias}.${resource.id}`
      : quote(resource.id);
    const where = buildWhere(req, resource, search);

    const [rows] = await pool.execute(
      `SELECT ${select} FROM ${from}${where.sql} ORDER BY ${idColumn} DESC`,
      where.values
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

export async function getRecord(req, res, next) {
  try {
    const resource = getResource(req.params.resource);

    if (!resource) {
      throw new NotFoundError("Unknown resource.");
    }

    ensureActionAllowed(resource, "get", req.user);

    if (!(await userCanAccessRecord(req, resource, req.params.id))) {
      throw new NotFoundError("Record not found.");
    }

    const from = resource.from || resource.table;
    const select = resource.select || "*";
    const idColumn = resource.alias
      ? `${resource.alias}.${resource.id}`
      : quote(resource.id);
    const [rows] = await pool.execute(
      `SELECT ${select} FROM ${from}
       WHERE ${idColumn} = ?
       ${resource.activeClause ? `AND ${resource.activeClause}` : ""}
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows[0]) {
      throw new NotFoundError("Record not found.");
    }

    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

export async function createRecord(req, res, next) {
  try {
    const resource = getResource(req.params.resource);

    if (!resource) {
      throw new NotFoundError("Unknown resource.");
    }

    ensureActionAllowed(resource, "create", req.user);

    const rawData = writablePayload(req.body, resource.createFields);
    const data = await buildCreatePayload(req, req.params.resource, rawData);
    const fields = Object.keys(data);

    if (!fields.length) {
      throw new BadRequestError("No valid fields were supplied.");
    }

    const connection = await pool.getConnection();
    let result;

    try {
      await connection.beginTransaction();
      [result] = await connection.execute(
        `INSERT INTO ${resource.table} (${fields.map(quote).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`,
        Object.values(data)
      );
      await writeAuditEvent({
        executor: connection,
        req,
        action: "record.create",
        resourceType: req.params.resource,
        resourceId: result.insertId,
        organizationId: data.organization_id,
        metadata: { fields }
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(201).json({
      message: "Record created.",
      [resource.id]: result.insertId
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateRecord(req, res, next) {
  try {
    const resource = getResource(req.params.resource);

    if (!resource) {
      throw new NotFoundError("Unknown resource.");
    }

    ensureActionAllowed(resource, "update", req.user);

    const existing = await loadExistingForUpdate(req.params.resource, Number(req.params.id));
    await assertScopedForMutation(req, req.params.resource, existing);

    const rawData = writablePayload(req.body, resource.updateFields);
    const data = await buildUpdatePayload(req, req.params.resource, rawData, existing);
    const fields = Object.keys(data);

    if (!fields.length) {
      throw new BadRequestError("No valid fields were supplied.");
    }

    const connection = await pool.getConnection();
    let result;

    try {
      await connection.beginTransaction();
      [result] = await connection.execute(
        `UPDATE ${resource.table}
         SET ${fields.map((field) => `${quote(field)} = ?`).join(", ")}
         WHERE ${quote(resource.id)} = ? AND archived_at IS NULL`,
        [...Object.values(data), req.params.id]
      );
      await writeAuditEvent({
        executor: connection,
        req,
        action: "record.update",
        resourceType: req.params.resource,
        resourceId: Number(req.params.id),
        organizationId: existing.organization_id,
        metadata: { fields }
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    if (!result.affectedRows) {
      throw new NotFoundError("Record not found.");
    }

    return res.json({ message: "Record updated." });
  } catch (error) {
    return next(error);
  }
}

export async function deleteRecord(req, res, next) {
  try {
    const resource = getResource(req.params.resource);

    if (!resource) {
      throw new NotFoundError("Unknown resource.");
    }

    ensureActionAllowed(resource, "delete", req.user);

    const existing = await loadExistingForUpdate(req.params.resource, Number(req.params.id));
    await assertScopedForMutation(req, req.params.resource, existing);

    if (req.params.resource === "users" && Number(req.params.id) === req.user.id) {
      throw new BadRequestError("You cannot delete your own account.");
    }

    if (req.params.resource === "organizations") {
      const [members] = await pool.execute(
        `SELECT COUNT(*) AS count
         FROM Users
         WHERE organization_id = ? AND archived_at IS NULL`,
        [req.params.id]
      );

      if (members[0].count > 0) {
        throw new BadRequestError("Remove organization members before deleting the organization.");
      }
    }

    const connection = await pool.getConnection();
    let result;

    try {
      await connection.beginTransaction();
      [result] = await connection.execute(
        `UPDATE ${resource.table}
         SET archived_at = CURRENT_TIMESTAMP
         WHERE ${quote(resource.id)} = ? AND archived_at IS NULL`,
        [req.params.id]
      );
      await writeAuditEvent({
        executor: connection,
        req,
        action: "record.archive",
        resourceType: req.params.resource,
        resourceId: Number(req.params.id),
        organizationId: existing.organization_id
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    if (!result.affectedRows) {
      throw new NotFoundError("Record not found.");
    }

    return res.json({ message: "Record archived." });
  } catch (error) {
    return next(error);
  }
}
