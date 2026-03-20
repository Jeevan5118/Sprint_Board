import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function mergeShadows() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- START SHADOW ACCOUNT MERGE ---');

        // 1. Find names with duplicates
        const res = await client.query(`
            SELECT name, COUNT(*) 
            FROM users 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        console.log(`Processing ${res.rows.length} duplicate sets.`);

        for (const row of res.rows) {
            const name = row.name;
            const users = await client.query("SELECT id, email, role FROM users WHERE name = $1 ORDER BY email DESC", [name]);
            
            // Preference: @sprintboard.com > others
            let primary = users.rows.find(u => u.email.endsWith('@sprintboard.com'));
            if (!primary) primary = users.rows[0];

            const others = users.rows.filter(u => u.id !== primary.id);

            console.log(`\nMerging for: ${name}`);
            console.log(`Primary: ${primary.email} (${primary.id})`);

            for (const dupe of others) {
                console.log(`  -> Consolidating ${dupe.email} (${dupe.id})...`);

                // Transfer tasks
                await client.query("UPDATE tasks SET assignee_id = $1 WHERE assignee_id = $2", [primary.id, dupe.id]);
                
                // Transfer memberships
                const dupeMems = await client.query("SELECT team_id, role FROM team_members WHERE user_id = $1", [dupe.id]);
                for (const mem of dupeMems.rows) {
                    await client.query(
                        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO NOTHING",
                        [mem.team_id, primary.id, mem.role]
                    );
                }
                await client.query("DELETE FROM team_members WHERE user_id = $1", [dupe.id]);

                // Transfer comments
                await client.query("UPDATE comments SET user_id = $1 WHERE user_id = $2", [primary.id, dupe.id]);

                // Transfer team ownership
                await client.query("UPDATE teams SET created_by = $1 WHERE created_by = $2", [primary.id, dupe.id]);

                // Delete the shadow user
                await client.query("DELETE FROM users WHERE id = $1", [dupe.id]);
            }
        }

        // 2. Proactive Membership Repair: Ensure anyone assigned to a task is mapped to that team
        console.log('\n--- FINAL MEMBERSHIP REPAIR SWEEP ---');
        const repairRes = await client.query(`
            INSERT INTO team_members (team_id, user_id, role)
            SELECT DISTINCT t.team_id, t.assignee_id, 'Member'
            FROM tasks t
            LEFT JOIN team_members tm ON t.team_id = tm.team_id AND t.assignee_id = tm.user_id
            JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id IS NOT NULL AND tm.user_id IS NULL
            ON CONFLICT DO NOTHING
        `);
        console.log(`Membership Repair: Resolved ${repairRes.rowCount} missing links.`);

        console.log('\n--- SHADOW MERGE COMPLETE ---');

    } catch (err) {
        console.error('Merge failed:', err);
    } finally {
        await client.end();
    }
}

mergeShadows();
