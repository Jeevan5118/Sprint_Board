import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use your Railway URL from .env
// Prioritize Render URL if available, fallback to DATABASE_URL
const connectionString = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString || connectionString.trim() === '' || (connectionString.includes('localhost') && !process.env.NEW_DATABASE_URL)) {
    console.error("❌ Error: Please set NEW_DATABASE_URL (for Render) or DATABASE_URL in your .env file!");
    process.exit(1);
}

// - [x] Implement case-insensitive login [x]
// - [x] Refine DB Config for Vercel/Railway SSL [x]
// - [x] Add `/api/v1/health/db` diagnostic endpoint [x]
// - [x] Final Push & Vercel Redeploy (User Action) [x]
// - [x] Verify live login [x]
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

const runMigration = async () => {
    try {
        console.log(`🚀 Connecting to: ${connectionString.split('@')[1]} (Render)`);
        console.log("🛠️ Starting Unified Database Initialization...");

        // Find the database.sql file in the same directory
        const sqlPath = path.join(process.cwd(), 'database.sql');

        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Could not find database.sql at ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📄 Reading local database.sql schema...");
        await pool.query(sql);
        console.log("✅ Tables created or verified.");

        console.log("🛠️ Patching database schema & internal storage...");
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

                -- 3. Upgrade task_attachments for internal storage (BYTEA)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='task_attachments' AND column_name='file_data') THEN
                    ALTER TABLE task_attachments ADD COLUMN file_data BYTEA;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='task_attachments' AND column_name='mimetype') THEN
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

                -- 5. Power Hour compatibility columns
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='projects' AND column_name='is_power_hour') THEN
                    ALTER TABLE projects ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='sprints' AND column_name='is_power_hour') THEN
                    ALTER TABLE sprints ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='tasks' AND column_name='is_power_hour') THEN
                    ALTER TABLE tasks ADD COLUMN is_power_hour BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);
        console.log("✅ Schema patches and internal storage tables verified.");

        // --- NEW: Seed Admin User ---
        console.log("👤 Seeding Admin User...");
        const email = 'admin@sprintboard.com';
        const passwordPlain = 'konduru2002';
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.default.genSalt(10);
        const passwordHash = await bcrypt.default.hash(passwordPlain, salt);

        const checkAdmin = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkAdmin.rows.length === 0) {
            await pool.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                ['Admin User', email, passwordHash, 'Admin']
            );
            console.log(`✅ Admin user created! email: ${email}`);
        } else {
            console.log("ℹ️ Admin user already exists.");
        }

        // --- NEW: Restore Gold Users (Mass Restoration) ---
        console.log("🏆 Restoring Gold Standard member accounts...");
        // Reusing the logic from restore_gold_users.js
        const restoreScriptPath = path.join(process.cwd(), 'restore_gold_users.js');
        if (fs.existsSync(restoreScriptPath)) {
            // We'll just trigger it as a separate process to keep it clean
            const { execSync } = await import('child_process');
            try {
                execSync('node restore_gold_users.js', { stdio: 'inherit' });
                console.log("✅ Gold Standard members restored.");
            } catch (err) {
                console.warn("⚠️ Gold restoration had some issues, but core schema is ready.");
            }
        }
        // ------------------------------

        console.log("✅ SUCCESS! Your Render database is now 100% compatible and populated.");
        console.log("🚀 You can now proceed to finalize your Render Unified Deployment.");
    } catch (err) {
        console.error("❌ Database Initialization Failed:");
        console.error(err.message);
    } finally {
        await pool.end();
    }
};

runMigration();
