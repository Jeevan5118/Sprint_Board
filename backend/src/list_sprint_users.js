import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function listSprintUsers() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const res = await client.query("SELECT id, name, email FROM users WHERE email LIKE '%@sprintboard.com' AND email != 'admin@sprintboard.com' ORDER BY name");
        console.log(`Found ${res.rows.length} sprintboard users.`);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listSprintUsers();
