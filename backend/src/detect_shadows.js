import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function detectShadowAccounts() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- DETECTING SHADOW ACCOUNTS ---');

        // Find users with the same name
        const res = await client.query(`
            SELECT name, COUNT(*) 
            FROM users 
            GROUP BY name 
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
        `);

        console.log(`Found ${res.rows.length} names with multiple accounts.`);

        for (const row of res.rows) {
            console.log(`\nName: ${row.name} (${row.count} accounts)`);
            const users = await client.query("SELECT id, email, role, created_at FROM users WHERE name = $1 ORDER BY email DESC", [row.name]);
            console.table(users.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

detectShadowAccounts();
