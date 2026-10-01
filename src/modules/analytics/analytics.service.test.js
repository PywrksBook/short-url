import assert from 'node:assert/strict';
import test from 'node:test';
import { getUrlHistory } from './analytics.service.js';

test('returns recent URL history with click totals and last-click times', async () => {
  let queryText = '';
  const expected = [{
    id: 3,
    originalUrl: 'https://example.com/',
    shortCode: 'abc1234',
    createdAt: '2026-10-01T12:00:00.000Z',
    clickCount: 2,
    lastClickedAt: '2026-10-01T13:00:00.000Z',
  }];
  const pool = {
    async query(sql) {
      queryText = sql;
      return { rows: expected };
    },
  };

  assert.deepEqual(await getUrlHistory(pool), expected);
  assert.match(queryText, /LEFT JOIN clicks/);
  assert.match(queryText, /COUNT\(c\.id\)/);
  assert.match(queryText, /MAX\(c\.clicked_at\)/);
  assert.match(queryText, /ORDER BY u\.created_at DESC/);
  assert.match(queryText, /LIMIT 100/);
});

test('does not hide URLs that have never been clicked', async () => {
  let queryText = '';
  const pool = {
    async query(sql) {
      queryText = sql;
      return {
        rows: [{
          id: 1,
          clickCount: 0,
          lastClickedAt: null,
        }],
      };
    },
  };

  const [url] = await getUrlHistory(pool);
  assert.match(queryText, /LEFT JOIN clicks/);
  assert.equal(url.clickCount, 0);
  assert.equal(url.lastClickedAt, null);
});
