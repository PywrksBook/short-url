import { nanoid } from 'nanoid';

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

export async function createShortUrl(
  originalUrl,
  { pool, baseUrl, generateCode = () => nanoid(7) },
) {
  const normalizedUrl = normalizeOriginalUrl(originalUrl, baseUrl);
  const appUrl = `${new URL(baseUrl).origin}/`;

  // short_code มี UNIQUE constraint จึงลองสร้างรหัสใหม่ได้เมื่อบังเอิญซ้ำ
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortCode = generateCode();

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
    }
  }

  throw new ShortCodeGenerationError();
}
