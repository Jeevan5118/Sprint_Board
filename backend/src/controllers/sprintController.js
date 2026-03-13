import db from '../config/db.js';
import { createNotification } from '../services/notificationService.js';

export const getSprintsByTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { rows } = await db.query('SELECT * FROM sprints WHERE team_id = $1 ORDER BY created_at DESC', [teamId]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

export const createSprint = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { name, start_date, end_date } = req.body;
        if (!name) return res.status(400).json({ message: 'Sprint name is required' });

        const newSprint = await db.query(
            'INSERT INTO sprints (name, team_id, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, teamId, start_date, end_date]
        );

        res.status(201).json(newSprint.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const startSprint = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;

        // Cannot have two active sprints
        const activeCheck = await db.query(
            "SELECT id FROM sprints WHERE team_id = $1 AND status = 'Active'",
            [teamId]
        );

        if (activeCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Team already has an active sprint' });
        }

        const { rows } = await db.query(
            "UPDATE sprints SET status = 'Active' WHERE id = $1 RETURNING *",
            [id]
        );

        // Notify all team members
        const teamMembers = await db.query('SELECT user_id FROM team_members WHERE team_id = $1', [teamId]);
        for (const member of teamMembers.rows) {
            await createNotification(member.user_id, 'SprintStarted', `Sprint "${rows[0].name}" has started!`, `/teams/${teamId}/sprint-board`);
        }

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

        // Notify all team members
        const teamMembers = await db.query('SELECT user_id FROM team_members WHERE team_id = $1', [rows[0].team_id]);
        for (const member of teamMembers.rows) {
            await createNotification(member.user_id, 'SprintCompleted', `Sprint "${rows[0].name}" has been completed.`, `/teams/${rows[0].team_id}/sprints`);
        }

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};
