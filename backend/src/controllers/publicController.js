import pool from "../config/db.js";
import { BadRequestError, NotFoundError } from "../utils/httpErrors.js";

export async function lookupSerial(req, res, next) {
  try {
    const serial = String(req.params.serial || "").trim();

    if (!serial) {
      throw new BadRequestError("A serial number is required.");
    }

    const [watches] = await pool.execute(
      `SELECT w.watch_id, w.model_name, w.serial_number, w.production_year,
              w.case_material, w.watch_condition, b.brand_name,
              m.movement_name, m.movement_type
       FROM Watches w
       LEFT JOIN Brands b ON w.brand_id = b.brand_id
       LEFT JOIN Movements m ON w.movement_id = m.movement_id
       WHERE w.serial_number = ?
         AND w.archived_at IS NULL
         AND b.archived_at IS NULL
       LIMIT 1`,
      [serial]
    );

    if (!watches[0]) {
      throw new NotFoundError("No registered watch matches that serial number.");
    }

    const watch = watches[0];
    const [[latestCheck], [counts]] = await Promise.all([
      pool.execute(
        `SELECT check_date, serial_status, parts_status, auction_status, final_result
         FROM AuthenticationChecks
         WHERE watch_id = ? AND archived_at IS NULL
         ORDER BY check_date DESC, check_id DESC
         LIMIT 1`,
        [watch.watch_id]
      ),
      pool.execute(
        `SELECT
          (SELECT COUNT(*) FROM WatchParts WHERE watch_id = ? AND archived_at IS NULL) AS parts_count,
          (SELECT COUNT(*) FROM AuctionRecords WHERE watch_id = ? AND archived_at IS NULL) AS auction_records_count,
          (SELECT COUNT(*) FROM AuthenticationChecks WHERE watch_id = ? AND archived_at IS NULL) AS checks_count`,
        [watch.watch_id, watch.watch_id, watch.watch_id]
      )
    ]);

    return res.json({
      watch,
      latestCheck: latestCheck[0] || null,
      history: counts[0]
    });
  } catch (error) {
    return next(error);
  }
}
