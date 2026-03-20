import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function globalSanityCheck() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        console.log('\n=== GLOBAL SANITY CHECK ===');

        // 1. Total Raw Counts
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM teams) as total_teams,
                (SELECT COUNT(*) FROM team_members) as total_memberships,
                (SELECT COUNT(*) FROM tasks) as total_tasks,
                (SELECT COUNT(*) FROM sprints WHERE status = 'Active') as active_sprints
        `);
        console.table(counts.rows);

        // 2. Identify an Admin and a Member
        const sampleUsers = await client.query(`
            (SELECT id, name, role FROM users WHERE role = 'Admin' LIMIT 1)
            UNION ALL
            (SELECT id, name, role FROM users WHERE role = 'Member' LIMIT 1)
        `);
        const admin = sampleUsers.rows.find(u => u.role === 'Admin');
        const member = sampleUsers.rows.find(u => u.role === 'Member');

        if (admin) {
            console.log(`\n--- Admin Test: ${admin.name} (${admin.id}) ---`);
            const adminStats = await client.query(`
                SELECT COUNT(*) FROM tasks t
            `);
            console.log(`Admin Task Count (Total): ${adminStats.rows[0].count}`);
        }

        if (member) {
            console.log(`\n--- Member Test: ${member.name} (${member.id}) ---`);
            const memberStats = await client.query(`
                SELECT COUNT(*) FROM tasks t
                WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
            `, [member.id]);
            console.log(`Member Task Count (Team Scoped): ${memberStats.rows[0].count}`);

            const memberTeams = await client.query(`
                SELECT t.name FROM teams t
                JOIN team_members tm ON t.id = tm.team_id
                WHERE tm.user_id = $1
            `, [member.id]);
            console.log('Member Teams found:', memberTeams.rows.map(r => r.name).join(', '));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

globalSanityCheck();
