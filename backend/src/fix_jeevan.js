import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function fixJeevanData() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- START JEEVAN DATA FIX ---');

        const primaryEmail = 'konduru.jeevan@sprintboard.com';
        const secondaryEmail = 'jeevankonduru2002@gmail.com';

        // 1. Find User IDs
        const res = await client.query("SELECT id, email FROM users WHERE LOWER(email) IN ($1, $2)", [primaryEmail, secondaryEmail]);
        const primaryUser = res.rows.find(u => u.email.toLowerCase() === primaryEmail);
        const secondaryUser = res.rows.find(u => u.email.toLowerCase() === secondaryEmail);

        if (!primaryUser) {
            console.error('Primary user not found!');
            return;
        }

        const teamName = 'SPOS';
        const teamRes = await client.query("SELECT id FROM teams WHERE name = $1", [teamName]);
        if (teamRes.rows.length === 0) {
            console.error(`Team ${teamName} not found!`);
            return;
        }
        const teamId = teamRes.rows[0].id;

        // 2. Map Primary to Team
        console.log(`Mapping ${primaryEmail} to ${teamName}...`);
        await client.query(
            "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO NOTHING",
            [teamId, primaryUser.id, 'Member']
        );

        // 3. Transfer any assignments from secondary to primary
        if (secondaryUser) {
            console.log(`Transferring tasks from ${secondaryEmail} to ${primaryEmail}...`);
            const updateTasks = await client.query("UPDATE tasks SET assignee_id = $1 WHERE assignee_id = $2", [primaryUser.id, secondaryUser.id]);
            console.log(`Transferred ${updateTasks.rowCount} tasks.`);
            
            // Optional: Delete secondary user to prevent confusion
            // await client.query("DELETE FROM users WHERE id = $1", [secondaryUser.id]);
        }

        // 4. Global Sanity Check: Ensure anyone with an assignment as Member IS in that team
        console.log('Fixing orphaned team memberships globally...');
        const orphans = await client.query(`
            SELECT DISTINCT t.team_id, t.assignee_id
            FROM tasks t
            LEFT JOIN team_members tm ON t.team_id = tm.team_id AND t.assignee_id = tm.user_id
            JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id IS NOT NULL AND tm.user_id IS NULL AND u.role = 'Member'
        `);
        for (const row of orphans.rows) {
            await client.query(
                'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [row.team_id, row.assignee_id, 'Member']
            );
            console.log(`Linked user ${row.assignee_id} to team ${row.team_id}.`);
        }

        console.log('--- JEEVAN DATA FIX COMPLETE ---');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.end();
    }
}

fixJeevanData();
