import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const OLD_URL = process.env.OLD_DATABASE_URL;
const NEW_URL = process.env.NEW_DATABASE_URL;

if (!OLD_URL || !NEW_URL) {
    console.error('Error: Please set OLD_DATABASE_URL and NEW_DATABASE_URL in backend/.env');
    process.exit(1);
}

const tables = [
    'users',
    'teams',
    'projects',
    'sprints',
    'kanban_column_limits',
    'tasks',
    'team_members',
    'task_assignees',
    'task_time_logs',
    'comments',
    'task_attachments',
    'task_links',
    'report_audit_comments',
    'notifications',
    'user_uploads',
    'board_settings',
    'board_columns',
    'board_color_rules',
    'board_quick_filters',
    'board_transition_rules'
];

const tableExists = async (client, table) => {
    const { rows } = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [table]);
    return Boolean(rows[0]?.exists);
};

const isJsonField = (field) => field.dataTypeID === 114 || field.dataTypeID === 3802;

const ensureTargetSchema = async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    const schemaPath = path.join(process.cwd(), 'database.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`database.sql not found at ${schemaPath}`);
    }

    const baseSchemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(baseSchemaSql);

    await client.query(`
        ALTER TABLE teams
            ADD COLUMN IF NOT EXISTS is_power_hour BOOLEAN DEFAULT FALSE;

        ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS is_power_hour BOOLEAN DEFAULT FALSE;

        ALTER TABLE sprints
            ADD COLUMN IF NOT EXISTS is_power_hour BOOLEAN DEFAULT FALSE;

        ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS last_updated_by_id UUID REFERENCES users (id) ON DELETE SET NULL;

        ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS is_power_hour BOOLEAN DEFAULT FALSE;

        ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS pending_status VARCHAR(50) DEFAULT NULL;

        ALTER TABLE task_attachments
            ADD COLUMN IF NOT EXISTS file_data BYTEA;

        ALTER TABLE task_attachments
            ADD COLUMN IF NOT EXISTS mimetype VARCHAR(100);

        CREATE TABLE IF NOT EXISTS user_uploads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
            user_id UUID REFERENCES users (id) ON DELETE CASCADE,
            team_id UUID REFERENCES teams (id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_data BYTEA NOT NULL,
            file_type VARCHAR(50),
            mimetype VARCHAR(100),
            metadata JSONB,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS task_assignees (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
            task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(task_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS report_audit_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
            target_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            audit_date DATE NOT NULL,
            admin_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(target_user_id, audit_date)
        );
    `);
};

async function migrate() {
    console.log('Starting data mirroring (source -> target)...');
    console.log(`Source: ${OLD_URL.split('@')[1]}`);
    console.log(`Target: ${NEW_URL.split('@')[1]}`);

    const source = new Client({ connectionString: OLD_URL, ssl: { rejectUnauthorized: false } });
    const target = new Client({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false } });

    try {
        await source.connect();
        await target.connect();
        console.log('Connected to both databases.');

        console.log('Ensuring target schema is ready...');
        await ensureTargetSchema(target);

        console.log('Running preflight checks...');
        for (const table of tables) {
            const sourceOk = await tableExists(source, table);
            const targetOk = await tableExists(target, table);

            if (!sourceOk) {
                throw new Error(`Source table missing: ${table}`);
            }
            if (!targetOk) {
                throw new Error(`Target table missing: ${table}. Initialize target schema first.`);
            }
        }
        console.log('Preflight checks passed.');

        console.log('Preparing target database...');
        const truncateList = [...tables].reverse().join(', ');
        await target.query(`TRUNCATE TABLE ${truncateList} CASCADE`);

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);

            const { rows, fields } = await source.query(`SELECT * FROM ${table}`);
            if (rows.length === 0) {
                console.log(`Table ${table} is empty in source, mirrored as empty.`);
                continue;
            }

            const columns = fields.map((f) => `"${f.name}"`).join(', ');
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
            const insertQuery = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

            let migratedCount = 0;
            for (const row of rows) {
                const values = fields.map((f) => {
                    const value = row[f.name];
                    if (value == null) return value;
                    if (isJsonField(f)) return JSON.stringify(value);
                    return value;
                });
                await target.query(insertQuery, values);
                migratedCount++;
                if (migratedCount % 100 === 0) {
                    console.log(`  progress: ${migratedCount}/${rows.length}`);
                }
            }

            console.log(`Migrated ${migratedCount} rows for ${table}.`);
        }

        console.log('SUCCESS: Data migration complete.');
    } catch (err) {
        console.error('Migration failed:');
        console.error(err.message);
        process.exitCode = 1;
    } finally {
        await source.end();
        await target.end();
    }
}

migrate();
