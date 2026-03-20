import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function consolidateUsers() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- START USER CONSOLIDATION ---');

        // 1. Find all duplicate emails
        const dupeRes = await client.query(`
            SELECT LOWER(email) as email, COUNT(*) 
            FROM users 
            GROUP BY LOWER(email) 
            HAVING COUNT(*) > 1
        `);

        console.log(`Found ${dupeRes.rows.length} emails with duplicates.`);

        for (const row of dupeRes.rows) {
            const email = row.email;
            console.log(`\nProcessing duplicates for: ${email}`);

            const users = await client.query("SELECT id, email, role FROM users WHERE LOWER(email) = $1 ORDER BY created_at ASC", [email]);
            const primary = users.rows[0];
            const others = users.rows.slice(1);

            console.log(`Primary ID: ${primary.id} (Role: ${primary.role})`);

            for (const dupe of others) {
                console.log(`Merging ${dupe.id} into ${primary.id}...`);

                // Transfer tasks
                await client.query("UPDATE tasks SET assignee_id = $1 WHERE assignee_id = $2", [primary.id, dupe.id]);
                
                // Transfer memberships (handling potential conflicts)
                const dupeMems = await client.query("SELECT team_id, role FROM team_members WHERE user_id = $1", [dupe.id]);
                for (const mem of dupeMems.rows) {
                    await client.query(
                        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                        [mem.team_id, primary.id, mem.role]
                    );
                }
                await client.query("DELETE FROM team_members WHERE user_id = $1", [dupe.id]);

                // Transfer comments
                await client.query("UPDATE comments SET user_id = $1 WHERE user_id = $2", [primary.id, dupe.id]);

                // Transfer team ownership
                await client.query("UPDATE teams SET created_by = $1 WHERE created_by = $2", [primary.id, dupe.id]);

                // Finally delete the duplicate user
                await client.query("DELETE FROM users WHERE id = $1", [dupe.id]);
                console.log(`Deleted duplicate: ${dupe.id}`);
            }
        }

        // 2. Global Mapping Repair: Ensure everyone assigned to a task is mapped to that team
        console.log('\n--- PERFORMING GLOBAL MEMBERSHIP REPAIR ---');
        const repairRes = await client.query(`
            INSERT INTO team_members (team_id, user_id, role)
            SELECT DISTINCT t.team_id, t.assignee_id, 'Member'
            FROM tasks t
            LEFT JOIN team_members tm ON t.team_id = tm.team_id AND t.assignee_id = tm.user_id
            JOIN users u ON t.assignee_id = u.id
            WHERE t.assignee_id IS NOT NULL AND tm.user_id IS NULL
            ON CONFLICT DO NOTHING
            RETURNING *
        `);
        console.log(`Linkage Repair: Added ${repairRes.rowCount} missing memberships.`);

        // 3. Final Lowercase check
        await client.query("UPDATE users SET email = LOWER(email)");

        console.log('\n--- CONSOLIDATION COMPLETE ---');

    } catch (err) {
        console.error('Consolidation failed:', err);
    } finally {
        await client.end();
    }
}

consolidateUsers();
