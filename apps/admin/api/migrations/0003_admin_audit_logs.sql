-- Migration: Add admin audit logs table
-- HAP-804: Persist admin role-change audit logs
--
-- This table provides persistent audit logging for sensitive admin operations.
-- Currently tracks role changes; extensible for future admin actions.

-- Create the admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    -- Type of action performed (e.g., 'role_change', 'user_ban')
    action TEXT NOT NULL,
    -- Admin who performed the action
    actor_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    -- Target of the action (for actions on other users)
    target_id TEXT,
    target_email TEXT,
    -- Value tracking for changes
    previous_value TEXT,
    new_value TEXT,
    -- Request metadata as JSON (IP, user-agent, request ID)
    metadata TEXT,
    -- When the action was performed
    created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_id_idx ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_target_id_idx ON admin_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at);
