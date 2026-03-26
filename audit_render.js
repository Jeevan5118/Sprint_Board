import pg from 'pg';
const { Pool } = pg;

// Connection string for RENDER from backend/.env
const connectionString = 'postgresql://sprint_board_user:Stg5mvXbO2v5jlyWLJdMnvAo2B2yMqyB@dpg-d6ujaup4tr6s738v7aag-a.oregon-postgres.render.com/sprint_board';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function auditIntegrity() {
    console.log('--- REMOTE RENDER Database Isolation Audit ---');
    try {
        const { rows: leakedInProjects } = await pool.query(`
            SELECT t.id FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.is_power_hour = true AND (p.is_power_hour = false OR p.is_power_hour IS NULL)
        `);

        const { rows: leakedInSprints } = await pool.query(`
            SELECT t.id FROM tasks t
            JOIN sprints s ON t.sprint_id = s.id
            WHERE t.is_power_hour = true AND (s.is_power_hour = false OR s.is_power_hour IS NULL)
        `);

        console.log(`Isolation: Found ${leakedInProjects.length + leakedInSprints.length} leaked tasks.`);

        if (leakedInProjects.length > 0 || leakedInSprints.length > 0) {
            const allIds = [...leakedInProjects, ...leakedInSprints].map(t => t.id);
            await pool.query('UPDATE tasks SET is_power_hour = false WHERE id = ANY($1)', [allIds]);
            console.log('Successfully fixed leaked task flags on Render.');
        }

    } catch (error) {
        console.error('Audit failed on Render:', error);
    } finally {
        process.exit();
    }
}

auditIntegrity();
