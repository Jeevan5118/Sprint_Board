import db from '../config/db.js';

export const addTaskLink = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;
        const { title, url } = req.body;

        if (!url) return res.status(400).json({ message: 'URL is required' });

        // Ensure task belongs to team (Enterprise scope check)
        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const { rows } = await db.query(
            'INSERT INTO task_links (task_id, title, url) VALUES ($1, $2, $3) RETURNING *',
            [taskId, title || url, url]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

export const getTaskLinks = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;

        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const { rows } = await db.query('SELECT * FROM task_links WHERE task_id = $1 ORDER BY created_at DESC', [taskId]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

export const deleteTaskLink = async (req, res, next) => {
    try {
        const { id: taskId, teamId, linkId } = req.params;

        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const result = await db.query('DELETE FROM task_links WHERE id = $1 AND task_id = $2', [linkId, taskId]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Link not found' });

        res.json({ message: 'Link deleted' });
    } catch (error) {
        next(error);
    }
};
