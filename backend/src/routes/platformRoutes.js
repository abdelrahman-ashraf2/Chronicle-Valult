import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import {
  addCaseComment,
  createCase,
  getCaseDetail,
  listCases,
  transitionCase
} from "../controllers/caseController.js";
import {
  createApiKey,
  createWebhook,
  exportResourceCsv,
  getOrganizationSettings,
  importWatchesCsv,
  listApiKeys,
  listPlans,
  listWebhooks,
  revokeApiKey,
  updateOrganizationSettings
} from "../controllers/commercialController.js";
import { downloadEvidence, uploadEvidence } from "../controllers/evidenceController.js";
import {
  createInvitation,
  createTransfer,
  listInvitations,
  listOrganizationMembers,
  listNotifications,
  listTransfers,
  markNotificationRead,
  respondTransfer
} from "../controllers/teamController.js";
import {
  addProvenanceEvent,
  getWatchDetail,
  listWatchesV1,
  updateWatchPublishing
} from "../controllers/watchPlatformController.js";
import { requireAuth, requireOrganizationAccess } from "../middleware/auth.js";

fs.mkdirSync(env.uploadDir, { recursive: true });
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase().slice(0, 10);
      callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = allowedMimeTypes.includes(file.mimetype);
    callback(allowed ? null : new Error("Unsupported evidence file type."), allowed);
  }
});
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
    callback(allowed ? null : new Error("Only CSV files are supported."), allowed);
  }
});

const router = Router();
router.get("/plans", listPlans);
router.use(requireAuth, requireOrganizationAccess);

router.get("/watches", listWatchesV1);
router.get("/watches/:id", getWatchDetail);
router.patch("/watches/:id/publishing", updateWatchPublishing);
router.post("/watches/:id/provenance", addProvenanceEvent);

router.get("/cases", listCases);
router.post("/cases", createCase);
router.get("/cases/:id", getCaseDetail);
router.patch("/cases/:id/status", transitionCase);
router.post("/cases/:id/comments", addCaseComment);

router.post("/evidence", upload.single("file"), uploadEvidence);
router.get("/evidence/:id/download", downloadEvidence);

router.get("/invitations", listInvitations);
router.post("/invitations", createInvitation);
router.get("/team/members", listOrganizationMembers);
router.get("/transfers", listTransfers);
router.post("/transfers", createTransfer);
router.patch("/transfers/:id", respondTransfer);
router.get("/notifications", listNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

router.get("/organization/settings", getOrganizationSettings);
router.patch("/organization/settings", updateOrganizationSettings);
router.get("/api-keys", listApiKeys);
router.post("/api-keys", createApiKey);
router.delete("/api-keys/:id", revokeApiKey);
router.get("/webhooks", listWebhooks);
router.post("/webhooks", createWebhook);
router.get("/exports/:resource.csv", exportResourceCsv);
router.post("/imports/watches.csv", csvUpload.single("file"), importWatchesCsv);

export default router;
