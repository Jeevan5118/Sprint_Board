import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// pdf-parse is lazy-loaded inside importData to prevent Vercel startup crash
let pdf = null;

const validateRole = (role) => {
    const validRoles = ['Admin', 'Team Lead', 'Member'];
    // Normalize: Trim and Title Case (e.g., "team lead" -> "Team Lead")
    if (!role) return 'Member';
    const normalized = role.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    return validRoles.includes(normalized) ? normalized : 'Member';
};

export const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Please provide all details' });
        }

        // Check if user exists
        const userExists = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, LOWER($2), $3, $4) RETURNING id, name, email, role, avatar_url',
            [name, email, passwordHash, role]
        );

        res.status(201).json({ message: 'User created successfully', data: newUser.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const importData = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const { import_type = 'tasks' } = req.body;

        let records = [];
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();
        const buffer = req.file.buffer;

        if (fileExt === 'csv') {
            const csvData = buffer.toString('utf-8');
            records = parse(csvData, { columns: true, skip_empty_lines: true });
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        } else if (fileExt === 'pdf') {
            if (!pdf) {
                try {
                    pdf = require('pdf-parse');
                } catch (err) {
                    console.error('PDF Parse Load Error:', err.message);
                    return res.status(500).json({
                        message: 'PDF processing is currently unavailable in this environment.',
                        error: err.message
                    });
                }
            }
            const data = await pdf(buffer);
            const lines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // Experimental PDF Table extraction (Very basic: assumes first line is header, comma or tab or space separated)
            if (lines.length > 1) {
                const headerLine = lines[0];
                const delimiter = headerLine.includes(',') ? ',' : headerLine.includes('\t') ? '\t' : ' ';
                const headers = headerLine.split(delimiter).map(h => h.trim());

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(delimiter).map(v => v.trim());
                    const row = {};
                    headers.forEach((h, idx) => {
                        row[h] = values[idx] || '';
                    });
                    records.push(row);
                }
            }
        } else {
            return res.status(400).json({ message: 'Unsupported file format. Use CSV, Excel, or PDF.' });
        }

        let summary = { created: 0, skipped: 0, failed: 0, errors: [] };
        const defaultPassword = 'Password@123';

        const client = await db.connect();
        try {
            for (let i = 0; i < records.length; i++) {
                const rawRow = records[i];
                // Normalize keys (trim and lowercase)
                const row = {};
                Object.keys(rawRow).forEach(key => {
                    // Turn "Employee Name" into "employee_name" and " Mail " into "mail"
                    const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                    row[normalizedKey] = rawRow[key];
                });

                try {
                    await client.query('BEGIN');
                    if (import_type === 'employees') {
                        const finalName = row.employee_name || row.name || row.full_name || row.user_name || row.member_name;
                        const finalEmail = row.mail || row.email || row.employee_email || row.user_email || row.member_email || row.login;
                        const { password, team, team_name, role, employee_role, job_role, user_role, member_role } = row;
                        const finalRole = validateRole(role || employee_role || job_role || user_role || member_role);
                        const finalTeam = team || team_name;
                        if (!finalName || !finalEmail || !finalTeam) throw new Error('Missing name, email, or team');

                        // 1. User Logic
                        let userId;
                        const userCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [finalEmail]);
                        if (userCheck.rows.length === 0) {
                            const salt = await bcrypt.genSalt(10);
                            const hash = await bcrypt.hash(password || defaultPassword, salt);
                            const newUser = await client.query(
                                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, LOWER($2), $3, $4) RETURNING id',
                                [finalName, finalEmail, hash, finalRole]
                            );
                            userId = newUser.rows[0].id;
                        } else {
                            userId = userCheck.rows[0].id;
                        }

                        // 2. Team Logic
                        let teamId;
                        const teamCheck = await client.query('SELECT id FROM teams WHERE name = $1', [finalTeam]);
                        if (teamCheck.rows.length === 0) {
                            const newTeam = await client.query('INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING id', [finalTeam, req.user.id]);
                            teamId = newTeam.rows[0].id;
                        } else {
                            teamId = teamCheck.rows[0].id;
                        }

                        // 3. Mapping Logic
                        const memCheck = await client.query('SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
                        if (memCheck.rows.length === 0) {
                            await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)', [teamId, userId, finalRole]);
                        }

                        // 4. Ensure Importer is in Team for visibility
                        if (req.user.id !== userId) {
                            await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [teamId, req.user.id, 'Admin']);
                        }
                        summary.created++;

                    } else if (import_type === 'automate') {
                        const {
                            team, team_name, organization,
                            employee_name, name, full_name, user_name, member_name,
                            mail, email, employee_email, user_email, member_email,
                            password,
                            role, employee_role, job_role, user_role, member_role,
                            project, project_name,
                            sprint, sprint_name, target_sprint,
                            task_title, title, subject,
                            task_description, description, body,
                            task_priority, priority, level,
                            story_points, points,
                            due_date, deadline
                        } = row;
                        const finalEmail = mail || email || employee_email || user_email || member_email;
                        const finalName = employee_name || name || full_name || user_name || member_name || 'New Member';

                        // Handle missing email by generating one from name
                        let workingEmail = finalEmail;
                        if (!workingEmail && finalName && finalName !== 'New Member') {
                            workingEmail = `${finalName.toLowerCase().replace(/\s+/g, '.')}@sprintboard.com`;
                        }
                        const finalRole = validateRole(role || employee_role || job_role || user_role || member_role);
                        const rawPassword = password || defaultPassword;
                        const finalTeam = team || team_name;

                        let teamId = null;
                        if (finalTeam) {
                            const teamCheck = await client.query('SELECT id FROM teams WHERE name = $1', [finalTeam]);
                            if (teamCheck.rows.length === 0) {
                                const newTeam = await client.query('INSERT INTO teams (name, created_by) VALUES ($1, $2) RETURNING id', [finalTeam, req.user.id]);
                                teamId = newTeam.rows[0].id;
                                console.log(`Created new team: ${finalTeam} (${teamId})`);
                            } else {
                                teamId = teamCheck.rows[0].id;
                                console.log(`Found existing team: ${finalTeam} (${teamId})`);
                            }

                            // ALWAYS Ensure Admin is a member of the team for visibility
                            await client.query(
                                'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO NOTHING',
                                [teamId, req.user.id, 'Admin']
                            );
                            console.log(`Ensured admin (user ${req.user.id}) is member of team ${teamId}`);
                        }

                        let userId = req.user.id;
                        if (workingEmail && teamId) {
                            const uc = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [workingEmail]);
                            if (uc.rows.length === 0) {
                                const salt = await bcrypt.genSalt(10);
                                const h = await bcrypt.hash(rawPassword, salt);
                                const nu = await client.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, LOWER($2), $3, $4) RETURNING id', [finalName, workingEmail, h, finalRole]);
                                userId = nu.rows[0].id;
                            } else userId = uc.rows[0].id;

                            // Ensure member maps to team
                            await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO NOTHING', [teamId, userId, finalRole]);
                        }

                        let projectId = null;
                        if (project && teamId) {
                            const pc = await client.query('SELECT id FROM projects WHERE name = $1 AND team_id = $2', [project, teamId]);
                            if (pc.rows.length === 0) {
                                const np = await client.query('INSERT INTO projects (name, team_id) VALUES ($1, $2) RETURNING id', [project, teamId]);
                                projectId = np.rows[0].id;
                            } else projectId = pc.rows[0].id;
                        }

                        let sprintId = null;
                        if (sprint && teamId) {
                            const sc = await client.query('SELECT id FROM sprints WHERE name = $1 AND team_id = $2', [sprint, teamId]);
                            if (sc.rows.length === 0) {
                                const ns = await client.query("INSERT INTO sprints (name, team_id, status) VALUES ($1, $2, 'Active') RETURNING id", [sprint, teamId]);
                                sprintId = ns.rows[0].id;
                            } else sprintId = sc.rows[0].id;
                        } else if (teamId) {
                            const activeS = await client.query("SELECT id FROM sprints WHERE team_id = $1 AND status = 'Active' LIMIT 1", [teamId]);
                            if (activeS.rows.length > 0) {
                                sprintId = activeS.rows[0].id;
                            } else {
                                // AUTO-FIX: Create and Activate a starting sprint so the user sees tasks on the board
                                const ns = await client.query("INSERT INTO sprints (name, team_id, status) VALUES ($1, $2, 'Active') RETURNING id", ['Sprint 1', teamId]);
                                sprintId = ns.rows[0].id;
                                console.log(`Auto-created active sprint for team ${teamId}`);
                            }
                        }

                        const finalTaskTitle = task_title || title;
                        if (finalTaskTitle && teamId) {
                            const pm = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'urgent': 'Urgent' };
                            const fp = pm[(task_priority || priority || 'medium').toLowerCase()] || 'Medium';

                            let finalDueDate = null;
                            if (due_date) {
                                if (typeof due_date === 'string' && due_date.includes('-')) {
                                    const parts = due_date.split('-');
                                    if (parts[0].length <= 2 && parts[2].length === 4) {
                                        finalDueDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                                    } else { finalDueDate = new Date(due_date); }
                                } else { finalDueDate = new Date(due_date); }
                            }

                            const { rows } = await client.query('SELECT COALESCE(MAX(sort_order), 0) + 1000 as next_order FROM tasks WHERE team_id = $1 AND status = $2', [teamId, 'To Do']);
                            await client.query(`INSERT INTO tasks (title, description, priority, status, team_id, sprint_id, project_id, assignee_id, creator_id, sort_order, story_points, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                                [finalTaskTitle, task_description || description || '', fp, 'To Do', teamId, sprintId, projectId, userId, req.user.id, rows[0].next_order, parseInt(story_points) || 0, (finalDueDate && !isNaN(finalDueDate.getTime())) ? finalDueDate : null]);
                        }
                        summary.created++;
                    } else if (import_type === 'teams') {
                        const { name, description } = row;
                        if (!name) throw new Error('Missing team name');
                        const exists = await client.query('SELECT id FROM teams WHERE name = $1', [name]);
                        if (exists.rows.length === 0) {
                            const newT = await client.query('INSERT INTO teams (name, description, created_by) VALUES ($1, $2, $3) RETURNING id', [name, description, req.user.id]);
                            // Ensure visibility
                            await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [newT.rows[0].id, req.user.id, 'Admin']);
                            summary.created++;
                        } else { summary.skipped++; }

                    } else if (import_type === 'projects') {
                        const { name, description, team } = row;
                        if (!name || !team) throw new Error('Missing project name or team');
                        const tCheck = await client.query('SELECT id FROM teams WHERE name = $1', [team]);
                        if (tCheck.rows.length === 0) throw new Error(`Team ${team} not found`);

                        await client.query(
                            'INSERT INTO projects (name, description, team_id) VALUES ($1, $2, $3)',
                            [name, description, tCheck.rows[0].id]
                        );
                        summary.created++;

                    } else { // Tasks (Default)
                        const {
                            title, task_title, name: task_name, subject,
                            description, task_description, body,
                            team, team_name, organization,
                            priority, task_priority, level,
                            story_points, points,
                            due_date, deadline,
                            assignee, user, member,
                            mail, email, assignee_email, user_email, member_email, login, member_mail
                        } = row;

                        const finalTeam = team || team_name || organization;
                        const finalTitle = title || task_title || task_name || subject;
                        const finalEmail = mail || assignee_email || email || user_email || member_email || login || member_mail;
                        const finalName = row.name || assignee || member || user || row.assignee_name || row.member_name || row.full_name || row.user_name || 'New Member';
                        const finalPriority = priority || task_priority || level || 'medium';

                        if (!finalTitle || !finalTeam) throw new Error('Missing title or team');

                        // Handle missing email by generating one from name
                        let workingEmail = finalEmail;
                        if (!workingEmail && finalName) {
                            workingEmail = `${finalName.toLowerCase().replace(/\s+/g, '.')}@sprintboard.com`;
                        }
                        if (!workingEmail) throw new Error('Missing email or name to identify user');

                        const teamCheck = await client.query('SELECT id FROM teams WHERE name = $1', [finalTeam]);
                        if (teamCheck.rows.length === 0) throw new Error(`Team ${finalTeam} not found`);
                        const teamId = teamCheck.rows[0].id;

                        let assigneeId;
                        const userCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [workingEmail]);
                        if (userCheck.rows.length === 0) {
                            // Automatically create missing user
                            const salt = await bcrypt.genSalt(10);
                            const hash = await bcrypt.hash(defaultPassword, salt);
                            const newUser = await client.query(
                                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, LOWER($2), $3, $4) RETURNING id',
                                [finalName, workingEmail, hash, 'Member']
                            );
                            assigneeId = newUser.rows[0].id;
                        } else {
                            assigneeId = userCheck.rows[0].id;
                        }

                        // Validate User belongs to team (Enterprise constraint) - Auto-map if missing
                        const memberCheck = await client.query('SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, assigneeId]);
                        if (memberCheck.rows.length === 0) {
                            await client.query('INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)', [teamId, assigneeId, 'Member']);
                        }

                        let targetSprintId = null;
                        const activeSprintCheck = await client.query("SELECT id FROM sprints WHERE team_id = $1 AND status = 'Active' LIMIT 1", [teamId]);
                        if (activeSprintCheck.rows.length > 0) {
                            targetSprintId = activeSprintCheck.rows[0].id;
                        } else {
                            // AUTO-FIX: Create and Activate a starting sprint so the user sees tasks on the board
                            const ns = await client.query("INSERT INTO sprints (name, team_id, status) VALUES ($1, $2, 'Active') RETURNING id", ['Sprint 1', teamId]);
                            targetSprintId = ns.rows[0].id;
                            console.log(`Auto-created active sprint for team ${teamId} in default task import`);
                        }

                        const pMap = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'urgent': 'Urgent' };
                        const normalizedPriority = pMap[finalPriority.toLowerCase()] || 'Medium';

                        const { rows } = await client.query(
                            'SELECT COALESCE(MAX(sort_order), 0) + 1000 as next_order FROM tasks WHERE team_id = $1 AND status = $2',
                            [teamId, targetSprintId ? 'To Do' : 'Backlog']
                        );

                        let finalDueDate = null;
                        if (due_date) {
                            if (typeof due_date === 'string' && due_date.includes('-')) {
                                const parts = due_date.split('-');
                                // Handle DD-MM-YYYY
                                if (parts[0].length <= 2 && parts[2].length === 4) {
                                    finalDueDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                                } else {
                                    finalDueDate = new Date(due_date);
                                }
                            } else {
                                finalDueDate = new Date(due_date);
                            }
                        }

                        await client.query(`
                        INSERT INTO tasks (title, description, priority, status, story_points, due_date, team_id, sprint_id, assignee_id, creator_id, sort_order)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [finalTitle, description || task_description || body || '', normalizedPriority, 'To Do', parseInt(story_points || points) || 0, finalDueDate && !isNaN(finalDueDate.getTime()) ? finalDueDate : null, teamId, targetSprintId, assigneeId, req.user.id, rows[0].next_order]);

                        summary.created++;
                    }
                    await client.query('COMMIT');
                } catch (err) {
                    await client.query('ROLLBACK');
                    summary.failed++;
                    summary.errors.push(`Row ${i + 2}: ${err.message}`);
                }
            }
            res.json({ message: 'Import concluded', data: summary });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        next(error);
    }
};
