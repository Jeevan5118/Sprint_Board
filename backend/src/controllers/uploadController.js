import db from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

export const toggleAttachment = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        console.log(`Storing Task Attachment in Database: ${req.file.originalname}`);

        const newAttachment = await db.query(
            'INSERT INTO task_attachments (task_id, uploaded_by, file_name, file_data, mimetype, public_id, file_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, file_name, uploaded_at',
            [
                taskId, 
                userId, 
                req.file.originalname, 
                req.file.buffer, 
                req.file.mimetype, 
                'internal-db',
                '' // Placeholder for URL, constructed on the fly or fetched via route
            ]
        );

        const attachment = newAttachment.rows[0];
        // Construct the internal download URL
        attachment.file_url = `${process.env.BACKEND_URL || ''}/api/v1/files/attachments/${attachment.id}`;

        res.status(201).json(attachment);
    } catch (error) {
        console.error('Database Task Attachment Error:', error.message);
        res.status(500).json({
            message: 'Failed to upload attachment to internal storage',
            error: error.message
        });
    }
};

export const getAttachments = async (req, res, next) => {
    try {
        const { id: taskId, teamId } = req.params;
        const taskCheck = await db.query('SELECT id FROM tasks WHERE id = $1 AND team_id = $2', [taskId, teamId]);
        if (taskCheck.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        const { rows } = await db.query('SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY uploaded_at DESC', [taskId]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};
