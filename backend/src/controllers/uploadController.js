import axios from 'axios';
import FormData from 'form-data';
import db from '../config/db.js';
import dotenv from 'dotenv';
import { getZohoAccessToken, getWorkDriveBaseUrl } from '../utils/zohoAuth.js';
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

        const apiKey = await getZohoAccessToken();
        const folderId = process.env.ZOHO_WORKDRIVE_ATTACHMENTS_FOLDER_ID;

        if (!apiKey || !folderId) {
            console.error('Zoho Configuration Missing for Task Attachments');
            return res.status(500).json({ message: 'Zoho WorkDrive is not configured for file storage' });
        }

        // Prepare Zoho Upload
        const formData = new FormData();
        formData.append('content', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        // Parameters for Zoho - using the same name logic from Cloudinary for consistency
        const baseUrl = getWorkDriveBaseUrl();
        const uploadUrl = `${baseUrl}/upload?parent_id=${folderId}&override-name-exist=true`;

        console.log(`Relaying Task Attachment to Zoho: ${req.file.originalname}`);

        const response = await axios.post(uploadUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Zoho-oauthtoken ${apiKey}`,
            },
        });

        // Zoho WorkDrive v1 API typically returns a list of uploaded files
        // Extracting data from Zoho response
        const zohoData = response.data.data?.[0]?.attributes || {};
        const baseUrl = getWorkDriveBaseUrl();
        // Construct regional stream URL
        const streamBase = baseUrl.replace('/api/v1', '/api/v1/stream');
        const fileUrl = zohoData.permalink || response.data.permalink || `${streamBase}/${zohoData.resource_id}`;

        const newAttachment = await db.query(
            'INSERT INTO task_attachments (task_id, uploaded_by, file_name, file_url, public_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [taskId, userId, req.file.originalname, fileUrl, zohoData.resource_id || 'zoho-file']
        );

        res.status(201).json(newAttachment.rows[0]);
    } catch (error) {
        console.error('Zoho Task Upload Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: 'Failed to upload attachment to Zoho WorkDrive',
            error: error.response?.data || error.message
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
