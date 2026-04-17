import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { Pool } = pkg;
console.log('Using URL:', process.env.DATABASE_URL ? 'Loaded' : 'MISSING');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- DB USER CHECK ---');
        const res = await pool.query('SELECT name, email, role FROM users');
        console.log('Users in DB:');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
run();
