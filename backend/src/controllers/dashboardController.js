import db from '../config/db.js';

export const getDashboardAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin';
        const isMember = req.user.role === 'Member';

        const isPowerHourBool = req.query.is_power_hour === 'true' || req.query.is_power_hour === true;
        const isWorkspaceWide = isPowerHourBool;

        // Build params: always [isPowerHourBool] for admin, [isPowerHourBool, userId] for others
        const baseParams = (isAdmin || isWorkspaceWide) ? [isPowerHourBool] : [isPowerHourBool, userId];
        const userFilter = (isAdmin || isWorkspaceWide) ? '' : 'AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)';
        const memberFilter = (isMember && !isWorkspaceWide) ? 'AND t.assignee_id = $2' : '';
        const teamMemberJoin = (isAdmin || isWorkspaceWide) ? '' : 'JOIN team_members tm ON t.id = tm.team_id WHERE tm.user_id = $2';
        const memberTaskFilter = (isMember && !isWorkspaceWide) ? 'AND tk.assignee_id = $2' : '';

        // 1. Overall Metrics
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE t.status = 'Done') as completed,
                COUNT(*) FILTER (WHERE t.status != 'Done') as pending,
                COUNT(*) FILTER (WHERE t.status = 'Review') as in_review,
                COUNT(*) FILTER (
                    WHERE t.due_date < NOW() 
                    AND t.status != 'Done'
                    AND (t.sprint_id IS NULL OR EXISTS (SELECT 1 FROM sprints s WHERE s.id = t.sprint_id AND s.status != 'Completed'))
                ) as overdue,
                COUNT(*) FILTER (
                    WHERE t.due_date < NOW() 
                    AND t.status != 'Done'
                    AND (t.sprint_id IS NULL OR EXISTS (SELECT 1 FROM sprints s WHERE s.id = t.sprint_id AND s.status != 'Completed'))
                ) as sla_breach,
                COUNT(*) FILTER (
                    WHERE t.status != 'Done'
                    AND t.due_date BETWEEN NOW() AND NOW() + INTERVAL '2 days'
                ) as at_risk,
                COUNT(*) FILTER (WHERE t.status = 'Done' AND t.updated_at > NOW() - INTERVAL '7 days') as done_last_7_days,
                COUNT(*) FILTER (WHERE t.status = 'Review' AND t.updated_at < NOW() - INTERVAL '48 hours') as review_backlog,
                AVG(EXTRACT(EPOCH FROM (NOW() - t.updated_at)) / 3600) FILTER (WHERE t.status = 'Review') as review_turnaround_hours
            FROM tasks t
            WHERE (t.is_power_hour = $1 OR (t.is_power_hour IS NULL AND $1 = false))
            ${userFilter}
            ${memberFilter}
        `;
        const statsRes = await db.query(statsQuery, baseParams);
        const s = statsRes.rows[0];

        // 2. Team-wise Analytics
        const teamStatsQuery = `
            SELECT 
                t.id, t.name,
                (SELECT name FROM sprints WHERE team_id = t.id AND status = 'Active' AND (is_power_hour = $1 OR (is_power_hour IS NULL AND $1 = false)) LIMIT 1) AS active_sprint,
                COUNT(tk.id) as total_tasks,
                COUNT(tk.id) FILTER (WHERE tk.status = 'Done') as done_tasks,
                COUNT(tk.id) FILTER (WHERE tk.status != 'Done') as pending_tasks,
                COUNT(tk.id) FILTER (WHERE tk.status = 'Review') as in_review_tasks,
                COUNT(tk.id) FILTER (
                    WHERE tk.due_date < NOW() 
                    AND tk.status != 'Done'
                    AND (tk.sprint_id IS NULL OR EXISTS (SELECT 1 FROM sprints s WHERE s.id = tk.sprint_id AND s.status != 'Completed'))
                ) as overdue_tasks,
                COUNT(tk.id) FILTER (WHERE tk.status = 'Done' AND tk.updated_at > NOW() - INTERVAL '7 days') as done_last_7_days
            FROM teams t
            LEFT JOIN tasks tk ON t.id = tk.team_id AND (tk.is_power_hour = $1 OR (tk.is_power_hour IS NULL AND $1 = false))
            ${teamMemberJoin}
            ${memberTaskFilter}
            GROUP BY t.id, t.name
            ORDER BY t.name
        `;
        const teamsRes = await db.query(teamStatsQuery, baseParams);

        // 3. Alerts & Timeline
        const overdueRes = await db.query(
            `SELECT t.id, t.title, t.due_date, t.team_id 
             FROM tasks t 
             WHERE t.due_date < NOW() AND t.status != 'Done' 
             AND (t.sprint_id IS NULL OR EXISTS (SELECT 1 FROM sprints s WHERE s.id = t.sprint_id AND s.status != 'Completed'))
             AND (t.is_power_hour = $1 OR (t.is_power_hour IS NULL AND $1 = false))
             ${userFilter} 
             ${isMember && !isWorkspaceWide ? 'AND t.assignee_id = $2' : ''} 
             ORDER BY t.due_date ASC LIMIT 5`,
            baseParams
        );
        const upcomingRes = await db.query(
            `SELECT t.id, t.title, t.due_date, t.team_id 
             FROM tasks t 
             WHERE t.due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days' AND t.status != 'Done' 
             AND (t.is_power_hour = $1 OR (t.is_power_hour IS NULL AND $1 = false))
             ${userFilter} 
             ${isMember && !isWorkspaceWide ? 'AND t.assignee_id = $2' : ''} 
             ORDER BY t.due_date ASC LIMIT 5`,
            baseParams
        );
        const activityRes = await db.query(
            `SELECT c.id, c.content, u.name as actor, c.created_at, t.title as task_title
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             JOIN tasks t ON c.task_id = t.id
             WHERE (t.is_power_hour = $1 OR (t.is_power_hour IS NULL AND $1 = false))
             ${isAdmin || isWorkspaceWide ? '' : 'AND t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)'}
             ${isMember && !isWorkspaceWide ? 'AND t.assignee_id = $2' : ''}
             ORDER BY c.created_at DESC LIMIT 8`,
            baseParams
        );

        res.json({
            analytics: {
                totalTasks: parseInt(s.total || 0),
                completed: parseInt(s.completed || 0),
                pending: parseInt(s.pending || 0),
                inReview: parseInt(s.in_review || 0),
                overdue: parseInt(s.overdue || 0),
                atRisk: parseInt(s.at_risk || 0),
                reviewBacklog: parseInt(s.review_backlog || 0),
                slaBreach: parseInt(s.sla_breach || 0),
                doneLast7Days: parseInt(s.done_last_7_days || 0),
                progress: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
                completionRate7d: s.total > 0 ? Math.round((parseInt(s.done_last_7_days || 0) / parseInt(s.total || 1)) * 100) : 0,
                reviewTurnaroundHours: parseFloat(s.review_turnaround_hours || 0).toFixed(1)
            },
            teams: teamsRes.rows.map(t => ({
                id: t.id,
                name: t.name,
                activeSprint: t.active_sprint || 'None',
                total: parseInt(t.total_tasks),
                done: parseInt(t.done_tasks),
                pending: parseInt(t.pending_tasks),
                inReview: parseInt(t.in_review_tasks || 0),
                overdue: parseInt(t.overdue_tasks || 0),
                completionRate7d: parseInt(t.total_tasks || 0) > 0
                    ? Math.round((parseInt(t.done_last_7_days || 0) / parseInt(t.total_tasks || 1)) * 100)
                    : 0
            })),
            alerts: [
                ...overdueRes.rows.map(t => ({ id: t.id, type: 'overdue', message: `"${t.title}" is overdue`, link: isPowerHourBool ? '/power-hour-projects' : `/teams/${t.team_id}/sprint-board` })),
                ...upcomingRes.rows.map(t => ({ id: `up-${t.id}`, type: 'upcoming', message: `"${t.title}" due soon`, link: isPowerHourBool ? '/power-hour-projects' : `/teams/${t.team_id}/sprint-board` }))
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
