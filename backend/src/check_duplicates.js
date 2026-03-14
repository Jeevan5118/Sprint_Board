import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function checkDuplicates() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== DUPLICATE EMAILS check ===');
        const res = await client.query(`
            SELECT LOWER(email) as lower_email, COUNT(*) 
            FROM users 
            GROUP BY lower_email 
            HAVING COUNT(*) > 1
        `);
        console.table(res.rows);

        if (res.rows.length > 0) {
            console.log('\n=== USERS WITH DUPLICATE EMAILS ===');
            for (const row of res.rows) {
                const users = await client.query('SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER($1)', [row.lower_email]);
                console.table(users.rows);
            }
        } else {
            console.log('No duplicates found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkDuplicates();
