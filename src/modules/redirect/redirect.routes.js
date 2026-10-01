import { Router } from 'express';

const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{3,30}$/;

export default function createRedirectRouter({ pool }) {
  const router = Router();

  // ตรวจรูปแบบรหัสก่อนค้นฐานข้อมูล เพื่อไม่ให้ query ด้วย path ที่ไม่ใช่รหัสย่อ
  router.get('/:code', async (req, res, next) => {
    const { code } = req.params;
    if (!SHORT_CODE_PATTERN.test(code)) {
      res.status(404).type('html').send('<h1>ลิงก์นี้ไม่มีอยู่</h1>');
      return;
    }

    try {
      const { rows } = await pool.query(
        'SELECT id, original_url FROM urls WHERE short_code = $1',
        [code],
      );

      if (rows.length === 0) {
        res.status(404).type('html').send('<h1>ลิงก์นี้ไม่มีอยู่</h1>');
        return;
      }

      if (req.method === 'GET') {
        try {
          // ถ้าบันทึกสถิติคลิกมีปัญหา ก็ยังต้อง redirect ให้ผู้ใช้ไปเว็บปลายทาง
          await pool.query(
            'INSERT INTO clicks (url_id, user_agent) VALUES ($1, $2)',
            [rows[0].id, req.get('user-agent') || null],
          );
        } catch (error) {
          console.error('Click tracking failed:', error.message);
        }
      }

      res.redirect(302, rows[0].original_url);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
