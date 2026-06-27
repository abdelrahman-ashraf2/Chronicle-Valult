import { ROLES, isOrgAdmin, isSuperAdmin } from "./roles.js";

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN];
const ALL_AUTH_ROLES = [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER];

function organizationScope(column) {
  return (user) => {
    if (isSuperAdmin(user)) {
      return null;
    }

    return {
      clause: `${column} = ?`,
      values: [user.organizationId]
    };
  };
}

function watchScope(user) {
  if (isSuperAdmin(user)) {
    return null;
  }

  if (isOrgAdmin(user)) {
    return {
      clause: "w.organization_id = ?",
      values: [user.organizationId]
    };
  }

  return {
    clause: "w.organization_id = ? AND w.user_id = ?",
    values: [user.organizationId, user.id]
  };
}

function watchDerivedScope(alias = "w") {
  return (user) => {
    if (isSuperAdmin(user)) {
      return null;
    }

    if (isOrgAdmin(user)) {
      return {
        clause: `${alias}.organization_id = ?`,
        values: [user.organizationId]
      };
    }

    return {
      clause: `${alias}.organization_id = ? AND ${alias}.user_id = ?`,
      values: [user.organizationId, user.id]
    };
  };
}

export const resources = {
  organizations: {
    table: "Organizations",
    id: "organization_id",
    createFields: ["organization_name", "plan", "owner_user_id"],
    updateFields: ["organization_name", "plan", "owner_user_id"],
    search: ["o.organization_name", "o.plan", "owner.username"],
    from: "Organizations o LEFT JOIN Users owner ON o.owner_user_id = owner.user_id",
    alias: "o",
    activeClause: "o.archived_at IS NULL",
    select: "o.organization_id, o.organization_name, o.owner_user_id, o.plan, o.created_at, o.updated_at, owner.username AS owner_username",
    listRoles: [ROLES.SUPER_ADMIN],
    getRoles: [ROLES.SUPER_ADMIN],
    createRoles: [ROLES.SUPER_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN]
  },
  users: {
    table: "Users",
    id: "user_id",
    createFields: ["username", "password", "role", "status", "organization_id"],
    updateFields: ["username", "password", "role", "status"],
    search: ["u.username", "u.role", "o.organization_name"],
    from: "Users u LEFT JOIN Organizations o ON u.organization_id = o.organization_id",
    alias: "u",
    activeClause: "u.archived_at IS NULL",
    select: "u.user_id, u.username, u.role, u.status, u.organization_id, u.last_login_at, u.created_at, u.updated_at, o.organization_name",
    scope: organizationScope("u.organization_id"),
    listRoles: ADMIN_ROLES,
    getRoles: ADMIN_ROLES,
    createRoles: ADMIN_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  },
  brands: {
    table: "Brands",
    id: "brand_id",
    createFields: ["organization_id", "brand_name", "country"],
    updateFields: ["brand_name", "country"],
    search: ["b.brand_name", "b.country", "o.organization_name"],
    from: "Brands b LEFT JOIN Organizations o ON b.organization_id = o.organization_id",
    alias: "b",
    activeClause: "b.archived_at IS NULL",
    select: "b.brand_id, b.organization_id, b.brand_name, b.country, o.organization_name",
    scope: organizationScope("b.organization_id"),
    listRoles: ALL_AUTH_ROLES,
    getRoles: ALL_AUTH_ROLES,
    createRoles: ADMIN_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  },
  movements: {
    table: "Movements",
    id: "movement_id",
    createFields: ["organization_id", "movement_name", "movement_type", "jewel_count"],
    updateFields: ["movement_name", "movement_type", "jewel_count"],
    search: ["m.movement_name", "m.movement_type", "m.jewel_count", "o.organization_name"],
    from: "Movements m LEFT JOIN Organizations o ON m.organization_id = o.organization_id",
    alias: "m",
    activeClause: "m.archived_at IS NULL",
    select: "m.movement_id, m.organization_id, m.movement_name, m.movement_type, m.jewel_count, o.organization_name",
    scope: organizationScope("m.organization_id"),
    listRoles: ALL_AUTH_ROLES,
    getRoles: ALL_AUTH_ROLES,
    createRoles: ADMIN_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  },
  watches: {
    table: "Watches",
    id: "watch_id",
    createFields: ["brand_id", "movement_id", "user_id", "model_name", "serial_number", "reference_number", "production_year", "case_material", "watch_condition"],
    updateFields: ["brand_id", "movement_id", "user_id", "model_name", "serial_number", "reference_number", "production_year", "case_material", "watch_condition"],
    search: ["w.model_name", "w.serial_number", "w.reference_number", "w.production_year", "w.case_material", "w.watch_condition", "b.brand_name", "m.movement_name", "u.username", "o.organization_name"],
    from: "Watches w LEFT JOIN Brands b ON w.brand_id = b.brand_id LEFT JOIN Movements m ON w.movement_id = m.movement_id LEFT JOIN Users u ON w.user_id = u.user_id LEFT JOIN Organizations o ON w.organization_id = o.organization_id",
    alias: "w",
    activeClause: "w.archived_at IS NULL",
    select: "w.watch_id, w.organization_id, w.brand_id, w.movement_id, w.user_id, w.model_name, w.serial_number, w.reference_number, w.public_token, w.public_visibility, w.production_year, w.case_material, w.watch_condition, b.brand_name, m.movement_name, u.username AS owner_username, o.organization_name",
    scope: watchScope,
    listRoles: ALL_AUTH_ROLES,
    getRoles: ALL_AUTH_ROLES,
    createRoles: ALL_AUTH_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  },
  parts: {
    table: "WatchParts",
    id: "part_id",
    createFields: ["watch_id", "part_name", "part_status"],
    updateFields: ["watch_id", "part_name", "part_status"],
    search: ["p.part_name", "p.part_status", "w.model_name", "w.serial_number", "b.brand_name"],
    from: "WatchParts p INNER JOIN Watches w ON p.watch_id = w.watch_id LEFT JOIN Brands b ON w.brand_id = b.brand_id",
    alias: "p",
    activeClause: "p.archived_at IS NULL AND w.archived_at IS NULL",
    select: "p.part_id, p.watch_id, p.part_name, p.part_status, CONCAT(b.brand_name, ' ', w.model_name, ' - ', w.serial_number) AS watch_name, w.user_id, w.organization_id",
    scope: watchDerivedScope("w"),
    listRoles: ALL_AUTH_ROLES,
    getRoles: ALL_AUTH_ROLES,
    createRoles: ADMIN_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  },
  auctions: {
    table: "AuctionRecords",
    id: "auction_id",
    createFields: ["watch_id", "auction_house", "auction_date", "sale_price", "currency"],
    updateFields: ["watch_id", "auction_house", "auction_date", "sale_price", "currency"],
    search: ["a.auction_house", "a.auction_date", "a.currency", "w.model_name", "w.serial_number", "b.brand_name"],
    from: "AuctionRecords a INNER JOIN Watches w ON a.watch_id = w.watch_id LEFT JOIN Brands b ON w.brand_id = b.brand_id",
    alias: "a",
    activeClause: "a.archived_at IS NULL AND w.archived_at IS NULL",
    select: "a.auction_id, a.watch_id, a.auction_house, a.auction_date, a.sale_price, a.currency, CONCAT(b.brand_name, ' ', w.model_name, ' - ', w.serial_number) AS watch_name, w.user_id, w.organization_id",
    scope: watchDerivedScope("w"),
    listRoles: ALL_AUTH_ROLES,
    getRoles: ALL_AUTH_ROLES,
    createRoles: ADMIN_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  },
  checks: {
    table: "AuthenticationChecks",
    id: "check_id",
    createFields: ["watch_id", "user_id", "check_date", "serial_status", "parts_status", "auction_status", "final_result", "notes"],
    updateFields: ["watch_id", "user_id", "check_date", "serial_status", "parts_status", "auction_status", "final_result", "notes"],
    search: ["c.check_date", "c.serial_status", "c.parts_status", "c.auction_status", "c.final_result", "c.notes", "w.model_name", "w.serial_number", "b.brand_name", "u.username"],
    from: "AuthenticationChecks c INNER JOIN Watches w ON c.watch_id = w.watch_id LEFT JOIN Brands b ON w.brand_id = b.brand_id LEFT JOIN Users u ON c.user_id = u.user_id",
    alias: "c",
    activeClause: "c.archived_at IS NULL AND w.archived_at IS NULL",
    select: "c.check_id, c.watch_id, c.user_id, c.organization_id, c.check_date, c.serial_status, c.parts_status, c.auction_status, c.final_result, c.notes, CONCAT(b.brand_name, ' ', w.model_name, ' - ', w.serial_number) AS watch_name, u.username AS checked_for_username, w.user_id AS owner_user_id",
    scope: watchDerivedScope("w"),
    listRoles: ALL_AUTH_ROLES,
    getRoles: ALL_AUTH_ROLES,
    createRoles: ADMIN_ROLES,
    updateRoles: ADMIN_ROLES,
    deleteRoles: ADMIN_ROLES
  }
};

export function getResource(name) {
  return resources[name];
}
