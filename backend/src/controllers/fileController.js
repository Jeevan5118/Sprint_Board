import db from '../config/db.js';

/**
 * Serves task attachments from the database
 */
export const serveAttachment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { preview } = req.query;
        const { rows } = await db.query('SELECT file_name, file_data, mimetype FROM task_attachments WHERE id = $1', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        const file = rows[0];
        const isInline = preview === 'true';
        
        res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
        if (isInline) {
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Content-Security-Policy', "frame-ancestors *");
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
        }
        res.send(file.file_data);
    } catch (error) {
        next(error);
    }
};

/**
 * Serves user uploads (Reports/Work) from the database
 */
export const serveUpload = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { preview } = req.query;
        const { rows } = await db.query('SELECT file_name, file_data, mimetype FROM user_uploads WHERE id = $1', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const file = rows[0];
        const isInline = preview === 'true';

        res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
        if (isInline) {
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Content-Security-Policy', "frame-ancestors *");
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
        }
        res.send(file.file_data);
    } catch (error) {
        next(error);
    }
};
