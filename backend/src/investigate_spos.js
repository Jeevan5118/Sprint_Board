import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function investigateSpos() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== INVESTIGATING TEAM: SPOS ===');
        const spos = await client.query("SELECT id FROM teams WHERE name = 'SPOS'");
        if (spos.rows.length === 0) { console.log('Team Not Found'); return; }
        const teamId = spos.rows[0].id;
        console.log('SPOS ID:', teamId);

        const mems = await client.query("SELECT user_id FROM team_members WHERE team_id = $1", [teamId]);
        console.log(`Found ${mems.rows.length} membership IDs in SPOS.`);
        console.table(mems.rows);

        console.log('\n=== CHECKING IF JEEVAN IS IN THOSE IDs ===');
        const jeevan = await client.query("SELECT id FROM users WHERE email = 'konduru.jeevan@sprintboard.com'");
        if (jeevan.rows.length > 0) {
            const jeevanId = jeevan.rows[0].id;
            console.log('Jeevan User ID:', jeevanId);
            const found = mems.rows.some(m => m.user_id === jeevanId);
            console.log('Is Jeevan ID in SPOS list (exact string match)?', found);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

investigateSpos();
