import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const OLD_URL = process.env.OLD_DATABASE_URL;
const NEW_URL = process.env.NEW_DATABASE_URL;

if (!OLD_URL || !NEW_URL) {
    console.error("❌ Error: Please set OLD_DATABASE_URL and NEW_DATABASE_URL in backend/.env!");
    process.exit(1);
}

const tables = [
    'users',
    'teams',
    'team_members',
    'projects',
    'sprints',
    'kanban_column_limits',
    'tasks',
    'task_time_logs',
    'comments',
    'task_attachments',
    'task_links',
    'notifications',
    'user_uploads'
];

async function migrate() {
    console.log("🚀 Starting Data Mirroring (Railway -> Render)...");
    console.log(`📡 Source: ${OLD_URL.split('@')[1]} (Railway)`);
    console.log(`🎯 Target: ${NEW_URL.split('@')[1]} (Render)`);

    const source = new Client({ connectionString: OLD_URL, ssl: { rejectUnauthorized: false } });
    const target = new Client({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false } });

    try {
        await source.connect();
        await target.connect();
        console.log("✅ Connected to both databases.");

        // Clean target (optional but recommended for fresh migration)
        console.log("🧹 Preparing target database...");
        // Bypassing session_replication_role (not allowed on Render)
        // Relying on ordered table migration instead.

        for (const table of tables) {
            console.log(`📦 Migrating table: ${table}...`);

            // 1. Fetch all data from source
            const { rows, fields } = await source.query(`SELECT * FROM ${table}`);
            if (rows.length === 0) {
                console.log(`ℹ️ Table ${table} is empty, skipping.`);
                continue;
            }

            // 2. Clear target table (just in case)
            await target.query(`TRUNCATE TABLE ${table} CASCADE`);

            // 3. Prepare Insert Statement
            const columns = fields.map(f => `"${f.name}"`).join(', ');
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
            const insertQuery = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

            // 4. Batch Insert
            let migratedCount = 0;
            for (const row of rows) {
                const values = fields.map(f => row[f.name]);
                await target.query(insertQuery, values);
                migratedCount++;
            }
            console.log(`✅ Migrated ${migratedCount} rows for ${table}.`);
        }

        // await target.query('SET session_replication_role = "origin";'); // Bypassing for Render
        console.log("\n🎉 SUCCESS! Data Migration Complete.");
        console.log("🚀 Every task, comment, and file has been moved.");

    } catch (err) {
        console.error("\n❌ Migration Failed:");
        console.error(err.message);
    } finally {
        await source.end();
        await target.end();
    }
}

migrate();
