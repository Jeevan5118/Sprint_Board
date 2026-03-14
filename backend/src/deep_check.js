import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function deepCheck() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== USERS (Role: Member) ===');
        const users = await client.query("SELECT id, name, email, role FROM users WHERE role = 'Member'");
        console.table(users.rows);

        console.log('\n=== TEAM MEMBERSHIPS ===');
        const teamMembers = await client.query(`
            SELECT tm.team_id, t.name as team, tm.user_id, u.name as user, u.role
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            JOIN users u ON tm.user_id = u.id
            WHERE u.role = 'Member'
        `);
        console.table(teamMembers.rows);

        console.log('\n=== TASKS ASSIGNMENTS ===');
        const tasks = await client.query(`
            SELECT t.id, t.title, t.team_id, tm.name as team, t.assignee_id, u.name as assignee
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            WHERE u.role = 'Member' OR t.assignee_id IS NULL
        `);
        console.table(tasks.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

deepCheck();
