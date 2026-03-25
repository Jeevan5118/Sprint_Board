import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load backend/.env first
dotenv.config({ path: path.join(process.cwd(), 'backend/.env') });

// Now import db
import db from './backend/src/config/db.js';

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'backend/src/migrations/add_last_updated_by.sql'), 'utf8');
        console.log("Applying Migration...");
        await db.query(sql);
        console.log("Migration Applied Successfully! 🛡️📜✨");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
};

runMigration();
