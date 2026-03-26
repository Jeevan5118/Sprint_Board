import db from '../config/db.js';

/**
 * Helper: detect correct mimetype and send binary data properly
 */
const sendFileResponse = (res, file, isInline) => {
    // Detect mimetype from filename if DB value is generic
    let mimetype = file.mimetype || 'application/octet-stream';
    const name = file.file_name.toLowerCase();
    if (name.endsWith('.pdf')) mimetype = 'application/pdf';
    else if (name.endsWith('.docx')) mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (name.endsWith('.doc')) mimetype = 'application/msword';
    else if (name.endsWith('.png')) mimetype = 'image/png';
    else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimetype = 'image/jpeg';

    // Ensure file_data is a proper Buffer (handles pg bytea hex strings)
    const data = Buffer.isBuffer(file.file_data)
        ? file.file_data
        : Buffer.from(file.file_data, 'binary');

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Length', data.length);

    if (isInline) {
        res.setHeader('Content-Disposition', 'inline');
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', "frame-ancestors *");
    } else {
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    }

    res.end(data);
};

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

        sendFileResponse(res, rows[0], preview === 'true');
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

        sendFileResponse(res, rows[0], preview === 'true');
    } catch (error) {
        next(error);
    }
};
