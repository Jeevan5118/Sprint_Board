import db from './backend/src/config/db.js';

async function backfillIsolation() {
    try {
        console.log('--- Starting Isolation Backfill ---');
        
        const tables = ['tasks', 'sprints', 'projects'];
        for (const table of tables) {
            const res = await db.query(`
                UPDATE ${table} 
                SET is_power_hour = FALSE 
                WHERE is_power_hour IS NULL
                RETURNING id
            `);
            console.log(`Table: ${table} -> Updated ${res.rowCount} records.`);
        }

        console.log('--- Backfill Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration Failed:', err);
        process.exit(1);
    }
}

backfillIsolation();
