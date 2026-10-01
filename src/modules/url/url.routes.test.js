import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import createUrlRouter from './url.routes.js';

async function startTestServer(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/urls', createUrlRouter({
    pool,
    baseUrl: 'https://short.example',
  }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

test('GET /api/urls returns the requested page of URL history', async (t) => {
  const history = [{
    id: 1,
    originalUrl: 'https://example.com/',
    shortCode: 'abc1234',
    createdAt: '2026-10-01T12:00:00.000Z',
    clickCount: 2,
    lastClickedAt: '2026-10-01T13:00:00.000Z',
  }];
  const pool = {
    async query(sql, values) {
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: '25' }] };
      }
      assert.match(sql, /LEFT JOIN clicks/);
      assert.deepEqual(values, [10, 10]);
      return { rows: history };
    },
  };
  const server = await startTestServer(pool);
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/urls?page=2`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    items: history,
    page: 2,
    pageSize: 10,
    totalItems: 25,
    totalPages: 3,
  });
});

test('GET /api/urls rejects invalid page numbers', async (t) => {
  const server = await startTestServer({ query: async () => ({ rows: [] }) });
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/urls?page=0`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Page must be a positive whole number.',
  });
});

test('POST /api/urls accepts an optional custom alias', async (t) => {
  const pool = {
    async query(_sql, [originalUrl, shortCode]) {
      assert.equal(shortCode, 'promo2026');
      return {
        rows: [{
          original_url: originalUrl,
          short_code: shortCode,
          created_at: '2026-10-01T00:00:00.000Z',
        }],
      };
    },
  };
  const server = await startTestServer(pool);
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/urls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      originalUrl: 'https://example.com',
      customAlias: 'promo2026',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).shortUrl, 'https://short.example/promo2026');
});

test('POST /api/urls returns 409 when a custom alias is already used', async (t) => {
  const pool = {
    async query() {
      const error = new Error('duplicate key');
      error.code = '23505';
      throw error;
    },
  };
  const server = await startTestServer(pool);
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/urls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      originalUrl: 'https://example.com',
      customAlias: 'promo2026',
    }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: 'This custom alias is already in use. Please choose another one.',
  });
});

test('GET /api/urls/:code/qr returns a PNG QR of the full short URL', async (t) => {
  const pool = {
    async query(sql, values) {
      assert.match(sql, /SELECT short_code FROM urls/);
      assert.deepEqual(values, ['abc1234']);
      return { rows: [{ short_code: 'abc1234' }] };
    },
  };
  const server = await startTestServer(pool);
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/urls/abc1234/qr`);
  const image = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/png/);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});

test('QR endpoint returns 404 for an unknown short code', async (t) => {
  const pool = {
    async query() {
      return { rows: [] };
    },
  };
  const server = await startTestServer(pool);
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/urls/missing/qr`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: 'Short URL was not found.',
  });
});
