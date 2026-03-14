import db from '../config/db.js';
import { createNotification } from '../services/notificationService.js';

export const getTasks = async (req, res, next) => {
    try {
        const { teamId } = req.params;
        const { sprint_id, status, assignee_id } = req.query;

        let query = `
            SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_url AS assignee_avatar
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.team_id = $1
        `;
        let params = [teamId];
        let count = 2;

        if (sprint_id) {
            query += ` AND t.sprint_id = $${count++}`;
            params.push(sprint_id);
        }
        if (status) {
            query += ` AND t.status = $${count++}`;
            params.push(status);
        }
        if (assignee_id) {
            query += ` AND t.assignee_id = $${count++}`;
            params.push(assignee_id);
        } else if (req.user.role === 'Member') {
            // Role Logic: Members ONLY see tasks assigned to them
            query += ` AND t.assignee_id = $${count++}`;
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

        let query = `
            SELECT t.*, p.name AS project_name, u.name AS assignee_name, u.avatar_url AS assignee_avatar
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.team_id = $1 AND t.sprint_id IS NULL
        `;
        let params = [teamId];
        if (req.user.role === 'Member') {
            query += ' AND t.assignee_id = $2';
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
            project_id, sprint_id, assignee_id
        } = req.body;

        if (!title) return res.status(400).json({ message: 'Title is required' });

        // Logic 10: Auto-assign Active Sprint if no sprint provided
        let targetSprintId = sprint_id;
        if (!targetSprintId) {
            const activeSprintCheck = await db.query(
                "SELECT id FROM sprints WHERE team_id = $1 AND status = 'Active'",
                [teamId]
            );
            if (activeSprintCheck.rows.length > 0) {
                targetSprintId = activeSprintCheck.rows[0].id;
            }
        }

        // Calculate sort_order (place at the end of the current status/sprint combination)
        let maxOrderQuery = 'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM tasks WHERE team_id = $1 AND status = $2';
        let maxOrderParams = [teamId, status || 'Backlog'];

        if (targetSprintId) {
            maxOrderQuery += ' AND sprint_id = $3';
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
        team_id, project_id, sprint_id, assignee_id, creator_id, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
    `;

        const newTask = await db.query(insertQuery, [
            title, description, type || 'Task', priority || 'Medium', status || 'Backlog',
            story_points || 0, estimated_hours, due_date,
            teamId, project_id, targetSprintId, assignee_id, req.user.id, newSortOrder
        ]);

        // Logic 14: Notification trigger when assigned
        if (assignee_id && assignee_id !== req.user.id) {
            await createNotification(
                assignee_id,
                'TaskAssigned',
                `You were assigned to task: ${title}`
            );
        }

        res.status(201).json(newTask.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const updateTask = async (req, res, next) => {
    try {
        const { id, teamId } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated generically
        delete updates.id;
        delete updates.team_id;
        delete updates.creator_id;
        delete updates.created_at;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields provided for update' });
        }

        let query = 'UPDATE tasks SET updated_at = CURRENT_TIMESTAMP';
        let params = [];
        let count = 1;

        for (const [key, value] of Object.entries(updates)) {
            query += `, ${key} = $${count}`;
            params.push(value);
            count++;
        }

        query += ` WHERE id = $${count} AND team_id = $${count + 1} RETURNING *`;
        params.push(id, teamId);

        const { rows } = await db.query(query, params);
        if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });

        // Logic 14: Notify user of the assignment specifically if the assignee ID was changed
        if (updates.assignee_id && updates.assignee_id !== req.user.id) {
            await createNotification(
                updates.assignee_id,
                'TaskUpdated',
                `You were assigned to an existing task: ${rows[0].title}`
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
        const taskCheck = await db.query('SELECT status, sprint_id FROM tasks WHERE id = $1 AND team_id = $2', [id, teamId]);
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
            `UPDATE tasks SET status = $1, sort_order = $2, sprint_id = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 AND team_id = $5 RETURNING *`,
            [status, sort_order, sprint_id || null, id, teamId]
        );

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
