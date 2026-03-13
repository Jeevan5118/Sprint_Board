import db from '../config/db.js';
import { createNotification } from '../services/notificationService.js';

export const addComment = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) return res.status(400).json({ message: 'Content is required' });

        // Ensure task belongs to the team
        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const newComment = await db.query(
            'INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [taskId, userId, content]
        );

        // Fetch task assignee
        const taskRes = await db.query('SELECT title, assignee_id FROM tasks WHERE id = $1', [taskId]);
        if (taskRes.rows.length > 0) {
            const { title, assignee_id } = taskRes.rows[0];
            if (assignee_id && assignee_id !== userId) {
                await createNotification(
                    assignee_id,
                    'CommentAdded',
                    `New comment on task: ${title}`,
                    `/teams/${teamId}/sprints`
                );
            }
        }

        res.status(201).json(newComment.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const getComments = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;

        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const { rows } = await db.query(
            `SELECT c.*, u.name as user_name, u.avatar_url 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.task_id = $1 ORDER BY c.created_at ASC`,
            [taskId]
        );

        res.json(rows);
    } catch (error) {
        next(error);
    }
};
