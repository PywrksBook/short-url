import { Router } from 'express';
import { createShortUrl, UrlInputError } from './url.service.js';

export default function createUrlRouter({ pool, baseUrl }) {
  const router = Router();

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

  return router;
}
