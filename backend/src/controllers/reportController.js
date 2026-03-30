import db from '../config/db.js';
import { notifyAdmins, notifyTeamLeads } from '../services/notificationService.js';

const resolveUploadTeamId = async (requestedTeamId, userId, role) => {
    if (role === 'Admin') {
        return requestedTeamId || null;
    }

    if (requestedTeamId) {
        const memberCheck = await db.query(
            'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
            [requestedTeamId, userId]
        );
        if (memberCheck.rows.length > 0) return requestedTeamId;
    }

    const membership = await db.query(
        'SELECT team_id FROM team_members WHERE user_id = $1 ORDER BY joined_at ASC LIMIT 1',
        [userId]
    );

    return membership.rows[0]?.team_id || null;
};

export const submitReport = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No report file provided' });

        const userId = req.user.id;
        const { teamId, summary } = req.body;
        const resolvedTeamId = await resolveUploadTeamId(teamId, userId, req.user.role);
        const fileName = req.file.originalname;

        console.log(`Storing Structured Report in Database: ${fileName} for user ${userId}, team ${resolvedTeamId}`);

        const newUpload = await db.query(
            'INSERT INTO user_uploads (user_id, team_id, file_name, file_data, file_type, mimetype, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, file_name, uploaded_at',
            [userId, resolvedTeamId, fileName, req.file.buffer, 'Report', req.file.mimetype, JSON.stringify({ summary })]
        );

        // Notify Admins and Team Leads
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        const uName = userRows[0]?.name || 'A user';
        await notifyAdmins('Reports', `${uName} submitted their daily report.`, `/settings`, { excludeUserId: userId });
        if (resolvedTeamId) {
            await notifyTeamLeads(resolvedTeamId, 'Reports', `${uName} submitted their daily report.`, `/settings`, { excludeUserId: userId });
        }

        res.status(200).json({
            message: `Report uploaded successfully to internal storage`,
            data: newUpload.rows[0]
        });
    } catch (error) {
        console.error('Database Report Upload Error:', error.message);
        res.status(500).json({
            message: 'Failed to upload report to internal storage',
            error: error.message
        });
    }
};

export const uploadWork = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No work file provided' });

        const userId = req.user.id;
        const { teamId, description } = req.body;
        const resolvedTeamId = await resolveUploadTeamId(teamId, userId, req.user.role);
        const fileName = req.file.originalname;

        console.log(`Storing Structured Work in Database: ${fileName} for user ${userId}, team ${resolvedTeamId}`);

        const newUpload = await db.query(
            'INSERT INTO user_uploads (user_id, team_id, file_name, file_data, file_type, mimetype, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, file_name, uploaded_at',
            [userId, resolvedTeamId, fileName, req.file.buffer, 'Work', req.file.mimetype, JSON.stringify({ description })]
        );

        // Notify Admins and Team Leads
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        const uName = userRows[0]?.name || 'A user';
        await notifyAdmins('Reports', `${uName} submitted work.`, `/settings`, { excludeUserId: userId });
        if (resolvedTeamId) {
            await notifyTeamLeads(resolvedTeamId, 'Reports', `${uName} submitted work.`, `/settings`, { excludeUserId: userId });
        }

        res.status(200).json({
            message: `Work uploaded successfully to internal storage`,
            data: newUpload.rows[0]
        });
    } catch (error) {
        console.error('Database Work Upload Error:', error.message);
        res.status(500).json({
            message: 'Failed to upload work to internal storage',
            error: error.message
        });
    }
};

/**
 * Get structured list of uploads for the current user or a specific team
 */
export const getUploads = async (req, res, next) => {
    try {
        const { type, teamId, startDate, endDate } = req.query;
        let query = `
            SELECT u.id, u.file_name, u.file_type, u.mimetype, u.uploaded_at, u.metadata, 
                   usr.name as user_name, t.name as team_name
            FROM user_uploads u
            LEFT JOIN users usr ON u.user_id = usr.id
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE 1=1
        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'Admin') {
            // Admin can see everything, but can filter by team
            if (teamId) {
                params.push(teamId);
                query += ` AND u.team_id = $${params.length}`;
            }
        } else if (req.user.role === 'Team Lead') {
            // Team Lead sees uploads for teams they belong to + their own personal uploads
            if (teamId) {
                const membership = await db.query(
                    'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
                    [teamId, req.user.id]
                );
                if (membership.rows.length === 0) {
                    return res.status(403).json({ message: 'You are not allowed to view uploads for this team' });
                }
                params.push(teamId);
                query += ` AND u.team_id = $${params.length}`;
            } else {
                params.push(req.user.id);
                query += ` AND (u.user_id = $${params.length} OR u.team_id IN (SELECT team_id FROM team_members WHERE user_id = $${params.length}))`;
            }
        } else {
            // Member only sees their own
            params.push(req.user.id);
            query += ` AND u.user_id = $${params.length}`;
        }

        if (type) {
            params.push(type);
            query += ` AND u.file_type = $${params.length}`;
        }

        if (startDate) {
            params.push(startDate);
            query += ` AND u.uploaded_at >= $${params.length}`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND u.uploaded_at <= $${params.length}`;
        }

        query += ' ORDER BY u.uploaded_at DESC';

        const { rows } = await db.query(query, params);

        // Add internal URLs for convenience
        const uploads = rows.map(u => {
            const baseUrl = process.env.BACKEND_URL || '';
            const path = `/api/v1/files/uploads/${u.id}`;
            return {
                ...u,
                file_url: baseUrl.startsWith('http') ? `${baseUrl}${path}` : path
            };
        });

        res.json(uploads);
    } catch (error) {
        next(error);
    }
};

/**
 * Get audit of which users have/haven't submitted reports for a specific date
 */
export const getReportAudit = async (req, res, next) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        console.log(`Auditing report submissions for date: ${targetDate}`);

        const query = `
            SELECT 
                u.id, 
                u.name, 
                u.role, 
                u.email,
                t.name as team_name,
                EXISTS (
                    SELECT 1 
                    FROM user_uploads up 
                    WHERE up.user_id = u.id 
                    AND up.file_type = 'Report' 
                    AND up.uploaded_at::date = $1::date
                ) as has_submitted
            FROM users u
            LEFT JOIN team_members tm ON u.id = tm.user_id
            LEFT JOIN teams t ON tm.team_id = t.id
            WHERE u.role IN ('Member', 'Team Lead')
            ORDER BY u.name ASC
        `;

        const { rows } = await db.query(query, [targetDate]);
        res.json(rows);
    } catch (error) {
        console.error('Report Audit Error:', error.message);
        res.status(500).json({ message: 'Failed to generate report audit' });
    }
};
