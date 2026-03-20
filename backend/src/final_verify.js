import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function finalVerify() {
    const client = new Client({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
    try {
        await client.connect();
        const id = '04ad136e-aa88-4436-9328-1e948393535c'; // Unified Jeevan ID
        console.log(`\n=== FINAL VERIFICATION FOR UNIFIED ID: ${id} ===`);

        const user = await client.query('SELECT name, email FROM users WHERE id = $1', [id]);
        console.table(user.rows);

        const mems = await client.query('SELECT t.name FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE user_id = $1', [id]);
        console.log('Teams:', mems.rows.map(r => r.name).join(', '));

        const tasksCount = await client.query('SELECT count(*) FROM tasks WHERE assignee_id = $1', [id]);
        console.log('Assigned Tasks:', tasksCount.rows[0].count);

        const teamTasks = await client.query('SELECT count(*) FROM tasks WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)', [id]);
        console.log('Visible Team Tasks:', teamTasks.rows[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

finalVerify();
