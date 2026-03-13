import db from './src/config/db.js';
import bcrypt from 'bcryptjs';

const email = 'admin@sprintboard.com';
const password = 'konduru2002';

const { rows } = await db.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', [email]);

if (rows.length === 0) {
    console.log('❌ Admin user NOT found in DB.');
    console.log('Creating admin user now...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const result = await db.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'Admin') RETURNING id, name, email, role",
        ['Admin', email, hash]
    );
    console.log('✅ Admin user created:', result.rows[0]);
} else {
    const user = rows[0];
    console.log('Admin user found:', { id: user.id, name: user.name, email: user.email, role: user.role });
    const match = await bcrypt.compare(password, user.password_hash);
    console.log(`Password '${password}' matches: ${match ? '✅ YES' : '❌ NO'}`);
}

await db.end();
