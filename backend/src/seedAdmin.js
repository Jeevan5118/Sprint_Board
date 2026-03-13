import bcrypt from 'bcryptjs';
import db from './config/db.js';

async function seedAdmin() {
    try {
        const name = 'Admin User';
        const email = 'admin@sprintboard.com';
        const passwordPlain = 'konduru2002';
        const role = 'Admin';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordPlain, salt);

        const checkAdmin = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (checkAdmin.rows.length === 0) {
            await db.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                [name, email, passwordHash, role]
            );
            console.log(`Admin user created! Email: ${email}, Password: ${passwordPlain}`);
        } else {
            console.log(`Admin user already exists. Email: ${email}, Password should be what you set it to. I will update it to admin123 just in case.`);
            await db.query(
                'UPDATE users SET password_hash = $1, role = $2 WHERE email = $3',
                [passwordHash, role, email]
            );
            console.log(`Admin user updated! Email: ${email}, Password: ${passwordPlain}`);
        }
    } catch (err) {
        console.error('Error seeding admin', err);
    } finally {
        process.exit(0);
    }
}

seedAdmin();
