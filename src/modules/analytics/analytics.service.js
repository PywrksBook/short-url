export async function getUrlHistory(pool, page = 1, pageSize = 10) {
  const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM urls');
  const totalItems = Number(countRows[0].count);
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;

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
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset],
  );

  return {
    items: rows,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}
