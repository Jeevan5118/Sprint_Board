import db from './backend/src/config/db.js';
async function run() {
    try {
        console.log('Adding pending_status column...');
        await db.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pending_status VARCHAR(50) DEFAULT NULL`);
        console.log('Column added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error adding column:', err);
        process.exit(1);
    }
}
run();
