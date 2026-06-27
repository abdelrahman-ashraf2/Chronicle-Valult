import { body, param, query } from "express-validator";
import { getResource } from "../config/resources.js";
import { ALL_ROLES, ROLES } from "../config/roles.js";
import { BadRequestError, NotFoundError } from "../utils/httpErrors.js";

const watchConditions = ["Mint", "Excellent", "Good", "Fair", "Poor"];
const movementTypes = ["Manual", "Automatic", "Quartz", "Other"];
const partStatuses = ["Original", "Replacement", "Restored", "Unknown"];
const serialStatuses = ["Verified", "Mismatch", "Unknown"];
const partsStatuses = ["Original", "Mixed", "Replacement", "Unknown"];
const auctionStatuses = ["Clear", "Flagged", "No Record"];
const finalResults = ["Authentic", "Questionable", "Counterfeit", "Pending"];
const accountStatuses = ["Active", "Disabled"];

const resourceRules = {
  organizations: {
    create: [
      body("organization_name")
        .trim()
        .notEmpty()
        .withMessage("Organization name is required.")
        .isLength({ max: 120 })
        .withMessage("Organization name must be 120 characters or fewer."),
      body("plan")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 40 })
        .withMessage("Plan must be 40 characters or fewer."),
      body("owner_user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Owner user must be a valid record.")
        .toInt()
    ],
    update: [
      body("organization_name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Organization name cannot be empty.")
        .isLength({ max: 120 })
        .withMessage("Organization name must be 120 characters or fewer."),
      body("plan")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 40 })
        .withMessage("Plan must be 40 characters or fewer."),
      body("owner_user_id")
        .optional({ nullable: true })
        .custom((value) => value === null || value === "" || Number.isInteger(Number(value)))
        .withMessage("Owner user must be a valid record.")
    ]
  },
  users: {
    create: [
      body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required.")
        .isLength({ min: 3, max: 50 })
        .withMessage("Username must be between 3 and 50 characters."),
      body("password")
        .notEmpty()
        .withMessage("Password is required.")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters."),
      body("role")
        .notEmpty()
        .withMessage("Role is required.")
        .isIn(ALL_ROLES)
        .withMessage("Role is invalid."),
      body("status")
        .optional()
        .isIn(accountStatuses)
        .withMessage("Account status is invalid."),
      body("organization_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Organization must be a valid record.")
        .toInt()
    ],
    update: [
      body("username")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Username cannot be empty.")
        .isLength({ min: 3, max: 50 })
        .withMessage("Username must be between 3 and 50 characters."),
      body("password")
        .optional({ values: "falsy" })
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters."),
      body("role")
        .optional()
        .isIn(ALL_ROLES)
        .withMessage("Role is invalid."),
      body("status")
        .optional()
        .isIn(accountStatuses)
        .withMessage("Account status is invalid.")
    ]
  },
  brands: {
    create: [
      body("organization_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Organization must be a valid record.")
        .toInt(),
      body("brand_name")
        .trim()
        .notEmpty()
        .withMessage("Brand name is required.")
        .isLength({ max: 100 })
        .withMessage("Brand name must be 100 characters or fewer."),
      body("country")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 80 })
        .withMessage("Country must be 80 characters or fewer.")
    ],
    update: [
      body("brand_name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Brand name cannot be empty.")
        .isLength({ max: 100 })
        .withMessage("Brand name must be 100 characters or fewer."),
      body("country")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 80 })
        .withMessage("Country must be 80 characters or fewer.")
    ]
  },
  movements: {
    create: [
      body("organization_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Organization must be a valid record.")
        .toInt(),
      body("movement_name")
        .trim()
        .notEmpty()
        .withMessage("Movement name is required.")
        .isLength({ max: 100 })
        .withMessage("Movement name must be 100 characters or fewer."),
      body("movement_type")
        .notEmpty()
        .withMessage("Movement type is required.")
        .isIn(movementTypes)
        .withMessage("Movement type is invalid."),
      body("jewel_count")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1000 })
        .withMessage("Jewel count must be a whole number between 0 and 1000.")
        .toInt()
    ],
    update: [
      body("movement_name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Movement name cannot be empty.")
        .isLength({ max: 100 })
        .withMessage("Movement name must be 100 characters or fewer."),
      body("movement_type")
        .optional()
        .isIn(movementTypes)
        .withMessage("Movement type is invalid."),
      body("jewel_count")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 1000 })
        .withMessage("Jewel count must be a whole number between 0 and 1000.")
        .toInt()
    ]
  },
  watches: {
    create: [
      body("brand_id").isInt({ min: 1 }).withMessage("Brand is required.").toInt(),
      body("movement_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Movement must be a valid record.")
        .toInt(),
      body("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Owner must be a valid record.")
        .toInt(),
      body("model_name")
        .trim()
        .notEmpty()
        .withMessage("Model name is required.")
        .isLength({ max: 120 })
        .withMessage("Model name must be 120 characters or fewer."),
      body("serial_number")
        .trim()
        .notEmpty()
        .withMessage("Serial number is required.")
        .isLength({ max: 100 })
        .withMessage("Serial number must be 100 characters or fewer."),
      body("reference_number")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 120 })
        .withMessage("Reference number must be 120 characters or fewer."),
      body("production_year")
        .optional({ values: "falsy" })
        .isInt({ min: 1000, max: 2100 })
        .withMessage("Production year must be between 1000 and 2100.")
        .toInt(),
      body("case_material")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 80 })
        .withMessage("Case material must be 80 characters or fewer."),
      body("watch_condition")
        .notEmpty()
        .withMessage("Watch condition is required.")
        .isIn(watchConditions)
        .withMessage("Watch condition is invalid.")
    ],
    update: [
      body("brand_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Brand must be a valid record.")
        .toInt(),
      body("movement_id")
        .optional({ nullable: true })
        .custom((value) => value === null || value === "" || Number.isInteger(Number(value)))
        .withMessage("Movement must be a valid record."),
      body("user_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Owner must be a valid record.")
        .toInt(),
      body("model_name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Model name cannot be empty.")
        .isLength({ max: 120 })
        .withMessage("Model name must be 120 characters or fewer."),
      body("serial_number")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Serial number cannot be empty.")
        .isLength({ max: 100 })
        .withMessage("Serial number must be 100 characters or fewer."),
      body("reference_number")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 120 })
        .withMessage("Reference number must be 120 characters or fewer."),
      body("production_year")
        .optional({ values: "falsy" })
        .isInt({ min: 1000, max: 2100 })
        .withMessage("Production year must be between 1000 and 2100.")
        .toInt(),
      body("case_material")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 80 })
        .withMessage("Case material must be 80 characters or fewer."),
      body("watch_condition")
        .optional()
        .isIn(watchConditions)
        .withMessage("Watch condition is invalid.")
    ]
  },
  parts: {
    create: [
      body("watch_id").isInt({ min: 1 }).withMessage("Watch is required.").toInt(),
      body("part_name")
        .trim()
        .notEmpty()
        .withMessage("Part name is required.")
        .isLength({ max: 100 })
        .withMessage("Part name must be 100 characters or fewer."),
      body("part_status")
        .notEmpty()
        .withMessage("Part status is required.")
        .isIn(partStatuses)
        .withMessage("Part status is invalid.")
    ],
    update: [
      body("watch_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Watch must be a valid record.")
        .toInt(),
      body("part_name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Part name cannot be empty.")
        .isLength({ max: 100 })
        .withMessage("Part name must be 100 characters or fewer."),
      body("part_status")
        .optional()
        .isIn(partStatuses)
        .withMessage("Part status is invalid.")
    ]
  },
  auctions: {
    create: [
      body("watch_id").isInt({ min: 1 }).withMessage("Watch is required.").toInt(),
      body("auction_house")
        .trim()
        .notEmpty()
        .withMessage("Auction house is required.")
        .isLength({ max: 120 })
        .withMessage("Auction house must be 120 characters or fewer."),
      body("auction_date")
        .notEmpty()
        .withMessage("Auction date is required.")
        .isISO8601()
        .withMessage("Auction date must be a valid date."),
      body("sale_price")
        .notEmpty()
        .withMessage("Sale price is required.")
        .isFloat({ min: 0 })
        .withMessage("Sale price must be zero or greater.")
        .toFloat(),
      body("currency")
        .trim()
        .notEmpty()
        .withMessage("Currency is required.")
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code.")
        .toUpperCase()
    ],
    update: [
      body("watch_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Watch must be a valid record.")
        .toInt(),
      body("auction_house")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Auction house cannot be empty.")
        .isLength({ max: 120 })
        .withMessage("Auction house must be 120 characters or fewer."),
      body("auction_date")
        .optional()
        .isISO8601()
        .withMessage("Auction date must be a valid date."),
      body("sale_price")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Sale price must be zero or greater.")
        .toFloat(),
      body("currency")
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code.")
        .toUpperCase()
    ]
  },
  checks: {
    create: [
      body("watch_id").isInt({ min: 1 }).withMessage("Watch is required.").toInt(),
      body("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Account must be a valid record.")
        .toInt(),
      body("check_date")
        .notEmpty()
        .withMessage("Check date is required.")
        .isISO8601()
        .withMessage("Check date must be a valid date."),
      body("serial_status")
        .notEmpty()
        .withMessage("Serial status is required.")
        .isIn(serialStatuses)
        .withMessage("Serial status is invalid."),
      body("parts_status")
        .notEmpty()
        .withMessage("Parts status is required.")
        .isIn(partsStatuses)
        .withMessage("Parts status is invalid."),
      body("auction_status")
        .notEmpty()
        .withMessage("Auction status is required.")
        .isIn(auctionStatuses)
        .withMessage("Auction status is invalid."),
      body("final_result")
        .notEmpty()
        .withMessage("Final result is required.")
        .isIn(finalResults)
        .withMessage("Final result is invalid."),
      body("notes")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Notes must be text.")
    ],
    update: [
      body("watch_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Watch must be a valid record.")
        .toInt(),
      body("user_id")
        .optional({ values: "falsy" })
        .isInt({ min: 1 })
        .withMessage("Account must be a valid record.")
        .toInt(),
      body("check_date")
        .optional()
        .isISO8601()
        .withMessage("Check date must be a valid date."),
      body("serial_status")
        .optional()
        .isIn(serialStatuses)
        .withMessage("Serial status is invalid."),
      body("parts_status")
        .optional()
        .isIn(partsStatuses)
        .withMessage("Parts status is invalid."),
      body("auction_status")
        .optional()
        .isIn(auctionStatuses)
        .withMessage("Auction status is invalid."),
      body("final_result")
        .optional()
        .isIn(finalResults)
        .withMessage("Final result is invalid."),
      body("notes")
        .optional({ values: "falsy" })
        .isString()
        .withMessage("Notes must be text.")
    ]
  }
};

const commonRules = [
  param("resource")
    .custom((value) => Boolean(getResource(value)))
    .withMessage("Unknown resource."),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search must be 100 characters or fewer.")
];

export const resourceListValidators = commonRules;

export const resourceParamValidators = [
  param("resource")
    .custom((value) => Boolean(getResource(value)))
    .withMessage("Unknown resource."),
  param("id")
    .isInt({ min: 1 })
    .withMessage("Record id must be a positive integer.")
    .toInt()
];

export async function validateResourcePayload(req, _res, next) {
  const resource = getResource(req.params.resource);

  if (!resource) {
    return next(new NotFoundError("Unknown resource."));
  }

  const action = req.method === "POST" ? "create" : "update";
  const rules = [
    ...(action === "update" ? resourceParamValidators : commonRules),
    ...(resourceRules[req.params.resource]?.[action] || [])
  ];

  for (const rule of rules) {
    await rule.run(req);
  }

  if (req.user?.role === ROLES.ORG_ADMIN && req.body.role === ROLES.SUPER_ADMIN) {
    return next(new BadRequestError("Org administrators cannot assign the SuperAdmin role."));
  }

  if (req.user?.role === ROLES.USER && req.params.resource !== "watches") {
    return next(new BadRequestError("Users can only submit watch registrations."));
  }

  return next();
}
