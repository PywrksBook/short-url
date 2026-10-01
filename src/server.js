import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import pool from './db.js';
import createUrlRouter from './modules/url/url.routes.js';
import createRedirectRouter from './modules/redirect/redirect.routes.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

// ป้องกันสร้างลิงก์จริงที่ชี้กลับไป localhost หากลืมตั้งค่าโดเมนบน hosting
if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
  throw new Error('BASE_URL must be configured in production.');
}

// ส่งหน้าเว็บและไฟล์ CSS/JavaScript ก่อน route ที่รับ short code
app.use(express.static(publicDirectory));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ status: 'error', db: 'unreachable' });
  }
});

// แยก route สร้างลิงก์และ route เปิดลิงก์ไว้คนละโมดูล
app.use('/api/urls', createUrlRouter({ pool, baseUrl }));
app.use('/', createRedirectRouter({ pool }));

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body must contain valid JSON.' });
    return;
  }

  console.error('Request failed:', err.message);
  res.status(500).json({ error: 'An internal error occurred.' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;