import assert from 'node:assert/strict';
import test from 'node:test';
import { getUrlHistory } from './analytics.service.js';

test('returns a requested history page with click totals and last-click times', async () => {
  const queries = [];
  const expected = [{
    id: 3,
    originalUrl: 'https://example.com/',
    shortCode: 'abc1234',
    createdAt: '2026-10-01T12:00:00.000Z',
    clickCount: 2,
    lastClickedAt: '2026-10-01T13:00:00.000Z',
  }];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: '25' }] };
      }
      return { rows: expected };
    },
  };

  assert.deepEqual(await getUrlHistory(pool, 2, 10), {
    items: expected,
    page: 2,
    pageSize: 10,
    totalItems: 25,
    totalPages: 3,
  });
  assert.match(queries[0].sql, /COUNT\(\*\) FROM urls/);
  assert.match(queries[1].sql, /LEFT JOIN clicks/);
  assert.match(queries[1].sql, /COUNT\(c\.id\)/);
  assert.match(queries[1].sql, /MAX\(c\.clicked_at\)/);
  assert.match(queries[1].sql, /ORDER BY u\.created_at DESC, u\.id DESC/);
  assert.match(queries[1].sql, /LIMIT \$1 OFFSET \$2/);
  assert.deepEqual(queries[1].values, [10, 10]);
});

test('does not hide URLs that have never been clicked', async () => {
  let historyQuery = '';
  const pool = {
    async query(sql) {
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: '1' }] };
      }
      historyQuery = sql;
      return {
        rows: [{
          id: 1,
          clickCount: 0,
          lastClickedAt: null,
        }],
      };
    },
  };

  const { items: [url] } = await getUrlHistory(pool);
  assert.match(historyQuery, /LEFT JOIN clicks/);
  assert.equal(url.clickCount, 0);
  assert.equal(url.lastClickedAt, null);
});

test('returns zero pages when there are no URLs', async () => {
  const pool = {
    async query(sql) {
      return sql.includes('COUNT(*)')
        ? { rows: [{ count: '0' }] }
        : { rows: [] };
    },
  };

  assert.deepEqual(await getUrlHistory(pool), {
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
});
