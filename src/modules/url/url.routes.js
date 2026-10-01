import { Router } from 'express';
import { getUrlHistory } from '../analytics/analytics.service.js';
import {
  createShortUrl,
  createShortUrlQr,
  ShortUrlNotFoundError,
  UrlInputError,
} from './url.service.js';

export default function createUrlRouter({ pool, baseUrl }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    const page = Number(req.query.page ?? 1);
    if (!Number.isInteger(page) || page < 1) {
      res.status(400).json({ error: 'Page must be a positive whole number.' });
      return;
    }

    try {
      res.json(await getUrlHistory(pool, page, 10));
    } catch (error) {
      next(error);
    }
  });

  // รับ URL จากผู้ใช้ แล้วส่งผลลัพธ์กลับเมื่อบันทึกลงฐานข้อมูลสำเร็จ
  router.post('/', async (req, res, next) => {
    try {
      const result = await createShortUrl(req.body?.originalUrl, { pool, baseUrl });
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof UrlInputError) {
        res.status(400).json({ error: error.message });
        return;
      }

      next(error);
    }
  });

  router.get('/:code/qr', async (req, res, next) => {
    try {
      const png = await createShortUrlQr(req.params.code, { pool, baseUrl });
      res.type('png').send(png);
    } catch (error) {
      if (error instanceof ShortUrlNotFoundError) {
        res.status(404).json({ error: 'Short URL was not found.' });
        return;
      }

      next(error);
    }
  });

  return router;
}
