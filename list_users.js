import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import db from './backend/src/config/db.js';
async function run() {
    try {
        console.log('--- USER LIST ---');
        const res = await db.query('SELECT name, email, role FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Failed to fetch users:', err);
        process.exit(1);
    }
}
run();
