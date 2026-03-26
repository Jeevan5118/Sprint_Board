import { query } from './backend/src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';

// Force load the backend env
dotenv.config({ path: './backend/.env' });

async function verifyLive() {
    try {
        console.log('--- Live Deployment Verification ---');
        
        // 1. Check Tables
        const tables = await query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('Tables found:', tables.rows.map(r => r.tablename).join(', '));

        // 2. Fetch Admin
        const admins = await query("SELECT name, email FROM users WHERE role = 'Admin' LIMIT 1");
        if (admins.rows.length > 0) {
            console.log('ADMIN_FOUND:', admins.rows[0].email);
        } else {
            console.log('NO_ADMIN_FOUND');
        }

        // 3. Check Power Hour Data
        const phTasks = await query("SELECT COUNT(*) FROM tasks WHERE is_power_hour = true");
        const normTasks = await query("SELECT COUNT(*) FROM tasks WHERE is_power_hour = false OR is_power_hour IS NULL");
        console.log(`Power Hour Tasks: ${phTasks.rows[0].count}`);
        console.log(`Normal Tasks: ${normTasks.rows[0].count}`);

        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION_FAILED:', err.message);
        process.exit(1);
    }
}

verifyLive();
