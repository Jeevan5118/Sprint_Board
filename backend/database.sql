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

-- Board Settings (Jira-style customization)
CREATE TABLE IF NOT EXISTS board_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    is_power_hour BOOLEAN NOT NULL DEFAULT FALSE,
    board_type VARCHAR(20) NOT NULL CHECK (board_type IN ('kanban', 'sprint')),
    swimlane_mode VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (swimlane_mode IN ('none', 'assignee', 'priority', 'type')),
    show_epic_panel BOOLEAN NOT NULL DEFAULT FALSE,
    show_card_fields JSONB NOT NULL DEFAULT '["assignee","story_points","due_date","project","type","priority"]'::jsonb,
    done_column_key VARCHAR(50) NOT NULL DEFAULT 'done',
    enable_quick_filters BOOLEAN NOT NULL DEFAULT TRUE,
    enable_color_customization BOOLEAN NOT NULL DEFAULT TRUE,
    enable_transition_rules BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, is_power_hour, board_type)
);

CREATE TABLE IF NOT EXISTS board_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
    column_key VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    wip_limit INT,
    is_done_column BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_settings_id, column_key)
);

CREATE TABLE IF NOT EXISTS board_color_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
    dimension VARCHAR(20) NOT NULL CHECK (dimension IN ('status', 'type', 'priority')),
    dimension_value VARCHAR(100) NOT NULL,
    bg_color VARCHAR(20) NOT NULL,
    text_color VARCHAR(20) NOT NULL,
    border_color VARCHAR(20) NOT NULL,
    badge_color VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_settings_id, dimension, dimension_value)
);

CREATE TABLE IF NOT EXISTS board_quick_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    position INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS board_transition_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    board_settings_id UUID NOT NULL REFERENCES board_settings (id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['Admin', 'Team Lead', 'Member']::TEXT[],
    required_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    blocked_if_dependencies_open BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_settings_id, from_status, to_status)
);
