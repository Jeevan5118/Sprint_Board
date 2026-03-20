import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function completeVisibilityFix() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- START COMPLETE VISIBILITY FIX ---');

        // 1. Normalize all existing user emails to lowercase
        console.log('Normalizing user emails...');
        await client.query('UPDATE users SET email = LOWER(email)');

        // 2. Identify the core user "Konduru Jeevan" and their intended team "SPOS"
        const jeevanRes = await client.query("SELECT id FROM users WHERE email = 'konduru.jeevan@sprintboard.com'");
        const sposRes = await client.query("SELECT id FROM teams WHERE name = 'SPOS'");

        if (jeevanRes.rows.length > 0 && sposRes.rows.length > 0) {
            const userId = jeevanRes.rows[0].id;
            const teamId = sposRes.rows[0].id;
            console.log(`Mapping Jeevan (${userId}) to SPOS (${teamId})`);
            await client.query(
                "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'Member') ON CONFLICT DO NOTHING",
                [teamId, userId]
            );
        }

        // 3. GLOBAL AUTO-MAPPING: For any task assigned to a user, ensure that user is a member of that team
        console.log('Performing global task-to-member mapping repair...');
        const repairRes = await client.query(`
            INSERT INTO team_members (team_id, user_id, role)
            SELECT DISTINCT t.team_id, t.assignee_id, 'Member'
            FROM tasks t
            LEFT JOIN team_members tm ON t.team_id = tm.team_id AND t.assignee_id = tm.user_id
            WHERE t.assignee_id IS NOT NULL AND tm.user_id IS NULL
            ON CONFLICT DO NOTHING
        `);
        console.log(`Auto-mapped ${repairRes.rowCount} users to their respective teams based on task assignments.`);

        // 4. Verification Check
        const finalCount = await client.query("SELECT COUNT(*) FROM team_members");
        console.log(`Final team_members count: ${finalCount.rows[0].count}`);

        console.log('--- COMPLETE VISIBILITY FIX CONCLUDED ---');
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await client.end();
    }
}

completeVisibilityFix();
