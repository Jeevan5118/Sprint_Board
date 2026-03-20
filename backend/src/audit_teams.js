import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function checkTeams() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== TEAMS LIST ===');
        const teams = await client.query(`SELECT id, name FROM teams`);
        console.table(teams.rows);

        if (teams.rows.length > 0) {
            for (const team of teams.rows) {
                console.log(`\n--- Members of ${team.name} ---`);
                const mems = await client.query(`
                    SELECT u.name, u.email, u.role, tm.role as membership_role
                    FROM team_members tm
                    JOIN users u ON tm.user_id = u.id
                    WHERE tm.team_id = $1
                `, [team.id]);
                console.table(mems.rows);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkTeams();
