import { Router } from "express";
import pool from "../config/db.js";
import { requireApiKey } from "../middleware/apiKeyAuth.js";

const router = Router();
router.use(requireApiKey);
router.get("/watches", async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT w.watch_id, b.brand_name, w.model_name, w.serial_number,
              w.reference_number, w.production_year, w.watch_condition,
              w.public_visibility, w.updated_at
       FROM Watches w LEFT JOIN Brands b ON w.brand_id = b.brand_id
       WHERE w.organization_id = ? AND w.archived_at IS NULL
       ORDER BY w.updated_at DESC LIMIT 100`,
      [req.apiClient.organization_id]
    );
    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
});

export default router;
