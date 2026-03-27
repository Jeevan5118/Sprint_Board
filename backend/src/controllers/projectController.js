import db from '../config/db.js';
import { notifyAdminsAndLeads } from '../services/notificationService.js';

export const getAllProjects = async (req, res, next) => {
    try {
        const isMember = req.user.role === 'Member';
        const isAdmin = req.user.role === 'Admin';

        let query = `
            SELECT p.*, t.name AS team_name,
                COUNT(DISTINCT tk.id) AS tasks_count,
                COUNT(DISTINCT CASE WHEN tk.status = 'Done' THEN tk.id END) AS completed_count
            FROM projects p
            JOIN teams t ON p.team_id = t.id
            LEFT JOIN tasks tk ON 
                (tk.project_id = p.id 
                ${isMember ? 'AND tk.assignee_id = $1' : ''})
        `;
        let params = [];
        const isPowerHourBool = req.query.is_power_hour === 'true' || req.query.is_power_hour === true;

        if (!isAdmin) {
            params.push(req.user.id, isPowerHourBool);
            query += ` WHERE p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)`;
            query += ` AND (p.is_power_hour = $2 OR (p.is_power_hour IS NULL AND $2 = false))`;
        } else {
            query += ` WHERE (p.is_power_hour = $1 OR (p.is_power_hour IS NULL AND $1 = false))`;
            params.push(isPowerHourBool);
        }

        query += ' GROUP BY p.id, t.name ORDER BY t.name, p.name';
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (error) { next(error); }
};

export const getProjectsByTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const isPowerHourBool = req.query.is_power_hour === 'true' || req.query.is_power_hour === true;

        const { rows } = await db.query(
            `SELECT p.*, COUNT(tk.id) AS tasks_count FROM projects p
             LEFT JOIN tasks tk ON tk.project_id = p.id WHERE p.team_id = $1 AND (p.is_power_hour = $2 OR (p.is_power_hour IS NULL AND $2 = false)) GROUP BY p.id ORDER BY p.name`,
            [teamId, isPowerHourBool]
        );
        res.json(rows);
    } catch (error) { next(error); }
};

export const deleteProject = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;
        const { rows } = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Project not found' });

        const deletedProject = rows[0];
        const contextPath = deletedProject.is_power_hour ? 'power-hour-projects' : 'projects';
        const { rows: actorRows } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        await notifyAdminsAndLeads(
            teamId || deletedProject.team_id,
            'ProjectDeleted',
            `Project "${deletedProject.name}" was deleted by ${actorRows[0]?.name || 'a user'}.`,
            `/${contextPath}`,
            { excludeUserId: req.user.id }
        );

        res.json({ message: 'Project deleted' });
    } catch (error) { next(error); }
};


export const createProject = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { name, description, is_power_hour } = req.body;
        if (!name) return res.status(400).json({ message: 'Project name is required' });

        const isPowerHourBool = is_power_hour === true || is_power_hour === 'true';

        const { rows } = await db.query(
            'INSERT INTO projects (name, description, team_id, is_power_hour) VALUES ($1, $2, $3, $4) RETURNING *, (SELECT name FROM teams WHERE id = $3) AS team_name',
            [name, description, teamId, isPowerHourBool]
        );

        // Notify Admins & Leads
        const contextPath = isPowerHourBool ? 'power-hour-projects' : 'projects';
        await notifyAdminsAndLeads(
            teamId,
            'ProjectCreated',
            `New project "${name}" created for ${rows[0].team_name || 'your team'}.`,
            `/${contextPath}/${rows[0].id}`,
            { excludeUserId: req.user.id }
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};
export const getProjectById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(
            `SELECT p.*, t.name AS team_name 
             FROM projects p 
             JOIN teams t ON p.team_id = t.id 
             WHERE p.id = $1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Project not found' });
        res.json(rows[0]);
    } catch (error) { next(error); }
};
