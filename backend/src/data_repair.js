import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function runDataRepair() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- START DATA REPAIR ---');

        // 1. Lowercase all emails in users table
        console.log('Normalizing user emails...');
        const emailFix = await client.query('UPDATE users SET email = LOWER(email) WHERE email != LOWER(email)');
        console.log(`Updated ${emailFix.rowCount} user emails.`);

        // 2. Identify Tasks with assigned users who are NOT in the team_members table
        console.log('Identifying orphaned assignments...');
        const orphans = await client.query(`
            SELECT DISTINCT t.team_id, t.assignee_id
            FROM tasks t
            LEFT JOIN team_members tm ON t.team_id = tm.team_id AND t.assignee_id = tm.user_id
            WHERE t.assignee_id IS NOT NULL AND tm.user_id IS NULL
        `);
        console.log(`Found ${orphans.rows.length} orphaned assignments.`);

        // 3. Fix orphans by adding them to team_members
        for (const row of orphans.rows) {
            await client.query(
                'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [row.team_id, row.assignee_id, 'Member']
            );
            console.log(`Linked user ${row.assignee_id} to team ${row.team_id}.`);
        }

        console.log('--- DATA REPAIR COMPLETE ---');
    } catch (err) {
        console.error('Repair failed:', err);
    } finally {
        await client.end();
    }
}

runDataRepair();
