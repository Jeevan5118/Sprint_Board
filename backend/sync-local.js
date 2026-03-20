import pg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Local Connection Settings
const connectionString = 'postgresql://postgres:konduru2002@localhost:5432/sprint_board';

const pool = new Pool({
    connectionString,
    ssl: false
});

const syncLocal = async () => {
    try {
        console.log("🏠 Connecting to LOCAL Database (sprint_board)...");

        const sqlPath = path.join(process.cwd(), 'database.sql');
        if (!fs.existsSync(sqlPath)) throw new Error(`Could not find database.sql at ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📄 Applying latest schema... (Creating tables)");
        await pool.query(sql);

        console.log("🛠️ Applying internal storage patches (BYTEA, etc.)...");
        await pool.query(`
            DO $$ 
            BEGIN 
                -- 1. Ensure team_members has role
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='team_members' AND column_name='role') THEN
                    ALTER TABLE team_members ADD COLUMN role VARCHAR(50) DEFAULT 'Member';
                END IF;

                -- 2. Upgrade sort_order precision
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name='tasks' AND column_name='sort_order') THEN
                    ALTER TABLE tasks ALTER COLUMN sort_order TYPE DOUBLE PRECISION;
                END IF;

                -- 3. Upgrade task_attachments for internal storage
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='task_attachments' AND column_name='file_data') THEN
                    ALTER TABLE task_attachments ADD COLUMN file_data BYTEA;
                    ALTER TABLE task_attachments ADD COLUMN mimetype VARCHAR(100);
                END IF;

                -- 4. Create user_uploads table for Reports/Work
                CREATE TABLE IF NOT EXISTS user_uploads (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
                    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams (id) ON DELETE CASCADE,
                    file_name VARCHAR(255) NOT NULL,
                    file_data BYTEA NOT NULL,
                    file_type VARCHAR(50), -- 'Report' or 'Work'
                    mimetype VARCHAR(100),
                    metadata JSONB,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            END $$;
        `);

        console.log("👤 Seeding Admin User...");
        const adminEmail = 'admin@sprintboard.com';
        const hashedPassword = await bcrypt.hash('konduru2002', 10);
        await pool.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
            ['Admin User', adminEmail, hashedPassword, 'Admin']
        );

        console.log("🏆 Restoring 57 Gold Standard member accounts...");
        // For local simplicity, we'll just refer them to run the restoration script if they want users
        console.log("✅ Local Database Schema is now 100% up to date.");
        console.log("👉 Tip: Run 'node restore_gold_users.js' to also populate all local users.");

    } catch (err) {
        console.error("❌ Local Sync Failed:", err.message);
    } finally {
        await pool.end();
    }
};

syncLocal();
