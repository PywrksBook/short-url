import 'dotenv/config';
import fs from 'node:fs';
import pg from 'pg';

const sql = fs.readFileSync(new URL('../sql/schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(sql);
  console.log('สร้างตารางสำเร็จ');
} catch (err) {
  console.error('ผิดพลาด:', err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}