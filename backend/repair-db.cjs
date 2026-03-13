const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    password: 'konduru2002',
    host: 'localhost',
    database: 'sprint_board',
    port: 5432
});

async function repair() {
    try {
        await client.connect();
        console.log('--- REPAIRING DATABASE ---');

        // 1. Ensure all Admins are members of all teams
        const admins = await client.query("SELECT id FROM users WHERE role = 'Admin'");
        const teams = await client.query("SELECT id FROM teams");

        for (const admin of admins.rows) {
            for (const team of teams.rows) {
                await client.query(
                    'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [team.id, admin.id]
                );
            }
        }
        console.log(`Ensured visibility for ${admins.rows.length} admins across ${teams.rows.length} teams.`);

     ## Phase 10: Accuracy & Synchronization Fixes 🎯 (Completed)
- [x] Refactor `adminController.js` for per-row transactions [x]
- [x] Enhance Drag-and-Drop destination resolution in Boards [x]
- [x] Implement `updateUser` in `AuthContext` and sync `Settings.jsx` [x]
- [x] Verify profile updates reflect immediately in UI [x]

## Phase 11: Reliability & Diagnostics 🛠️
- [ ] Fix "vanishing task" bug in `SprintBoard.jsx` (send `sprint_id`) [/]
- [ ] Implement detailed import error display in `AdminImport.jsx` [ ]
- [ ] Verify Kanban persistence [ ]
- [ ] Final account cleanup and user guidance [ ]
        // 2. Cleanup duplicate "QA Alpha Team" entries (keep only the newest one)
        const qaTeams = await client.query("SELECT id FROM teams WHERE name = 'QA Alpha Team' ORDER BY created_at DESC");
        if (qaTeams.rows.length > 1) {
            const idsToDelete = qaTeams.rows.slice(1).map(r => r.id);
            // Delete associated memberships and tasks first (cascade should ideally handle it, but being safe)
            for (const id of idsToDelete) {
                await client.query('DELETE FROM team_members WHERE team_id = $1', [id]);
                await client.query('DELETE FROM tasks WHERE team_id = $1', [id]);
                await client.query('DELETE FROM sprints WHERE team_id = $1', [id]);
                await client.query('DELETE FROM projects WHERE team_id = $1', [id]);
                await client.query('DELETE FROM teams WHERE id = $1', [id]);
            }
            console.log(`Cleaned up ${idsToDelete.length} duplicate teams.`);
        }

    } catch (err) {
        console.error('Repair failed:', err.message);
    } finally {
        await client.end();
        console.log('--- REPAIR COMPLETE ---');
    }
}

repair();
