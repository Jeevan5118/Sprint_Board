import db from '../config/db.js';

export const getAllProjects = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin';

        let query = `
            SELECT p.*, t.name AS team_name,
                COUNT(DISTINCT tk.id) AS tasks_count,
                COUNT(DISTINCT CASE WHEN tk.status = 'Done' THEN tk.id END) AS completed_count
            FROM projects p
            JOIN teams t ON p.team_id = t.id
            LEFT JOIN tasks tk ON tk.project_id = p.id
        `;
        let params = [];

        if (!isAdmin) {
            query += ' WHERE p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)';
            params.push(userId);
        }

        query += ' GROUP BY p.id, t.name ORDER BY t.name, p.name';
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (error) { next(error); }
};

export const getProjectsByTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { rows } = await db.query(
            `SELECT p.*, COUNT(tk.id) AS tasks_count FROM projects p
             LEFT JOIN tasks tk ON tk.project_id = p.id WHERE p.team_id = $1 GROUP BY p.id ORDER BY p.name`,
            [teamId]
        );
        res.json(rows);
    } catch (error) { next(error); }
};

export const deleteProject = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ message: 'Project deleted' });
    } catch (error) { next(error); }
};


export const createProject = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ message: 'Project name is required' });

        const newProject = await db.query(
            'INSERT INTO projects (name, description, team_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, teamId]
        );

        res.status(201).json(newProject.rows[0]);
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
