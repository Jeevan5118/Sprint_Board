import db from './backend/src/config/db.js';

async function auditIntegrity() {
    console.log('--- Database Isolation & Role Integrity Audit ---');
    try {
        // ... previous isolation audit logic ...
        const { rows: leakedInProjects } = await db.query(`
            SELECT t.id, t.title, t.is_power_hour, p.name as project_name, p.is_power_hour as project_ph
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.is_power_hour = true AND (p.is_power_hour = false OR p.is_power_hour IS NULL)
        `);

        const { rows: leakedInSprints } = await db.query(`
            SELECT t.id, t.title, t.is_power_hour, s.name as sprint_name, s.is_power_hour as sprint_ph
            FROM tasks t
            JOIN sprints s ON t.sprint_id = s.id
            WHERE t.is_power_hour = true AND (s.is_power_hour = false OR s.is_power_hour IS NULL)
        `);

        console.log(`Isolation: Found ${leakedInProjects.length} project-leaked tasks and ${leakedInSprints.length} sprint-leaked tasks.`);

        // 3. IDENTIFY TEAM LEAD MISMATCHES
        // Find users who are 'Team Lead' in users table but 'Member' in team_members table
        const { rows: missingLeads } = await db.query(`
            SELECT tm.user_id, tm.team_id, u.name, u.role as global_role, tm.role as member_role
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE u.role = 'Team Lead' AND tm.role = 'Member'
        `);

        console.log(`Roles: Found ${missingLeads.length} Team Lead role mismatches.`);

        if (leakedInProjects.length > 0 || leakedInSprints.length > 0 || missingLeads.length > 0) {
            console.log('\n--- CORRECTING RECORDS ---');
            
            if (leakedInProjects.length > 0) {
                await db.query('UPDATE tasks SET is_power_hour = false WHERE id = ANY($1)', [leakedInProjects.map(t => t.id)]);
                console.log(`Fixed ${leakedInProjects.length} isolation leaks via projects.`);
            }
            if (leakedInSprints.length > 0) {
                await db.query('UPDATE tasks SET is_power_hour = false WHERE id = ANY($1)', [leakedInSprints.map(t => t.id)]);
                console.log(`Fixed ${leakedInSprints.length} isolation leaks via sprints.`);
            }
            if (missingLeads.length > 0) {
                for (const lead of missingLeads) {
                    await db.query("UPDATE team_members SET role = 'Team Lead' WHERE user_id = $1 AND team_id = $2", [lead.user_id, lead.team_id]);
                }
                console.log(`Synchronized ${missingLeads.length} Team Lead roles.`);
            }
        } else {
            console.log('No integrity issues found!');
        }
    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        process.exit();
    }
}

auditIntegrity();
