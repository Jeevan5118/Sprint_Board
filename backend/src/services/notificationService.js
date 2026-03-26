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

/**
 * Broadcasts a notification to all Admin users
 */
export const notifyAdmins = async (type, message, linkUrl = null) => {
    try {
        const { rows } = await db.query("SELECT id FROM users WHERE role = 'Admin'");
        for (const admin of rows) {
            await createNotification(admin.id, type, message, linkUrl);
        }
    } catch (error) {
        console.error('Failed to notify admins:', error);
    }
};

/**
 * Broadcasts a notification to all members of a specific team
 */
export const notifyTeam = async (teamId, type, message, linkUrl = null) => {
    try {
        const { rows } = await db.query('SELECT user_id FROM team_members WHERE team_id = $1', [teamId]);
        for (const member of rows) {
            await createNotification(member.user_id, type, message, linkUrl);
        }
    } catch (error) {
        console.error('Failed to notify team:', error);
    }
};

/**
 * Broadcasts a notification ONLY to Team Leads of a specific team
 */
export const notifyTeamLeads = async (teamId, type, message, linkUrl = null) => {
    try {
        const { rows } = await db.query(
            "SELECT user_id FROM team_members WHERE team_id = $1 AND role = 'Team Lead'", 
            [teamId]
        );
        for (const lead of rows) {
            await createNotification(lead.user_id, type, message, linkUrl);
        }
    } catch (error) {
        console.error('Failed to notify team leads:', error);
    }
};

/**
 * Broadcasts to both Admins AND the Team Leads of a specific team
 */
export const notifyAdminsAndLeads = async (teamId, type, message, linkUrl = null) => {
    try {
        // Notify Admins
        await notifyAdmins(type, message, linkUrl);
        // Notify Team Leads
        if (teamId) {
            await notifyTeamLeads(teamId, type, message, linkUrl);
        }
    } catch (error) {
        console.error('Failed to notify admins and leads:', error);
    }
};
