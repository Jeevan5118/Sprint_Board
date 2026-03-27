import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (connectionString) {
    const maskedUrl = connectionString.split('@')[1] || 'Hidden';
    console.log(`Database Target: ${maskedUrl}`);
}

const poolConfig = connectionString
    ? {
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10,
    }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sprint_board',
        ssl: false,
    };

let pool;
try {
    pool = new Pool(poolConfig);
} catch (err) {
    console.error('CRITICAL: Failed to initialize Postgres Pool:', err.message);
}

const schemaBootstrapSql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'is_power_hour'
    ) THEN
        ALTER TABLE projects ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sprints' AND column_name = 'is_power_hour'
    ) THEN
        ALTER TABLE sprints ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'is_power_hour'
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

export const ensureSchemaReady = pool
    ? pool.query(schemaBootstrapSql)
        .then(() => {
            console.log('Database compatibility bootstrap complete.');
        })
        .catch((err) => {
            console.error('Database compatibility bootstrap failed:', err.message);
            throw err;
        })
    : Promise.reject(new Error('Database pool not initialized'));

if (pool) {
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client:', err.message);
    });
}

export const query = (text, params) => {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }
    return pool.query(text, params).catch((err) => {
        console.error('[DB Query Error]:', err.message);
        throw err;
    });
};

export default pool;
