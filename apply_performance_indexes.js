import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- APPLYING PERFORMANCE INDEXES ---');

        // Index for the core board query
        console.log('Adding idx_tasks_perf_core...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_perf_core ON tasks (team_id, is_power_hour, sprint_id)');

        // Index for assignee filtering (member visibility)
        console.log('Adding idx_tasks_assignee_id...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id)');

        // Index for project filtering if applicable
        console.log('Adding idx_tasks_project_id...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id)');

        console.log('--- INDEXING COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
run();
