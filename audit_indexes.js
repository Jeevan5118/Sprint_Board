import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- DATABASE INDEX AUDIT ---');
        const res = await pool.query(`
            SELECT
                t.relname AS table_name,
                i.relname AS index_name,
                a.attname AS column_name
            FROM
                pg_class t,
                pg_class i,
                pg_index ix,
                pg_attribute a
            WHERE
                t.oid = ix.indrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND t.relname IN ('tasks', 'task_assignees', 'sprints', 'teams')
            ORDER BY
                t.relname,
                i.relname;
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
run();
