import pool from "../config/db.js";
import { ROLES, isSuperAdmin } from "../config/roles.js";

export async function getDashboard(req, res, next) {
  try {
    const isPlatform = isSuperAdmin(req.user);
    const orgFilter = isPlatform
      ? " WHERE archived_at IS NULL"
      : " WHERE organization_id = ? AND archived_at IS NULL";
    const orgJoinFilter = isPlatform
      ? " WHERE w.archived_at IS NULL"
      : " WHERE w.organization_id = ? AND w.archived_at IS NULL";
    const values = isPlatform ? [] : [req.user.organizationId];

    const queries = isPlatform
      ? [
          pool.execute(`SELECT COUNT(*) AS count FROM Organizations WHERE archived_at IS NULL`),
          pool.execute(`SELECT COUNT(*) AS count FROM Users${orgFilter}`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM Watches${orgFilter}`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM WatchParts p INNER JOIN Watches w ON p.watch_id = w.watch_id${orgJoinFilter} AND p.archived_at IS NULL`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM AuctionRecords a INNER JOIN Watches w ON a.watch_id = w.watch_id${orgJoinFilter} AND a.archived_at IS NULL`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM AuthenticationChecks c INNER JOIN Watches w ON c.watch_id = w.watch_id${orgJoinFilter} AND c.archived_at IS NULL`, values)
        ]
      : [
          pool.execute(`SELECT COUNT(*) AS count FROM Users${orgFilter}`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM Watches${orgFilter}`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM WatchParts p INNER JOIN Watches w ON p.watch_id = w.watch_id${orgJoinFilter} AND p.archived_at IS NULL`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM AuctionRecords a INNER JOIN Watches w ON a.watch_id = w.watch_id${orgJoinFilter} AND a.archived_at IS NULL`, values),
          pool.execute(`SELECT COUNT(*) AS count FROM AuthenticationChecks c INNER JOIN Watches w ON c.watch_id = w.watch_id${orgJoinFilter} AND c.archived_at IS NULL`, values)
        ];

    const [counts, recentWatchesResult, latestChecksResult] = await Promise.all([
      Promise.all(queries),
      pool.execute(
        `SELECT w.watch_id, w.model_name, w.serial_number, w.production_year, w.watch_condition,
                b.brand_name, o.organization_name, u.username AS owner_username
         FROM Watches w
         LEFT JOIN Brands b ON w.brand_id = b.brand_id
         LEFT JOIN Organizations o ON w.organization_id = o.organization_id
         LEFT JOIN Users u ON w.user_id = u.user_id
         WHERE w.archived_at IS NULL
         ${isPlatform ? "" : "AND w.organization_id = ?"}
         ORDER BY w.watch_id DESC
         LIMIT 5`,
        values
      ),
      pool.execute(
        `SELECT c.check_id, c.check_date, c.final_result, c.serial_status, c.parts_status, c.auction_status,
                w.model_name, w.serial_number, b.brand_name, o.organization_name
         FROM AuthenticationChecks c
         INNER JOIN Watches w ON c.watch_id = w.watch_id
         LEFT JOIN Brands b ON w.brand_id = b.brand_id
         LEFT JOIN Organizations o ON w.organization_id = o.organization_id
         WHERE w.archived_at IS NULL AND c.archived_at IS NULL
         ${isPlatform ? "" : "AND w.organization_id = ?"}
         ORDER BY c.check_date DESC, c.check_id DESC
         LIMIT 5`,
        values
      )
    ]);

    const stats = isPlatform
      ? {
          organizations: counts[0][0][0].count,
          users: counts[1][0][0].count,
          watches: counts[2][0][0].count,
          parts: counts[3][0][0].count,
          auctions: counts[4][0][0].count,
          checks: counts[5][0][0].count
        }
      : {
          users: counts[0][0][0].count,
          watches: counts[1][0][0].count,
          parts: counts[2][0][0].count,
          auctions: counts[3][0][0].count,
          checks: counts[4][0][0].count
        };

    return res.json({
      stats,
      recentWatches: recentWatchesResult[0],
      latestChecks: latestChecksResult[0]
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMyDashboard(req, res, next) {
  try {
    const [watchRows] = await pool.execute(
      `SELECT COUNT(*) AS total_watches
       FROM Watches
       WHERE organization_id = ? AND user_id = ? AND archived_at IS NULL`,
      [req.user.organizationId, req.user.id]
    );
    const [checkRows] = await pool.execute(
      `SELECT
         COUNT(*) AS total_checks,
         SUM(final_result = 'Authentic') AS authentic_count,
         SUM(final_result = 'Counterfeit') AS fake_count,
         SUM(final_result IN ('Questionable', 'Pending')) AS needs_review_count
       FROM AuthenticationChecks c
       INNER JOIN Watches w ON c.watch_id = w.watch_id
       WHERE w.organization_id = ? AND w.user_id = ?
         AND w.archived_at IS NULL AND c.archived_at IS NULL`,
      [req.user.organizationId, req.user.id]
    );
    const [latestWatches] = await pool.execute(
      `SELECT w.watch_id, w.model_name, w.serial_number, w.production_year, w.watch_condition, b.brand_name
       FROM Watches w
       LEFT JOIN Brands b ON w.brand_id = b.brand_id
       WHERE w.organization_id = ? AND w.user_id = ? AND w.archived_at IS NULL
       ORDER BY w.watch_id DESC
       LIMIT 5`,
      [req.user.organizationId, req.user.id]
    );
    const [latestChecks] = await pool.execute(
      `SELECT c.check_id, c.check_date, c.final_result, c.serial_status, c.parts_status,
              c.auction_status, w.model_name, w.serial_number, b.brand_name
       FROM AuthenticationChecks c
       INNER JOIN Watches w ON c.watch_id = w.watch_id
       LEFT JOIN Brands b ON w.brand_id = b.brand_id
       WHERE w.organization_id = ? AND w.user_id = ?
         AND w.archived_at IS NULL AND c.archived_at IS NULL
       ORDER BY c.check_date DESC, c.check_id DESC
       LIMIT 5`,
      [req.user.organizationId, req.user.id]
    );

    return res.json({
      totalWatchesOwned: watchRows[0].total_watches,
      totalAuthenticationChecks: checkRows[0].total_checks,
      latestWatches,
      latestChecks,
      authenticCount: checkRows[0].authentic_count || 0,
      fakeCount: checkRows[0].fake_count || 0,
      needsReviewCount: checkRows[0].needs_review_count || 0
    });
  } catch (error) {
    return next(error);
  }
}
