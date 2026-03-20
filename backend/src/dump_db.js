import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function dumpMemberships() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== FULL TEAM_MEMBERS DUMP ===');
        const res = await client.query("SELECT * FROM team_members");
        console.table(res.rows);

        console.log('\n=== USERS DUMP (Limited) ===');
        const users = await client.query("SELECT id, name, email FROM users");
        console.table(users.rows);

        console.log('\n=== TEAMS DUMP ===');
        const teams = await client.query("SELECT id, name FROM teams");
        console.table(teams.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

dumpMemberships();
