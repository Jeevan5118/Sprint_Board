import db from '../config/db.js';

export const getDashboardAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin';
        const isMember = req.user.role === 'Member';

        const { is_power_hour } = req.query;
        const isPowerHourBool = is_power_hour === 'true' || is_power_hour === true;

        // 1. Overall Metrics
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'Done') as completed,
                COUNT(*) FILTER (WHERE status != 'Done') as pending,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status = 'Done') as lead_time,
                COUNT(*) FILTER (WHERE status = 'Done' AND updated_at > NOW() - INTERVAL '7 days') as weekly_throughput
            FROM tasks t
            WHERE (is_power_hour = $1 OR (is_power_hour IS NULL AND $1 = false))
            ${isAdmin ? '' : 'AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)'}
            ${isMember ? 'AND t.assignee_id = $2' : ''}
        `;
        const statsParams = isAdmin ? [isPowerHourBool] : [isPowerHourBool, userId];
        const statsRes = await db.query(statsQuery, statsParams);
        const s = statsRes.rows[0];

        // 2. Team-wise Analytics
        const teamStatsQuery = `
            SELECT 
                t.id, t.name,
                (SELECT name FROM sprints WHERE team_id = t.id AND status = 'Active' AND (is_power_hour = $1 OR (is_power_hour IS NULL AND $1 = false)) LIMIT 1) AS active_sprint,
                COUNT(tk.id) as total_tasks,
                COUNT(tk.id) FILTER (WHERE tk.status = 'Done') as done_tasks,
                COUNT(tk.id) FILTER (WHERE tk.status != 'Done') as pending_tasks,
                AVG(EXTRACT(EPOCH FROM (tk.updated_at - tk.created_at)) / 86400) FILTER (WHERE tk.status = 'Done') as avg_lead_time,
                COUNT(tk.id) FILTER (WHERE tk.status = 'Done' AND tk.updated_at > NOW() - INTERVAL '7 days') as throughput
            FROM teams t
            LEFT JOIN tasks tk ON t.id = tk.team_id AND (tk.is_power_hour = $1 OR (tk.is_power_hour IS NULL AND $1 = false))
            ${isAdmin ? '' : 'JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = $2'}
            ${isMember ? 'AND tk.assignee_id = $2' : ''}
            GROUP BY t.id, t.name
            ORDER BY t.name
        `;
        const teamStatsParams = isAdmin ? [isPowerHourBool] : [isPowerHourBool, userId];
        const teamsRes = await db.query(teamStatsQuery, teamStatsParams);

        // 3. Alerts & Timeline
        const overdueRes = await db.query(
            `SELECT id, title, due_date, team_id FROM tasks WHERE due_date < NOW() AND status != 'Done' 
             AND (is_power_hour = $1 OR (is_power_hour IS NULL AND $1 = false))
             ${isAdmin ? '' : 'AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)'} 
             ${isMember ? 'AND assignee_id = $2' : ''} 
             ORDER BY due_date ASC LIMIT 5`,
            isAdmin ? [isPowerHourBool] : [isPowerHourBool, userId]
        );
        const upcomingRes = await db.query(
            `SELECT id, title, due_date, team_id FROM tasks WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days' AND status != 'Done' 
             AND (is_power_hour = $1 OR (is_power_hour IS NULL AND $1 = false))
             ${isAdmin ? '' : 'AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)'} 
             ${isMember ? 'AND assignee_id = $2' : ''} 
             ORDER BY due_date ASC LIMIT 5`,
            isAdmin ? [isPowerHourBool] : [isPowerHourBool, userId]
        );
        const activityRes = await db.query(
            `SELECT c.id, c.content, u.name as actor, c.created_at, t.title as task_title
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             JOIN tasks t ON c.task_id = t.id
             WHERE (t.is_power_hour = $1 OR (t.is_power_hour IS NULL AND $1 = false))
             ${isAdmin ? '' : 'AND t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)'}
             ${isMember ? 'AND t.assignee_id = $2' : ''}
             ORDER BY c.created_at DESC LIMIT 8`,
            isAdmin ? [isPowerHourBool] : [isPowerHourBool, userId]
        );
        console.log(`[VERIFIED_V2] Dashboard activity filtered for ${req.user.role} ${userId}`);

        res.json({
            analytics: {
                totalTasks: parseInt(s.total || 0),
                completed: parseInt(s.completed || 0),
                pending: parseInt(s.pending || 0),
                progress: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
                avgLeadTime: parseFloat(s.lead_time || 0).toFixed(1),
                throughput: parseInt(s.weekly_throughput || 0)
            },
            teams: teamsRes.rows.map(t => ({
                id: t.id,
                name: t.name,
                activeSprint: t.active_sprint || 'None',
                total: parseInt(t.total_tasks),
                done: parseInt(t.done_tasks),
                pending: parseInt(t.pending_tasks),
                leadTime: parseFloat(t.avg_lead_time || 0).toFixed(1),
                throughput: parseInt(t.throughput)
            })),
            alerts: [
                ...overdueRes.rows.map(t => ({ id: t.id, type: 'overdue', message: `"${t.title}" is overdue`, link: `/${isPowerHourBool ? 'power-hour-teams' : 'teams'}/${t.team_id}/sprint-board` })),
                ...upcomingRes.rows.map(t => ({ id: `up-${t.id}`, type: 'upcoming', message: `"${t.title}" due soon`, link: `/${isPowerHourBool ? 'power-hour-teams' : 'teams'}/${t.team_id}/sprint-board` }))
            ],
            timeline: activityRes.rows.map(e => ({
                id: e.id,
                text: `${e.actor} commented on "${e.task_title}": "${e.content?.substring(0, 40)}..."`,
                time: new Date(e.created_at).toLocaleDateString()
            }))
        });
    } catch (error) {
        next(error);
    }
};
