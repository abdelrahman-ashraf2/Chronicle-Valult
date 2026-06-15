import rateLimit from "express-rate-limit";
import { Router } from "express";
import { getProfile, login, logout } from "../controllers/authController.js";
import { getMyDashboard } from "../controllers/dashboardController.js";
import { requireAuth, requireOrganizationAccess, requireRole, ROLES } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { loginValidators } from "../validators/authValidators.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

router.post("/login", loginLimiter, loginValidators, validateRequest, login);
router.get("/me", requireAuth, requireOrganizationAccess, getProfile);
router.post("/logout", requireAuth, logout);
router.get(
  "/me/dashboard",
  requireAuth,
  requireOrganizationAccess,
  requireRole(ROLES.USER),
  getMyDashboard
);

export default router;
