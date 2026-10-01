export async function getUrlHistory(pool) {
  const { rows } = await pool.query(
    `SELECT
       u.id,
       u.original_url AS "originalUrl",
       u.short_code AS "shortCode",
       u.created_at AS "createdAt",
       COUNT(c.id)::int AS "clickCount",
       MAX(c.clicked_at) AS "lastClickedAt"
     FROM urls u
     LEFT JOIN clicks c ON c.url_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT 100`,
  );

  return rows;
}
