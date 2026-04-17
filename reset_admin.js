import pkg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const email = 'admin@sprintboard.com';
        const newPassword = 'Admin@123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        console.log(`Resetting password for ${email}...`);
        const res = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2) RETURNING *',
            [hash, email]
        );

        if (res.rowCount > 0) {
            console.log('Password reset successful.');
        } else {
            console.log('User not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
run();
