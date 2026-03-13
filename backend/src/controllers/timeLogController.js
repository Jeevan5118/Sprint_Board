import db from '../config/db.js';

export const addTimeLog = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;
        const { hours, description } = req.body;
        const userId = req.user.id;

        if (!hours || isNaN(hours)) return res.status(400).json({ message: 'Valid hours required' });

        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const newLog = await db.query(
            'INSERT INTO task_time_logs (task_id, user_id, hours, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [taskId, userId, hours, description]
        );

        res.status(201).json(newLog.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const getTimeLogs = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;

        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const { rows } = await db.query(
            `SELECT tl.*, u.name as user_name 
       FROM task_time_logs tl 
       JOIN users u ON tl.user_id = u.id 
       WHERE tl.task_id = $1 ORDER BY tl.logged_at DESC`,
            [taskId]
        );

        res.json(rows);
    } catch (error) {
        next(error);
    }
};
