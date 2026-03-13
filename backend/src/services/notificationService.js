import db from '../config/db.js';

/**
 * Creates a notification for a specific user
 * @param {string} userId - User UUID to receive the notification
 * @param {string} type - 'TaskAssigned' | 'TaskUpdated' | 'CommentAdded' | 'SprintStarted' | 'SprintCompleted'
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
