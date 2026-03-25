-- Migration: Add last_updated_by_id to tasks table
ALTER TABLE tasks
ADD COLUMN last_updated_by_id UUID REFERENCES users (id);

-- Initialize with creator_id for existing tasks
UPDATE tasks
SET
    last_updated_by_id = creator_id
WHERE
    last_updated_by_id IS NULL;