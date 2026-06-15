import { ROLES } from "./roles.js";

const text = (name, label, extra = {}) => ({ name, label, type: "text", ...extra });
const number = (name, label, extra = {}) => ({ name, label, type: "number", ...extra });
const textarea = (name, label, extra = {}) => ({ name, label, type: "textarea", ...extra });
const select = (name, label, options, extra = {}) => ({
  name,
  label,
  type: "select",
  options,
  ...extra
});
const lookup = (name, label, resource, valueKey, labelKey, extra = {}) => ({
  name,
  label,
  type: "lookup",
  lookup: { resource, valueKey, labelKey },
  ...extra
});

export const resourceConfigs = {
  organizations: {
    label: "Organizations",
    singular: "Organization",
    description: "Platform tenants and subscription plans.",
    idKey: "organization_id",
    columns: [
      ["organization_name", "Organization"],
      ["plan", "Plan"],
      ["owner_username", "Owner"]
    ],
    fields: [
      text("organization_name", "Organization name", { required: true }),
      text("plan", "Plan", { required: true }),
      lookup("owner_user_id", "Owner", "users", "user_id", "username")
    ],
    createRoles: [ROLES.SUPER_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN]
  },
  users: {
    label: "Users",
    singular: "User",
    description: "Manage organization members and access roles.",
    idKey: "user_id",
    columns: [
      ["username", "Username"],
      ["role", "Role"],
      ["status", "Status"],
      ["organization_name", "Organization"]
    ],
    orgAdminColumns: [
      ["username", "Username"],
      ["role", "Role"],
      ["status", "Status"]
    ],
    fields: [
      lookup("organization_id", "Organization", "organizations", "organization_id", "organization_name", {
        required: true,
        hideOnEdit: true
      }),
      text("username", "Username", { required: true }),
      select("role", "Role", [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER], { required: true }),
      select("status", "Status", ["Active", "Disabled"], { required: true }),
      text("password", "Password", {
        inputType: "password",
        createRequired: true,
        editHint: "Leave blank to keep the current password."
      })
    ],
    orgAdminFields: [
      text("username", "Username", { required: true }),
      select("role", "Role", [ROLES.ORG_ADMIN, ROLES.USER], { required: true }),
      select("status", "Status", ["Active", "Disabled"], { required: true }),
      text("password", "Password", {
        inputType: "password",
        createRequired: true,
        editHint: "Leave blank to keep the current password."
      })
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]
  },
  brands: {
    label: "Brands",
    singular: "Brand",
    description: "Watch brands scoped to each organization.",
    idKey: "brand_id",
    columns: [
      ["brand_name", "Brand"],
      ["country", "Country"],
      ["organization_name", "Organization"]
    ],
    orgAdminColumns: [
      ["brand_name", "Brand"],
      ["country", "Country"]
    ],
    userColumns: [
      ["brand_name", "Brand"],
      ["country", "Country"]
    ],
    fields: [
      lookup("organization_id", "Organization", "organizations", "organization_id", "organization_name", {
        required: true,
        hideOnEdit: true
      }),
      text("brand_name", "Brand name", { required: true }),
      text("country", "Country")
    ],
    orgAdminFields: [
      text("brand_name", "Brand name", { required: true }),
      text("country", "Country")
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER]
  },
  movements: {
    label: "Movements",
    singular: "Movement",
    description: "Movement records scoped to each organization.",
    idKey: "movement_id",
    columns: [
      ["movement_name", "Movement"],
      ["movement_type", "Type"],
      ["jewel_count", "Jewels"],
      ["organization_name", "Organization"]
    ],
    orgAdminColumns: [
      ["movement_name", "Movement"],
      ["movement_type", "Type"],
      ["jewel_count", "Jewels"]
    ],
    userColumns: [
      ["movement_name", "Movement"],
      ["movement_type", "Type"],
      ["jewel_count", "Jewels"]
    ],
    fields: [
      lookup("organization_id", "Organization", "organizations", "organization_id", "organization_name", {
        required: true,
        hideOnEdit: true
      }),
      text("movement_name", "Movement name", { required: true }),
      select("movement_type", "Movement type", ["Manual", "Automatic", "Quartz", "Other"], {
        required: true
      }),
      number("jewel_count", "Jewel count", { min: 0 })
    ],
    orgAdminFields: [
      text("movement_name", "Movement name", { required: true }),
      select("movement_type", "Movement type", ["Manual", "Automatic", "Quartz", "Other"], {
        required: true
      }),
      number("jewel_count", "Jewel count", { min: 0 })
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER]
  },
  watches: {
    label: "Watches",
    singular: "Watch",
    description: "Registered watches and ownership records.",
    userLabel: "My Watches",
    userDescription: "The watches currently registered to your account.",
    idKey: "watch_id",
    columns: [
      ["brand_name", "Brand"],
      ["model_name", "Model"],
      ["serial_number", "Serial"],
      ["production_year", "Year"],
      ["movement_name", "Movement"],
      ["watch_condition", "Condition"],
      ["owner_username", "Owner"],
      ["organization_name", "Organization"]
    ],
    orgAdminColumns: [
      ["brand_name", "Brand"],
      ["model_name", "Model"],
      ["serial_number", "Serial"],
      ["production_year", "Year"],
      ["movement_name", "Movement"],
      ["watch_condition", "Condition"],
      ["owner_username", "Owner"]
    ],
    userColumns: [
      ["brand_name", "Brand"],
      ["model_name", "Model"],
      ["serial_number", "Serial"],
      ["production_year", "Year"],
      ["movement_name", "Movement"],
      ["watch_condition", "Condition"]
    ],
    fields: [
      lookup("brand_id", "Brand", "brands", "brand_id", "brand_name", { required: true }),
      lookup("movement_id", "Movement", "movements", "movement_id", "movement_name"),
      lookup("user_id", "Owner", "users", "user_id", "username", { required: true }),
      text("model_name", "Model name", { required: true }),
      text("serial_number", "Serial number", { required: true }),
      number("production_year", "Production year", { min: 1000, max: 2100 }),
      text("case_material", "Case material"),
      select("watch_condition", "Condition", ["Mint", "Excellent", "Good", "Fair", "Poor"], {
        required: true
      })
    ],
    userFields: [
      lookup("brand_id", "Brand", "brands", "brand_id", "brand_name", { required: true }),
      lookup("movement_id", "Movement", "movements", "movement_id", "movement_name"),
      text("model_name", "Model name", { required: true }),
      text("serial_number", "Serial number", { required: true }),
      number("production_year", "Production year", { min: 1000, max: 2100 }),
      text("case_material", "Case material"),
      select("watch_condition", "Condition", ["Mint", "Excellent", "Good", "Fair", "Poor"], {
        required: true
      })
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER]
  },
  parts: {
    label: "Parts",
    singular: "Part",
    description: "Originality and condition data for watch parts.",
    userLabel: "My Parts",
    idKey: "part_id",
    columns: [
      ["watch_name", "Watch"],
      ["part_name", "Part"],
      ["part_status", "Status"]
    ],
    fields: [
      lookup("watch_id", "Watch", "watches", "watch_id", "model_name", { required: true }),
      text("part_name", "Part name", { required: true }),
      select("part_status", "Part status", ["Original", "Replacement", "Restored", "Unknown"], {
        required: true
      })
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER]
  },
  auctions: {
    label: "Auctions",
    singular: "Auction record",
    description: "Public auction records for registered watches.",
    userLabel: "My Auctions",
    idKey: "auction_id",
    columns: [
      ["watch_name", "Watch"],
      ["auction_house", "Auction house"],
      ["auction_date", "Date"],
      ["sale_price", "Sale price"],
      ["currency", "Currency"]
    ],
    fields: [
      lookup("watch_id", "Watch", "watches", "watch_id", "model_name", { required: true }),
      text("auction_house", "Auction house", { required: true }),
      text("auction_date", "Auction date", { inputType: "date", required: true }),
      number("sale_price", "Sale price", { min: 0, step: "0.01", required: true }),
      text("currency", "Currency", { maxLength: 3, required: true })
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER]
  },
  checks: {
    label: "Checks",
    singular: "Authentication check",
    description: "Authentication outcomes across serial, parts, and auction history.",
    userLabel: "My Checks",
    idKey: "check_id",
    columns: [
      ["watch_name", "Watch"],
      ["check_date", "Date"],
      ["serial_status", "Serial"],
      ["parts_status", "Parts"],
      ["auction_status", "Auction"],
      ["final_result", "Result"],
      ["checked_for_username", "Checked By"]
    ],
    orgAdminColumns: [
      ["watch_name", "Watch"],
      ["check_date", "Date"],
      ["serial_status", "Serial"],
      ["parts_status", "Parts"],
      ["auction_status", "Auction"],
      ["final_result", "Result"],
      ["checked_for_username", "Checked By"]
    ],
    userColumns: [
      ["watch_name", "Watch"],
      ["check_date", "Date"],
      ["serial_status", "Serial"],
      ["parts_status", "Parts"],
      ["auction_status", "Auction"],
      ["final_result", "Result"]
    ],
    fields: [
      lookup("watch_id", "Watch", "watches", "watch_id", "model_name", { required: true }),
      lookup("user_id", "Account", "users", "user_id", "username", { required: true }),
      text("check_date", "Check date", { inputType: "date", required: true }),
      select("serial_status", "Serial status", ["Verified", "Mismatch", "Unknown"], {
        required: true
      }),
      select("parts_status", "Parts status", ["Original", "Mixed", "Replacement", "Unknown"], {
        required: true
      }),
      select("auction_status", "Auction status", ["Clear", "Flagged", "No Record"], {
        required: true
      }),
      select("final_result", "Final result", ["Authentic", "Questionable", "Counterfeit", "Pending"], {
        required: true
      }),
      textarea("notes", "Notes")
    ],
    orgAdminFields: [
      lookup("watch_id", "Watch", "watches", "watch_id", "model_name", { required: true }),
      lookup("user_id", "Account", "users", "user_id", "username", { required: true }),
      text("check_date", "Check date", { inputType: "date", required: true }),
      select("serial_status", "Serial status", ["Verified", "Mismatch", "Unknown"], {
        required: true
      }),
      select("parts_status", "Parts status", ["Original", "Mixed", "Replacement", "Unknown"], {
        required: true
      }),
      select("auction_status", "Auction status", ["Clear", "Flagged", "No Record"], {
        required: true
      }),
      select("final_result", "Final result", ["Authentic", "Questionable", "Counterfeit", "Pending"], {
        required: true
      }),
      textarea("notes", "Notes")
    ],
    createRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    updateRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    deleteRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN],
    viewRoles: [ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN, ROLES.USER]
  }
};

export const superAdminNavigation = ["organizations", "users", "brands", "movements", "watches", "parts", "auctions", "checks"];
export const orgAdminNavigation = ["users", "brands", "movements", "watches", "parts", "auctions", "checks"];
export const userNavigation = ["watches", "parts", "auctions", "checks"];
