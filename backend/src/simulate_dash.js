import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function simulateDashboard() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        
        const jeevanId = '04ad136e-aa88-4436-9328-1e948393535c';
        console.log(`\n=== SIMULATING DASHBOARD FOR USER: ${jeevanId} (Konduru Jeevan) ===`);

        // 1. Stats Query
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'Done') as completed
            FROM tasks t
            WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
        `;
        const statsRes = await client.query(statsQuery, [jeevanId]);
        console.log('Overall Stats:', statsRes.rows[0]);

        // 2. Teams Query
        const teamStatsQuery = `
            SELECT 
                t.id, t.name,
                COUNT(tk.id) as total_tasks
            FROM teams t
            LEFT JOIN tasks tk ON t.id = tk.team_id
            JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = $1
            GROUP BY t.id, t.name
        `;
        const teamsRes = await client.query(teamStatsQuery, [jeevanId]);
        console.log('\nTeams Overview:');
        console.table(teamsRes.rows);

        // 3. Raw Membership Check
        const rawMem = await client.query("SELECT * FROM team_members WHERE user_id = $1", [jeevanId]);
        console.log('\nRaw Memberships:', rawMem.rows.length);
        console.table(rawMem.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

simulateDashboard();
