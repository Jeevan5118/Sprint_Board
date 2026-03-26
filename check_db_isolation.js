import db from './backend/src/config/db.js';

async function checkIsolation() {
    try {
        console.log('--- Isolation Column Audit ---');
        
        const tables = ['tasks', 'sprints', 'projects'];
        for (const table of tables) {
            const res = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE is_power_hour IS NULL) as is_null,
                    COUNT(*) FILTER (WHERE is_power_hour = true) as is_true,
                    COUNT(*) FILTER (WHERE is_power_hour = false) as is_false
                FROM ${table}
            `);
            const s = res.rows[0];
            console.log(`Table: ${table}`);
            console.log(`  Total: ${s.total}`);
            console.log(`  NULL:  ${s.is_null}`);
            console.log(`  TRUE:  ${s.is_true}`);
            console.log(`  FALSE: ${s.is_false}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkIsolation();
