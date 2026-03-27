import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is required for schema bootstrap.');
    process.exit(1);
}

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
});

const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='projects' AND column_name='is_power_hour'
    ) THEN
        ALTER TABLE projects ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='sprints' AND column_name='is_power_hour'
    ) THEN
        ALTER TABLE sprints ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tasks' AND column_name='is_power_hour'
    ) THEN
        ALTER TABLE tasks ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
    END IF;

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
END $$;
`;

try {
    await pool.query(sql);
    console.log('Schema bootstrap complete.');
} catch (err) {
    console.error('Schema bootstrap failed:', err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
