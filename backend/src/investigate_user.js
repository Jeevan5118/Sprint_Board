import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function investigateUser() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== INVESTIGATING: Konduru Jeevan ===');
        const userRes = await client.query("SELECT id, name, email, role FROM users WHERE name ILIKE '%Konduru%' OR name ILIKE '%Jeevan%'");
        console.table(userRes.rows);

        if (userRes.rows.length > 0) {
            for (const user of userRes.rows) {
                console.log(`\n--- Teams for ${user.name} (${user.id}) ---`);
                const teamsRes = await client.query(`
                    SELECT tm.team_id, t.name as team_name, tm.role 
                    FROM team_members tm
                    JOIN teams t ON tm.team_id = t.id
                    WHERE tm.user_id = $1
                `, [user.id]);
                console.table(teamsRes.rows);

                console.log(`\n--- Tasks assigned to ${user.name} ---`);
                const tasksRes = await client.query(`
                    SELECT t.id, t.title, t.team_id, tm.name as team_name, t.status
                    FROM tasks t
                    LEFT JOIN teams tm ON t.team_id = tm.id
                    WHERE t.assignee_id = $1
                `, [user.id]);
                console.table(tasksRes.rows);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

investigateUser();
