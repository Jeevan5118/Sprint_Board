import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function checkSchema() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== SCHEMA INSPECTION ===');
        const schema = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'team_members', 'teams')
            ORDER BY table_name, ordinal_position
        `);
        console.table(schema.rows);

        console.log('\n=== RAW ID TYPE TEST ===');
        const rawId = await client.query("SELECT id::text as id_text, id FROM users LIMIT 1");
        console.log('User ID raw:', typeof rawId.rows[0].id, rawId.rows[0].id);
        console.log('User ID text:', typeof rawId.rows[0].id_text, rawId.rows[0].id_text);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchema();
