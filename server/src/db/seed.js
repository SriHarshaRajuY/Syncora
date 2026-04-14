import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, '../../sql');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

const schemaSql = fs.readFileSync(path.join(sqlDir, 'schema.sql'), 'utf8');
const seedSql = fs.readFileSync(path.join(sqlDir, 'seed.sql'), 'utf8');

try {
  await connection.query(schemaSql);
  await connection.query(seedSql);
  console.log('Database schema and sample data loaded successfully.');
} finally {
  await connection.end();
}

