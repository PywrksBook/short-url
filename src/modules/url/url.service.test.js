import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CustomAliasConflictError,
  createShortUrl,
  normalizeOriginalUrl,
  ShortCodeGenerationError,
  UrlInputError,
} from './url.service.js';

const baseUrl = 'https://short.example';

test('normalizes a valid HTTP URL', () => {
  assert.equal(
    normalizeOriginalUrl('https://example.com', baseUrl),
    'https://example.com/',
  );
});

test('rejects unsupported schemes and the app domain', () => {
  assert.throws(
    () => normalizeOriginalUrl('javascript:alert(1)', baseUrl),
    UrlInputError,
  );
  assert.throws(
    () => normalizeOriginalUrl('https://SHORT.example/path', baseUrl),
    UrlInputError,
  );
});

test('rejects URLs longer than 2048 normalized characters', () => {
  const longUrl = `https://example.com/${'a'.repeat(2048)}`;
  assert.throws(() => normalizeOriginalUrl(longUrl, baseUrl), UrlInputError);
});

test('creates a short URL and retries a duplicate code', async () => {
  let calls = 0;
  const pool = {
    async query(_sql, values) {
      calls += 1;
      if (calls === 1) {
        const error = new Error('duplicate key');
        error.code = '23505';
        throw error;
      }

      return {
        rows: [{
          original_url: values[0],
          short_code: values[1],
          created_at: new Date('2026-10-01T00:00:00Z'),
        }],
      };
    },
  };

  const codes = ['duplicate', 'aB3_xYz'];
  const result = await createShortUrl('https://example.com', {
    pool,
    baseUrl,
    generateCode: () => codes.shift(),
  });

  assert.equal(calls, 2);
  assert.equal(result.shortCode, 'aB3_xYz');
  assert.equal(result.shortUrl, 'https://short.example/aB3_xYz');
  assert.equal(result.originalUrl, 'https://example.com/');
});

test('stops after five short-code collisions', async () => {
  let calls = 0;
  const pool = {
    async query() {
      calls += 1;
      const error = new Error('duplicate key');
      error.code = '23505';
      throw error;
    },
  };

  await assert.rejects(
    createShortUrl('https://example.com', {
      pool,
      baseUrl,
      generateCode: () => 'sameCode',
    }),
    ShortCodeGenerationError,
  );
  assert.equal(calls, 5);
});

test('uses a valid custom alias as the short code', async () => {
  let queryValues;
  const pool = {
    async query(_sql, values) {
      queryValues = values;
      return {
        rows: [{
          original_url: values[0],
          short_code: values[1],
          created_at: new Date('2026-10-01T00:00:00Z'),
        }],
      };
    },
  };

  const result = await createShortUrl('https://example.com', {
    pool,
    baseUrl,
    customAlias: 'promo_2026',
    generateCode: () => assert.fail('Custom alias should not generate a random code'),
  });

  assert.equal(queryValues[1], 'promo_2026');
  assert.equal(result.shortCode, 'promo_2026');
  assert.equal(result.shortUrl, 'https://short.example/promo_2026');
});

test('rejects invalid and reserved custom aliases', async () => {
  const pool = { query: async () => assert.fail('Invalid alias must not query database') };

  for (const customAlias of ['ab', 'contains space', 'bad.alias', 'a'.repeat(31), 'api', 'HEALTH', 'static', 'admin']) {
    await assert.rejects(
      createShortUrl('https://example.com', { pool, baseUrl, customAlias }),
      UrlInputError,
      customAlias,
    );
  }
});

test('reports a conflict when a custom alias is already used', async () => {
  let calls = 0;
  const pool = {
    async query() {
      calls += 1;
      const error = new Error('duplicate key');
      error.code = '23505';
      throw error;
    },
  };

  await assert.rejects(
    createShortUrl('https://example.com', {
      pool,
      baseUrl,
      customAlias: 'promo2026',
    }),
    CustomAliasConflictError,
  );
  assert.equal(calls, 1);
});
