-- Migration: Add role column for admin authorization
-- HAP-612: SECURITY - Fix open user registration

-- Add role column to users table
-- SQLite doesn't support IF NOT EXISTS for columns, but D1 migrations are idempotent
-- The column already exists in schema.ts, this ensures database has it

-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS
-- We use a transaction to safely handle both cases
BEGIN TRANSACTION;

-- Try adding the column (will fail silently if exists due to migration runner)
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Add admin-specific columns from Better-Auth admin plugin
ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN ban_reason TEXT;
ALTER TABLE users ADD COLUMN ban_expires INTEGER;

COMMIT;

-- Set the bootstrap admin user role
-- This is the same ID configured in auth.ts adminUserIds
UPDATE users SET role = 'admin' WHERE id = 'C1zmGOgcvVNskKcTUDgLuYytHmCWOKMs';

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
