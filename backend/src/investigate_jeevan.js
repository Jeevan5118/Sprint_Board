import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function investigateUser() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== INVESTIGATING: Konduru Jeevan ===');
        const userRes = await client.query("SELECT id, name, email, role FROM users WHERE name ILIKE '%Jeevan%'");
        console.table(userRes.rows);

        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            const userId = user.id;

            console.log(`\n--- Memberships for ${user.name} ---`);
            const mems = await client.query(`SELECT tm.*, t.name as team_name FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE user_id = $1`, [userId]);
            console.table(mems.rows);

            console.log(`\n--- Tasks explicitly assigned to ${user.name} ---`);
            const tasks = await client.query(`SELECT id, title, team_id, status FROM tasks WHERE assignee_id = $1`, [userId]);
            console.table(tasks.rows);

            if (mems.rows.length > 0) {
                const teamId = mems.rows[0].team_id;
                console.log(`\n--- Tasks in ${mems.rows[0].team_name} (Should be visible) ---`);
                const teamTasks = await client.query(`SELECT id, title, status, assignee_id FROM tasks WHERE team_id = $1`, [teamId]);
                console.table(teamTasks.rows);
            }
        } else {
            console.log('User "Konduru Jeevan" not found in DB.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

investigateUser();
