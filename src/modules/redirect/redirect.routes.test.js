import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import createRedirectRouter from './redirect.routes.js';
import createUrlRouter from '../url/url.routes.js';

async function startTestServer(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/urls', createUrlRouter({
    pool,
    baseUrl: 'https://short.example',
  }));
  app.use('/', createRedirectRouter({ pool }));

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

test('POST /api/urls creates a URL with its full short URL', async (t) => {
  const pool = {
    async query(_sql, [originalUrl, shortCode]) {
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
    body: JSON.stringify({ originalUrl: 'https://example.com' }),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.originalUrl, 'https://example.com/');
  assert.equal(body.shortUrl, `https://short.example/${body.shortCode}`);
  assert.match(body.shortCode, /^[A-Za-z0-9_-]{7}$/);
});

test('GET redirects and records clicks, while HEAD does not record a click', async (t) => {
  let clickCount = 0;
  const pool = {
    async query(sql) {
      if (sql.startsWith('SELECT')) {
        return { rows: [{ id: 12, original_url: 'https://example.com/' }] };
      }
      clickCount += 1;
      return { rows: [] };
    },
  };
  const server = await startTestServer(pool);
  t.after(() => server.close());

  const getResponse = await fetch(`${server.url}/abc1234`, {
    redirect: 'manual',
  });
  assert.equal(getResponse.status, 302);
  assert.equal(getResponse.headers.get('location'), 'https://example.com/');
  assert.equal(clickCount, 1);

  const headResponse = await fetch(`${server.url}/abc1234`, {
    method: 'HEAD',
    redirect: 'manual',
  });
  assert.equal(headResponse.status, 302);
  assert.equal(clickCount, 1);
});

test('a click-recording failure does not prevent redirect', async (t) => {
  const pool = {
    async query(sql) {
      if (sql.startsWith('SELECT')) {
        return { rows: [{ id: 12, original_url: 'https://example.com/' }] };
      }
      throw new Error('click insert failed');
    },
  };
  const server = await startTestServer(pool);
  const originalConsoleError = console.error;
  console.error = () => {};
  t.after(async () => {
    console.error = originalConsoleError;
    await server.close();
  });

  const response = await fetch(`${server.url}/abc1234`, {
    redirect: 'manual',
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/');
});
