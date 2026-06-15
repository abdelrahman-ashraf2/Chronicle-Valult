import { Router } from "express";
import { lookupSerial } from "../controllers/publicController.js";

const router = Router();

router.get("/lookup/:serial", lookupSerial);

export default router;
