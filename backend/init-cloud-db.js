import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use your Railway URL from .env
const connectionString = process.env.DATABASE_URL; // Corrected to use DATABASE_URL from .env

if (!connectionString || connectionString.trim() === '' || connectionString.includes('localhost')) {
    console.error("❌ Error: Please paste your Railway DATABASE_URL in the backend/.env file first!");
    process.exit(1);
}

// - [x] Implement case-insensitive login [x]
// - [x] Refine DB Config for Vercel/Railway SSL [x]
// - [x] Add `/api/v1/health/db` diagnostic endpoint [x]
// - [x] Final Push & Vercel Redeploy (User Action) [x]
// - [x] Verify live login [x]
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const runMigration = async () => {
    try {
        console.log("🚀 Connecting to Railway Cloud Database...");

        // Find the database.sql file in the same directory
        const sqlPath = path.join(process.cwd(), 'database.sql');

        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Could not find database.sql at ${sqlPath}`);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📄 Reading local database.sql schema...");
        await pool.query(sql);
        console.log("✅ Tables created or verified.");

        // --- NEW: Patch for missing role column ---
        console.log("🛠️ Patching database schema...");
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='team_members' AND column_name='role') THEN
                    ALTER TABLE team_members ADD COLUMN role VARCHAR(50) DEFAULT 'Member';
                END IF;
                -- Upgrade sort_order precision
                ALTER TABLE tasks ALTER COLUMN sort_order TYPE DOUBLE PRECISION;
            END $$;
        `);
        console.log("✅ Schema patch applied.");

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
            console.log(`✅ Admin user created! Email: ${email}, Password: ${passwordPlain}`);
        } else {
            console.log("ℹ️ Admin user already exists.");
        }
        // ------------------------------

        console.log("✅ SUCCESS! Your Railway database is fully initialized and seeded.");
        console.log("🚀 You can now proceed to deploy on Vercel.");
    } catch (err) {
        console.error("❌ Database Initialization Failed:");
        console.error(err.message);
    } finally {
        await pool.end();
    }
};

runMigration();
