import db from './src/config/db.js';
import bcrypt from 'bcryptjs';

const email = 'admin@sprintboard.com';
const newPassword = 'konduru2002';

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(newPassword, salt);

await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
console.log(`✅ Password reset for ${email}`);

// Verify
const { rows } = await db.query('SELECT password_hash FROM users WHERE email = $1', [email]);
const match = await bcrypt.compare(newPassword, rows[0].password_hash);
console.log(`Verification: password '${newPassword}' matches: ${match ? '✅ YES' : '❌ NO'}`);

await db.end();
