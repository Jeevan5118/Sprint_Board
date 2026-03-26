import { query } from './backend/src/config/db.js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function auditTasks() {
    try {
        console.log('--- Power Hour Task Audit ---');
        
        // 1. Find Power Hour tasks that might be standard
        const phTasks = await query(`
            SELECT t.id, t.title, t.is_power_hour, te.name as team_name, s.name as sprint_name
            FROM tasks t
            JOIN teams te ON t.team_id = te.id
            LEFT JOIN sprints s ON t.sprint_id = s.id
            WHERE t.is_power_hour = true
            LIMIT 10
        `);
        console.log('\nPower Hour Tasks Sample:');
        console.table(phTasks.rows);

        // 2. Summary stats
        const stats = await query(`
            SELECT 
                is_power_hour, 
                COUNT(*) as count
            FROM tasks 
            GROUP BY is_power_hour
        `);
        console.log('\nTask Stats:');
        console.table(stats.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditTasks();
