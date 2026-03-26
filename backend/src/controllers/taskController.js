import db from '../config/db.js';
import { createNotification, notifyAdmins, notifyAdminsAndLeads } from '../services/notificationService.js';
import { logTaskHistory, logTaskChanges } from '../services/historyService.js';

export const getTasks = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { sprint_id, status, assignee_id, is_power_hour, project_id } = req.query;
        const isPowerHourBool = is_power_hour === 'true';

        let query = `
            SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_url AS assignee_avatar,
                   lub.name AS last_updated_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN users lub ON t.last_updated_by_id = lub.id
            WHERE t.team_id = $1 AND (t.is_power_hour = $2 OR (t.is_power_hour IS NULL AND $2 = false))
        `;
        const params = [teamId, isPowerHourBool];

        if (project_id) {
            query += ` AND t.project_id = $${params.length + 1}`;
            params.push(project_id);
        }

        if (sprint_id) {
            query += ` AND t.sprint_id = $${params.length + 1}`;
            params.push(sprint_id);
        } else if (status === 'Backlog') {
            query += ` AND t.sprint_id IS NULL`;
        }

        if (status && status !== 'Backlog') {
            query += ` AND t.status = $${params.length + 1}`;
            params.push(status);
        }

        if (assignee_id) {
            query += ` AND t.assignee_id = $${params.length + 1}`;
            params.push(assignee_id);
        }
        // Logic 3: Restricted Member visibility
        if (req.user.role === 'Member') {
            query += ` AND t.assignee_id = $${params.length + 1}`;
            params.push(req.user.id);
        }

        query += ' ORDER BY t.sort_order ASC, t.created_at DESC';

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (error) { next(error); }
};

export const getKanbanTasks = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const isPowerHourBool = req.query.is_power_hour === 'true';

        let query = `
            SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_url AS assignee_avatar,
                   lub.name AS last_updated_by_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            LEFT JOIN users lub ON t.last_updated_by_id = lub.id
            WHERE t.team_id = $1 AND t.sprint_id IS NULL AND t.is_power_hour = $2
        `;
        let params = [teamId, isPowerHourBool];
        // Logic 3: Restricted Member visibility for Kanban
        if (req.user.role === 'Member') {
            query += ` AND t.assignee_id = $3`;
            params.push(req.user.id);
        }
        query += ' ORDER BY t.sort_order ASC, t.created_at DESC';
        const { rows } = await db.query(query, params);

        const limitsQuery = 'SELECT status_name, wip_limit FROM kanban_column_limits WHERE team_id = $1';
        const limits = await db.query(limitsQuery, [teamId]);

        res.json({
            tasks: rows,
            limits: limits.rows
        });
    } catch (error) { next(error); }
};


export const createTask = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const {
            title, description, type, priority, status,
            story_points, estimated_hours, due_date,
            project_id, sprint_id, assignee_id, is_power_hour
        } = req.body;
        const isPowerHourBool = Boolean(is_power_hour);

        if (!title) return res.status(400).json({ message: 'Title is required' });

        // Logic 10: Auto-assign Active Sprint if no sprint provided, specific to Power Hour context
        let targetSprintId = sprint_id;
        if (!targetSprintId) {
            const activeSprintCheck = await db.query(
                "SELECT id FROM sprints WHERE team_id = $1 AND status = 'Active' AND is_power_hour = $2",
                [teamId, isPowerHourBool]
            );
            if (activeSprintCheck.rows.length > 0) {
                targetSprintId = activeSprintCheck.rows[0].id;
            }
        }

        // Calculate sort_order (place at the end of the current status/sprint combination)
        let maxOrderQuery = 'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM tasks WHERE team_id = $1 AND status = $2 AND is_power_hour = $3';
        let maxOrderParams = [teamId, status || 'Backlog', isPowerHourBool];

        if (targetSprintId) {
            maxOrderQuery += ' AND sprint_id = $4';
            maxOrderParams.push(targetSprintId);
        } else {
            maxOrderQuery += ' AND sprint_id IS NULL';
        }

        const { rows } = await db.query(maxOrderQuery, maxOrderParams);
        const newSortOrder = parseFloat(rows[0].max_order) + 1000;

        const insertQuery = `
      INSERT INTO tasks (
        title, description, type, priority, status, 
        story_points, estimated_hours, due_date,
        team_id, project_id, sprint_id, assignee_id, creator_id, sort_order, is_power_hour
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *
    `;

        const newTask = await db.query(insertQuery, [
            title, description, type || 'Task', priority || 'Medium', status || 'Backlog',
            story_points || 0, estimated_hours, due_date,
            teamId, project_id, targetSprintId, assignee_id, req.user.id, newSortOrder, isPowerHourBool
        ]);

        // Logic 14: Notification trigger when assigned & Notify Admins/Leads on creation
        const contextPath = isPowerHourBool ? 'power-hour-teams' : 'teams';
        const link = targetSprintId ? `/${contextPath}/${teamId}/sprint-board` : `/${contextPath}/${teamId}/kanban`;

        // Notify Assignee
        if (assignee_id && assignee_id !== req.user.id) {
            await createNotification(
                assignee_id,
                'TaskAssigned',
                `You were assigned to task: ${title}`,
                link
            );
        }

        // Notify Admins & Team Leads (End-to-End coverage)
        const { rows: creatorRow } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        await notifyAdminsAndLeads(
            teamId,
            'TaskCreated',
            `New task "${title}" created by ${creatorRow[0]?.name || 'a user'}.`,
            link
        );

        res.status(201).json(newTask.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const updateTask = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;
        const updates = req.body;

        // Fetch old state for history
        const { rows: oldTaskRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (oldTaskRows.length === 0) return res.status(404).json({ message: 'Task not found' });
        const oldTask = oldTaskRows[0];

        // Perform update
        let query = 'UPDATE tasks SET updated_at = CURRENT_TIMESTAMP, last_updated_by_id = $' + (Object.keys(updates).filter(k => !['id', 'team_id', 'creator_id', 'created_at'].includes(k)).length + 1);
        let params = [];
        let count = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (['id', 'team_id', 'creator_id', 'created_at'].includes(key)) continue;
            query += `, ${key} = $${count}`;
            params.push(value);
            count++;
        }

        query += ` WHERE id = $${count} AND team_id = $${count + 1} RETURNING *`;
        params.push(req.user.id, id, teamId);

        const { rows } = await db.query(query, params);
        if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        // LOG HISTORY
        await logTaskChanges(id, req.user.id, oldTask, updates);

        // Logic 14: Notify user of the assignment specifically if the assignee ID was changed
        if (updates.assignee_id && updates.assignee_id !== req.user.id) {
            const link = rows[0].sprint_id ? `/teams/${teamId}/sprint-board` : `/teams/${teamId}/kanban`;
            await createNotification(
                updates.assignee_id,
                'TaskUpdated',
                `You were assigned to an existing task: ${rows[0].title}`,
                link
            );
        }

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

export const updateTaskStatus = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;
        const { status, sort_order, sprint_id } = req.body;

        if (!status || sort_order === undefined) {
            return res.status(400).json({ message: 'Status and sort_order are required' });
        }

        await db.query('BEGIN');

        // Check if task exists first
        const taskCheck = await db.query('SELECT title, status, sprint_id, is_power_hour FROM tasks WHERE id = $1 AND team_id = $2', [id, teamId]);
        if (taskCheck.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found' });
        }
        const currentTask = taskCheck.rows[0];

        // If this is a Kanban task move (no sprint), check WIP limits
        if (!sprint_id && !currentTask.sprint_id) {
            const wipQuery = 'SELECT wip_limit FROM kanban_column_limits WHERE team_id = $1 AND status_name = $2';
            const wipResult = await db.query(wipQuery, [teamId, status]);

            if (wipResult.rows.length > 0 && wipResult.rows[0].wip_limit > 0) {
                const limit = wipResult.rows[0].wip_limit;
                const countResult = await db.query(
                    'SELECT COUNT(*) FROM tasks WHERE team_id = $1 AND sprint_id IS NULL AND status = $2 AND id != $3',
                    [teamId, status, id]
                );

                if (parseInt(countResult.rows[0].count) >= limit) {
                    await db.query('ROLLBACK');
                    return res.status(400).json({ message: `WIP limit (${limit}) reached for ${status}` });
                }
            }
        }

        const { rows } = await db.query(
            `UPDATE tasks SET status = $1, sort_order = $2, sprint_id = $3, updated_at = CURRENT_TIMESTAMP, last_updated_by_id = $4 
             WHERE id = $5 AND team_id = $6 RETURNING *`,
            [status, sort_order, sprint_id || null, req.user.id, id, teamId]
        );

        // LOG HISTORY
        if (currentTask.status !== status) {
            await logTaskHistory(id, req.user.id, 'status', currentTask.status, status);
        }
        if (currentTask.sprint_id !== (sprint_id || null)) {
            await logTaskHistory(id, req.user.id, 'sprint', currentTask.sprint_id, sprint_id || 'Backlog');
        }

        // Feature: Notify Admins & Leads on Status Change (In Review or Done)
        if (currentTask.status !== status) {
            const { rows: userRow } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
            const contextPath = currentTask.is_power_hour ? 'power-hour-teams' : 'teams';
            const link = (sprint_id || currentTask.sprint_id) ? `/${contextPath}/${teamId}/sprint-board` : `/${contextPath}/${teamId}/kanban`;
            const actor = userRow[0]?.name || 'a user';

            if (status === 'In Review') {
                await notifyAdminsAndLeads(teamId, 'TaskStatus', `Task "${currentTask.title}" moved to In Review by ${actor}.`, link);
            } else if (status === 'Done') {
                await notifyAdminsAndLeads(teamId, 'TaskStatus', `Task "${currentTask.title}" moved to Done by ${actor}.`, link);
            }
        }

        await db.query('COMMIT');
        res.json(rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Task Status Update Error:", error);
        next(error);
    }
};

export const deleteTask = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;
        // Role check (Admin or Team Lead only) is done in routes
        const { rows } = await db.query('DELETE FROM tasks WHERE id = $1 AND team_id = $2 RETURNING *', [id, teamId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });
        res.json({ message: 'Task deleted successfully', task: rows[0] });
    } catch (error) { next(error); }
};

export const getTaskHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT th.*, u.name as user_name, u.avatar_url as user_avatar
            FROM task_history th
            JOIN users u ON th.user_id = u.id
            WHERE th.task_id = $1
            ORDER BY th.created_at DESC
        `;
        const { rows } = await db.query(query, [id]);
        res.json(rows);
    } catch (error) { next(error); }
};
