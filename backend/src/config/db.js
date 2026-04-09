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

    CREATE INDEX IF NOT EXISTS idx_report_audit_comments_audit_date
        ON report_audit_comments (audit_date);

    CREATE TABLE IF NOT EXISTS board_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
        is_power_hour BOOLEAN NOT NULL DEFAULT FALSE,
        board_type VARCHAR(20) NOT NULL CHECK (board_type IN ('kanban', 'sprint')),
        swimlane_mode VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (swimlane_mode IN ('none', 'assignee', 'priority', 'type')),
        show_epic_panel BOOLEAN NOT NULL DEFAULT FALSE,
        show_card_fields JSONB NOT NULL DEFAULT '["assignee","story_points","due_date","project","type","priority"]'::jsonb,
        done_column_key VARCHAR(50) NOT NULL DEFAULT 'done',
        enable_quick_filters BOOLEAN NOT NULL DEFAULT TRUE,
        enable_color_customization BOOLEAN NOT NULL DEFAULT TRUE,
        enable_transition_rules BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(team_id, is_power_hour, board_type)
    );

    CREATE TABLE IF NOT EXISTS board_columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
        column_key VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        position INT NOT NULL,
        wip_limit INT,
        is_done_column BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_settings_id, column_key)
    );

    CREATE TABLE IF NOT EXISTS board_color_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
        dimension VARCHAR(20) NOT NULL CHECK (dimension IN ('status', 'type', 'priority')),
        dimension_value VARCHAR(100) NOT NULL,
        bg_color VARCHAR(20) NOT NULL,
        text_color VARCHAR(20) NOT NULL,
        border_color VARCHAR(20) NOT NULL,
        badge_color VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_settings_id, dimension, dimension_value)
    );

    CREATE TABLE IF NOT EXISTS board_quick_filters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        position INT NOT NULL DEFAULT 0,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS board_transition_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
        from_status VARCHAR(50) NOT NULL,
        to_status VARCHAR(50) NOT NULL,
        allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['Admin','Team Lead','Member']::TEXT[],
        required_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        blocked_if_dependencies_open BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_settings_id, from_status, to_status)
    );

    INSERT INTO task_assignees (task_id, user_id)
    SELECT id, assignee_id
    FROM tasks
    WHERE assignee_id IS NOT NULL
    ON CONFLICT (task_id, user_id) DO NOTHING;
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
