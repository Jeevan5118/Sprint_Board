import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';

const { Pool } = pkg;

// Load .env
dotenv.config({ path: path.join(process.cwd(), 'backend/.env') });

const verifyTable = async () => {
    const connectionString = process.env.NEW_DATABASE_URL;
    console.log("📡 Checking Database: Render (NEW_DATABASE_URL)");

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const { rows } = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'task_history'
            );
        `);
        console.log(`📊 Table 'task_history' exists: ${rows[0].exists}`);
        
        if (rows[0].exists) {
            const columns = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'task_history'
            `);
            console.log("📜 Columns found:", columns.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Verification Failed:", err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

verifyTable();
