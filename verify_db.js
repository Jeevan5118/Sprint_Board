import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        console.log('--- DB VERIFICATION ---');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name IN ('pending_status', 'is_power_hour')
        `);
        console.log('Columns found:', JSON.stringify(res.rows, null, 2));

        const taskRes = await pool.query('SELECT id, title, status, pending_status FROM tasks LIMIT 1');
        console.log('Sample Task:', JSON.stringify(taskRes.rows, null, 2));

        console.log('--- SYSTEM CHECK COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}
verify();
