import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function fixJeevanData() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- START JEEVAN DATA FIX V2 ---');

        const primaryEmail = 'konduru.jeevan@sprintboard.com';
        
        // 1. Get User ID
        const userRes = await client.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [primaryEmail]);
        if (userRes.rows.length === 0) {
            console.error('User not found!');
            return;
        }
        const userId = userRes.rows[0].id;

        // 2. Get Team ID
        const teamRes = await client.query("SELECT id FROM teams WHERE name = 'SPOS'");
        if (teamRes.rows.length === 0) {
            console.error('Team SPOS not found!');
            return;
        }
        const teamId = teamRes.rows[0].id;

        // 3. Force Insert into team_members
        console.log(`Inserting mapping: User ${userId} -> Team ${teamId}`);
        const ins = await client.query(
            "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'Member') ON CONFLICT DO NOTHING",
            [teamId, userId]
        );
        console.log('Insert result:', ins.rowCount);

        // 4. Verify immediately
        const check = await client.query("SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2", [teamId, userId]);
        console.log('Verification count:', check.rows.length);

        console.log('--- DATA FIX V2 COMPLETE ---');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.end();
    }
}

fixJeevanData();
