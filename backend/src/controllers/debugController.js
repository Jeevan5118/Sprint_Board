import { query } from '../config/db.js';

export const reconcileData = async (req, res, next) => {
    try {
        console.log('--- Server-Side Data Reconciliation Start ---');
        
        // 1. Identify tasks where is_power_hour=true but parent project is is_power_hour=false
        const { rows: leakedInProjects } = await query(`
            SELECT t.id, t.title, t.is_power_hour, p.name as project_name, p.is_power_hour as project_ph
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.is_power_hour = true AND (p.is_power_hour = false OR p.is_power_hour IS NULL)
        `);

        // 2. Identify tasks where is_power_hour=true but parent sprint is is_power_hour=false
        const { rows: leakedInSprints } = await query(`
            SELECT t.id, t.title, t.is_power_hour, s.name as sprint_name, s.is_power_hour as sprint_ph
            FROM tasks t
            JOIN sprints s ON t.sprint_id = s.id
            WHERE t.is_power_hour = true AND (s.is_power_hour = false OR s.is_power_hour IS NULL)
        `);

        // 3. IDENTIFY TEAM LEAD MISMATCHES
        const { rows: missingLeads } = await query(`
            SELECT tm.user_id, tm.team_id, u.name, u.role as global_role, tm.role as member_role
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE u.role = 'Team Lead' AND tm.role = 'Member'
        `);

        let report = {
            projectLeaks: leakedInProjects.length,
            sprintLeaks: leakedInSprints.length,
            roleMismatches: missingLeads.length,
            status: 'Diagnostic Only'
        };

        if (req.query.fix === 'true') {
            if (leakedInProjects.length > 0) {
                await query('UPDATE tasks SET is_power_hour = false WHERE id = ANY($1)', [leakedInProjects.map(t => t.id)]);
            }
            if (leakedInSprints.length > 0) {
                await query('UPDATE tasks SET is_power_hour = false WHERE id = ANY($1)', [leakedInSprints.map(t => t.id)]);
            }
            if (missingLeads.length > 0) {
                for (const lead of missingLeads) {
                    await query("UPDATE team_members SET role = 'Team Lead' WHERE user_id = $1 AND team_id = $2", [lead.user_id, lead.team_id]);
                }
            }
            report.status = 'Fixed';
        }

        res.json({
            message: 'Reconciliation complete',
            results: report
        });
    } catch (error) {
        console.error('Reconciliation failed:', error);
        res.status(500).json({ error: error.message });
    }
};
