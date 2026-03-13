-- Users and Authentication table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Member' CHECK (role IN ('Admin', 'Team Lead', 'Member')),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users (id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID REFERENCES teams (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_id UUID REFERENCES teams (id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprints
CREATE TABLE IF NOT EXISTS sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams (id) ON DELETE CASCADE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Planned' CHECK (status IN ('Planned', 'Active', 'Completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensures only ONE active sprint per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_sprint_team ON sprints (team_id)
WHERE
    status = 'Active';

-- WIP Column Limits (Kanban)
CREATE TABLE IF NOT EXISTS kanban_column_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    team_id UUID REFERENCES teams (id) ON DELETE CASCADE,
    status_name VARCHAR(50) NOT NULL,
    wip_limit INT,
    UNIQUE (team_id, status_name)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'Task' CHECK (type IN ('Task', 'Bug', 'Feature', 'Story')),
    priority VARCHAR(50) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    status VARCHAR(50) DEFAULT 'Backlog' CHECK (
        status IN (
            'Backlog',
            'To Do',
            'In Progress',
            'Review',
            'Done'
        )
    ),
    story_points INT DEFAULT 0,
    estimated_hours DECIMAL(5, 2),
    due_date TIMESTAMP,
    team_id UUID REFERENCES teams (id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints (id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES users (id) ON DELETE SET NULL,
    creator_id UUID REFERENCES users (id),
    sort_order DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Time Logs
CREATE TABLE IF NOT EXISTS task_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    hours DECIMAL(5, 2) NOT NULL,
    description TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users (id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    public_id VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Links
CREATE TABLE IF NOT EXISTS task_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE,
    title VARCHAR(255),
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks (team_id);

CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks (sprint_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);