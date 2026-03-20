import pool from './backend/src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

async function checkUsers() {
    try {
        const res = await pool.query('SELECT name, email FROM users ORDER BY name');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkUsers();
