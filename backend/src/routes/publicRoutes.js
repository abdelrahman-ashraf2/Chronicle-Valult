import { Router } from "express";
import { lookupSerial, verifyPublicToken } from "../controllers/publicController.js";
import { acceptInvitation } from "../controllers/teamController.js";

const router = Router();

router.get("/lookup/:serial", lookupSerial);
router.get("/verify/:token", verifyPublicToken);
router.post("/invitations/accept", acceptInvitation);

export default router;
