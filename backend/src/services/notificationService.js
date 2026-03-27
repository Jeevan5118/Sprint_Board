import db from '../config/db.js';

/**
 * Creates a notification for a specific user
 * @param {string} userId - User UUID to receive the notification
 * @param {string} type - Notification category/type
 * @param {string} message - Notification text
 * @param {string} [linkUrl] - Optional URL to direct the user when clicked
 */
export const createNotification = async (userId, type, message, linkUrl = null) => {
    try {
        if (!userId || !type || !message) return;

        await db.query(
            'INSERT INTO notifications (user_id, type, message, link_url) VALUES ($1, $2, $3, $4)',
            [userId, type, message, linkUrl]
        );
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};

const createNotificationsBulk = async (userIds, type, message, linkUrl = null, options = {}) => {
    try {
        const { excludeUserId = null } = options;
        const deduped = [...new Set((userIds || []).filter(Boolean))].filter((id) => id !== excludeUserId);
        if (deduped.length === 0 || !type || !message) return;

        await Promise.all(deduped.map((id) => createNotification(id, type, message, linkUrl)));
    } catch (error) {
        console.error('Failed to create bulk notifications:', error);
    }
};

const getAdminIds = async () => {
    const { rows } = await db.query("SELECT id FROM users WHERE role = 'Admin'");
    return rows.map((r) => r.id);
};

const getTeamMemberIds = async (teamId) => {
    if (!teamId) return [];
    const { rows } = await db.query('SELECT user_id FROM team_members WHERE team_id = $1', [teamId]);
    return rows.map((r) => r.user_id);
};

const getTeamLeadIds = async (teamId) => {
    if (!teamId) return [];
    const { rows } = await db.query(
        "SELECT tm.user_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = $1 AND u.role = 'Team Lead'",
        [teamId]
    );
    return rows.map((r) => r.user_id);
};

/**
 * Broadcasts a notification to all Admin users
 */
export const notifyAdmins = async (type, message, linkUrl = null, options = {}) => {
    try {
        const adminIds = await getAdminIds();
        await createNotificationsBulk(adminIds, type, message, linkUrl, options);
    } catch (error) {
        console.error('Failed to notify admins:', error);
    }
};

/**
 * Broadcasts a notification to all members of a specific team
 */
export const notifyTeam = async (teamId, type, message, linkUrl = null, options = {}) => {
    try {
        const memberIds = await getTeamMemberIds(teamId);
        await createNotificationsBulk(memberIds, type, message, linkUrl, options);
    } catch (error) {
        console.error('Failed to notify team:', error);
    }
};

/**
 * Broadcasts a notification ONLY to Team Leads of a specific team
 */
export const notifyTeamLeads = async (teamId, type, message, linkUrl = null, options = {}) => {
    try {
        const leadIds = await getTeamLeadIds(teamId);
        await createNotificationsBulk(leadIds, type, message, linkUrl, options);
    } catch (error) {
        console.error('Failed to notify team leads:', error);
    }
};

/**
 * Broadcasts to both Admins AND the Team Leads of a specific team
 */
export const notifyAdminsAndLeads = async (teamId, type, message, linkUrl = null, options = {}) => {
    try {
        const [adminIds, leadIds] = await Promise.all([getAdminIds(), getTeamLeadIds(teamId)]);
        await createNotificationsBulk([...adminIds, ...leadIds], type, message, linkUrl, options);
    } catch (error) {
        console.error('Failed to notify admins and leads:', error);
    }
};

/**
 * Notify arbitrary set of users with automatic dedupe.
 */
export const notifyUsers = async (userIds, type, message, linkUrl = null, options = {}) => {
    await createNotificationsBulk(userIds, type, message, linkUrl, options);
};
