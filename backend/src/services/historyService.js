import db from '../config/db.js';

/**
 * Logs a single field change for a task.
 * @param {string} taskId - The ID of the task being updated.
 * @param {string} userId - The ID of the user performing the update.
 * @param {string} field - The name of the field that changed.
 * @param {string} oldValue - The previous value.
 * @param {string} newValue - The new value.
 */
export const logTaskHistory = async (taskId, userId, field, oldValue, newValue) => {
    try {
        if (oldValue === newValue) return;

        const query = `
            INSERT INTO task_history (task_id, user_id, field_changed, old_value, new_value)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await db.query(query, [taskId, userId, field, String(oldValue), String(newValue)]);
        console.log(`[History] Logged ${field} change for task ${taskId}`);
    } catch (error) {
        console.error('[History Error]:', error);
    }
};

/**
 * Logs multiple changes for a task by comparing two objects.
 * Useful for generic update endpoints.
 */
export const logTaskChanges = async (taskId, userId, oldTask, updates) => {
    for (const [field, newValue] of Object.entries(updates)) {
        const oldValue = oldTask[field];
        if (oldValue !== newValue && newValue !== undefined) {
            await logTaskHistory(taskId, userId, field, oldValue, newValue);
        }
    }
};
