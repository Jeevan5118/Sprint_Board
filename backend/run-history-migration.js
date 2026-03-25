import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import pkg from 'pg';

const { Pool } = pkg;

// Load .env
dotenv.config();

const runMigration = async () => {
    // Use NEW_DATABASE_URL (Render)
    const connectionString = process.env.NEW_DATABASE_URL;
    console.log("📡 Retargeting Database: Render (NEW_DATABASE_URL)");

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'src/migrations/add_last_updated_by.sql'), 'utf8');
        console.log("Applying Migration...");
        await pool.query(sql);
        console.log("Migration Applied Successfully to Render! 🛡️📜✨");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

runMigration();
