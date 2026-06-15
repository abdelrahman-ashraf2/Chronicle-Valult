import { Router } from "express";
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord
} from "../controllers/crudController.js";
import { getDashboard } from "../controllers/dashboardController.js";
import { requireAuth, requireOrganizationAccess, requireRole, ROLES } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import {
  resourceListValidators,
  resourceParamValidators,
  validateResourcePayload
} from "../validators/resourceValidators.js";

const router = Router();

router.use(requireAuth, requireOrganizationAccess);

router.get(
  "/dashboard/summary",
  requireRole(ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN),
  getDashboard
);

router.get("/:resource", resourceListValidators, validateRequest, listRecords);
router.get("/:resource/:id", resourceParamValidators, validateRequest, getRecord);
router.post("/:resource", validateResourcePayload, validateRequest, createRecord);
router.put("/:resource/:id", validateResourcePayload, validateRequest, updateRecord);
router.delete("/:resource/:id", resourceParamValidators, validateRequest, deleteRecord);

export default router;
