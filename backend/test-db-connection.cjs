const pkg = require('pg');
const { Pool } = pkg;
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    const res = await pool.query('SELECT name, email, role FROM users');
    console.log('Successfully connected!');
    console.log('Users found:', res.rows.length);
    console.table(res.rows);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
