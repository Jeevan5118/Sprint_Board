import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use your Railway URL from .env
const connectionString = process.env.postgresql://postgres:zRUvAMkJhtjWBKmXVTeWCKigTNPxAPic@shortline.proxy.rlwy.net:42052/railway;

if (!connectionString || connectionString.trim() === '' || connectionString.includes('localhost')) {
    console.error("❌ Error: Please paste your Railway DATABASE_URL in the backend/.env file first!");
    process.exit(1);
}

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
        // Execute the entire SQL script
        await pool.query(sql);
        console.log("✅ Tables created.");

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
