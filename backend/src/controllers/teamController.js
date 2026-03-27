import db from '../config/db.js';
import { notifyAdmins, notifyAdminsAndLeads, notifyUsers, createNotification } from '../services/notificationService.js';

export const getTeams = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'Admin';

        const isPowerHour = req.query.is_power_hour === 'true' || req.query.is_power_hour === true;

        let query = `
            SELECT t.*,
                COUNT(DISTINCT tm.user_id) AS members_count,
                (SELECT u.name FROM users u JOIN team_members tm2 ON u.id = tm2.user_id
                 WHERE tm2.team_id = t.id AND u.role = 'Team Lead' LIMIT 1) AS lead_name,
                (SELECT s.name FROM sprints s WHERE s.team_id = t.id AND s.status = 'Active' AND (s.is_power_hour = $1 OR (s.is_power_hour IS NULL AND $1 = false)) LIMIT 1) AS active_sprint
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
        `;
        let params = [isPowerHour];

        if (!isAdmin) {
            query += ' WHERE t.id IN (SELECT team_id FROM team_members WHERE user_id = $2)';
            params.push(userId);
        }

        query += ' GROUP BY t.id ORDER BY t.name';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

export const createTeam = async (req, res, next) => {
    try {
        const { name, description, members } = req.body;
        if (!name) return res.status(400).json({ message: 'Team name is required' });

        await db.query('BEGIN');
        const newTeam = await db.query(
            'INSERT INTO teams (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name, description, req.user.id]
        );
        const teamId = newTeam.rows[0].id;

        // Add creator to team members (avoid duplicates)
        const allMembers = new Set([req.user.id]);
        if (Array.isArray(members)) {
            members.forEach(id => allMembers.add(id));
        }

        for (const userId of allMembers) {
            await db.query(
                'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [teamId, userId]
            );
        }

        await db.query('COMMIT');

        // Notify Admins about new team
        await notifyAdmins('System', `New team "${name}" has been created.`, `/teams/${teamId}`);

        res.status(201).json(newTeam.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        next(error);
    }
};
export const getTeamById = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { rows } = await db.query('SELECT * FROM teams WHERE id = $1', [teamId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Team not found' });
        res.json(rows[0]);
    } catch (error) { next(error); }
};

export const getTeamMembers = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { rows } = await db.query(`
            SELECT u.id, u.name, u.email, u.role, u.avatar_url, tm.joined_at
            FROM users u
            JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = $1
            ORDER BY u.name
        `, [teamId]);
        res.json(rows);
    } catch (error) { next(error); }
};

export const addTeamMember = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ message: 'user_id is required' });
        await db.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [teamId, user_id]
        );

        const { rows: teamRows } = await db.query('SELECT name FROM teams WHERE id = $1', [teamId]);
        const teamName = teamRows[0]?.name || 'the team';
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [user_id]);
        const memberName = userRows[0]?.name || 'A user';
        const { rows: actorRows } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const actor = actorRows[0]?.name || 'a user';

        await notifyUsers([user_id], 'TeamMemberAdded', `You were added to ${teamName}.`, `/teams/${teamId}`);
        await notifyAdminsAndLeads(
            teamId,
            'TeamMemberAdded',
            `${memberName} was added to ${teamName} by ${actor}.`,
            `/teams/${teamId}`,
            { excludeUserId: req.user.id }
        );

        res.status(201).json({ message: 'Member added' });
    } catch (error) { next(error); }
};

export const removeTeamMember = async (req, res, next) => {
    try {
        const { teamId, userId } = req.params;
        const { rows: teamRows } = await db.query('SELECT name FROM teams WHERE id = $1', [teamId]);
        const teamName = teamRows[0]?.name || 'the team';
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        const memberName = userRows[0]?.name || 'A user';
        const { rows: actorRows } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const actor = actorRows[0]?.name || 'a user';

        await db.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
        await notifyUsers([userId], 'TeamMemberRemoved', `You were removed from ${teamName}.`, '/teams');
        await notifyAdminsAndLeads(
            teamId,
            'TeamMemberRemoved',
            `${memberName} was removed from ${teamName} by ${actor}.`,
            `/teams/${teamId}`,
            { excludeUserId: req.user.id }
        );

        res.json({ message: 'Member removed' });
    } catch (error) { next(error); }
};

export const promoteToLead = async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Demote any existing Team Lead in this team first
        const { teamId } = req.params;
        const members = await db.query(
            'SELECT u.id FROM users u JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = $1 AND u.role = $2',
            [teamId, 'Team Lead']
        );
        for (const m of members.rows) {
            await db.query("UPDATE users SET role = 'Member' WHERE id = $1", [m.id]);
        }
        await db.query("UPDATE users SET role = 'Team Lead' WHERE id = $1", [userId]);

        // Notify Admins and User
        const { rows: userRows } = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        const { rows: teamRows } = await db.query('SELECT name FROM teams WHERE id = $1', [teamId]);
        if (userRows.length > 0 && teamRows.length > 0) {
            await notifyAdmins('System', `${userRows[0].name} was promoted to Team Lead for ${teamRows[0].name}.`, `/teams/${teamId}`);
            await createNotification(userId, 'System', `You have been promoted to Team Lead for ${teamRows[0].name}.`, `/teams/${teamId}`);
            await notifyAdminsAndLeads(
                teamId,
                'TeamLeadUpdated',
                `${userRows[0].name} is now Team Lead for ${teamRows[0].name}.`,
                `/teams/${teamId}`,
                { excludeUserId: req.user.id }
            );
        }

        res.json({ message: 'User promoted to Team Lead' });
    } catch (error) { next(error); }
};

export const updateUserProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.id;
        const isMember = req.user.role === 'Member';

        // Security restriction: Members cannot change their name or email
        if (isMember) {
            // Check if they are actually trying to change anything restricted
            const { rows: currentUser } = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
            if (currentUser[0].name !== name || currentUser[0].email !== email) {
                return res.status(403).json({
                    message: 'Security Policy: Registered members cannot change their official name or email. Please contact Admin for identity updates.'
                });
            }
        }

        const { rows } = await db.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, avatar_url',
            [name, email, userId]
        );
        res.json(rows[0]);
    } catch (error) { next(error); }
};

export const getAllUsers = async (req, res, next) => {
    try {
        const { rows } = await db.query('SELECT id, name, email, role, avatar_url FROM users ORDER BY name');
        res.json(rows);
    } catch (error) { next(error); }
};

export const deleteTeam = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { rows: actorRows } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const { rows } = await db.query('DELETE FROM teams WHERE id = $1 RETURNING *', [teamId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Team not found' });
        await notifyAdmins(
            'TeamDeleted',
            `Team "${rows[0].name}" was deleted by ${actorRows[0]?.name || 'a user'}.`,
            '/teams',
            { excludeUserId: req.user.id }
        );
        res.json({ message: 'Team deleted successfully', team: rows[0] });
    } catch (error) {
        console.error('Delete Team Error:', error);
        next(error);
    }
};
