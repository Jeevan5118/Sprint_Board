import db from '../config/db.js';
import { notifyAdmins, notifyTeam, notifyAdminsAndLeads } from '../services/notificationService.js';

export const getSprintsByTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const isPowerHour = req.query.is_power_hour === 'true';
        const { rows } = await db.query('SELECT * FROM sprints WHERE team_id = $1 AND is_power_hour = $2 ORDER BY created_at DESC', [teamId, isPowerHour]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

export const createSprint = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { name, start_date, end_date, is_power_hour } = req.body;
        if (!name) return res.status(400).json({ message: 'Sprint name is required' });

        const isPowerHourBool = is_power_hour === true || is_power_hour === 'true';

        const { rows } = await db.query(
            'INSERT INTO sprints (name, start_date, end_date, team_id, is_power_hour) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, start_date, end_date, teamId, isPowerHourBool]
        );

        // Notify Admins & Leads
        const contextPath = isPowerHourBool ? 'power-hour-teams' : 'teams';
        await notifyAdminsAndLeads(
            teamId,
            'SprintCreated',
            `New sprint "${name}" created for ${rows[0].team_name || 'your team'}.`,
            `/${contextPath}/${teamId}/sprints`,
            { excludeUserId: req.user.id }
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

export const startSprint = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;
        const isPowerHour = req.query.is_power_hour === 'true';

        // Cannot have two active sprints within the same scope
        const activeCheck = await db.query(
            "SELECT id FROM sprints WHERE team_id = $1 AND status = 'Active' AND is_power_hour = $2",
            [teamId, isPowerHour]
        );

        if (activeCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Team already has an active sprint' });
        }

        const { rows } = await db.query(
            "UPDATE sprints SET status = 'Active' WHERE id = $1 RETURNING *",
            [id]
        );

        // Notify Admins and Team
        const contextPath = isPowerHour ? 'power-hour-teams' : 'teams';
        await notifyAdmins('Sprints', `Sprint "${rows[0].name}" has been started.`, `/${contextPath}/${teamId}/sprints`, { excludeUserId: req.user.id });
        await notifyTeam(teamId, 'Sprints', `Sprint "${rows[0].name}" has started!`, `/${contextPath}/${teamId}/sprint-board`, { excludeUserId: req.user.id });

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

export const completeSprint = async (req, res, next) => {
    try {
        const { id } = req.params;

        const { rows } = await db.query(
            "UPDATE sprints SET status = 'Completed' WHERE id = $1 RETURNING *",
            [id]
        );

        // Notify Admins and Team
        const contextPath = rows[0].is_power_hour ? 'power-hour-teams' : 'teams';
        await notifyAdmins('Sprints', `Sprint "${rows[0].name}" has been completed.`, `/${contextPath}/${rows[0].team_id}/sprints`, { excludeUserId: req.user.id });
        await notifyTeam(rows[0].team_id, 'Sprints', `Sprint "${rows[0].name}" has been completed.`, `/${contextPath}/${rows[0].team_id}/sprints`, { excludeUserId: req.user.id });

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};
