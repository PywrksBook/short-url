import { nanoid } from 'nanoid';
import QRCode from 'qrcode';

export class UrlInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UrlInputError';
  }
}

export class ShortCodeGenerationError extends Error {
  constructor() {
    super('Could not generate a unique short code. Please try again.');
    this.name = 'ShortCodeGenerationError';
  }
}

export class CustomAliasConflictError extends Error {
  constructor() {
    super('This custom alias is already in use. Please choose another one.');
    this.name = 'CustomAliasConflictError';
  }
}

export class ShortUrlNotFoundError extends Error {
  constructor() {
    super('Short URL was not found.');
    this.name = 'ShortUrlNotFoundError';
  }
}

export function normalizeOriginalUrl(input, baseUrl) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new UrlInputError('Please provide a URL.');
  }

  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new UrlInputError('Please enter a valid URL starting with http:// or https://.');
  }

  // รับเฉพาะลิงก์เว็บ เพื่อป้องกัน scheme อื่น เช่น javascript: หรือ data:
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlInputError('Only http:// and https:// URLs are allowed.');
  }

  const appUrl = new URL(baseUrl);
  // ไม่ให้ย่อลิงก์ของระบบตัวเอง เพราะอาจทำให้ redirect วนกลับมาซ้ำ
  if (url.hostname.toLowerCase() === appUrl.hostname.toLowerCase()) {
    throw new UrlInputError('You cannot shorten a URL from this Shorturl domain.');
  }

  if (url.href.length > 2048) {
    throw new UrlInputError('The URL must be 2048 characters or fewer.');
  }

  return url.href;
}

function normalizeCustomAlias(input) {
  if (input === undefined || input === null) {
    return null;
  }

  if (typeof input !== 'string') {
    throw new UrlInputError('Custom alias must be text.');
  }

  const alias = input.trim();
  if (alias === '') {
    return null;
  }

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(alias)) {
    throw new UrlInputError(
      'Custom alias must be 3–30 characters and use only letters, numbers, hyphens, or underscores.',
    );
  }

  if (['api', 'health', 'static', 'admin'].includes(alias.toLowerCase())) {
    throw new UrlInputError('This custom alias is reserved. Please choose another one.');
  }

  return alias;
}

export async function createShortUrl(
  originalUrl,
  {
    pool,
    baseUrl,
    customAlias,
    generateCode = () => nanoid(7),
  },
) {
  const normalizedUrl = normalizeOriginalUrl(originalUrl, baseUrl);
  const requestedAlias = normalizeCustomAlias(customAlias);
  const appUrl = `${new URL(baseUrl).origin}/`;
  const maxAttempts = requestedAlias ? 1 : 5;

  // รหัสสุ่มลองใหม่เมื่อชนกัน ส่วน alias ที่ผู้ใช้เลือกต้องแจ้งให้เลือกชื่อใหม่
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const shortCode = requestedAlias || generateCode();

    try {
      const { rows } = await pool.query(
        `INSERT INTO urls (original_url, short_code)
         VALUES ($1, $2)
         RETURNING original_url, short_code, created_at`,
        [normalizedUrl, shortCode],
      );
      const created = rows[0];

      return {
        shortCode: created.short_code,
        shortUrl: new URL(created.short_code, appUrl).href,
        originalUrl: created.original_url,
        createdAt: created.created_at,
      };
    } catch (error) {
      if (error.code !== '23505') {
        throw error;
      }

      if (requestedAlias) {
        throw new CustomAliasConflictError();
      }
    }
  }

  throw new ShortCodeGenerationError();
}

export async function createShortUrlQr(code, { pool, baseUrl }) {
  const { rows } = await pool.query(
    'SELECT short_code FROM urls WHERE short_code = $1',
    [code],
  );

  if (rows.length === 0) {
    throw new ShortUrlNotFoundError();
  }

  const shortUrl = new URL(rows[0].short_code, `${new URL(baseUrl).origin}/`).href;
  return QRCode.toBuffer(shortUrl, { type: 'png' });
}
