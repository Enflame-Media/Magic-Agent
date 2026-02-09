-- Cleanup Empty Archived Sessions
--
-- This SQL script deletes all archived sessions (active = 0) that have no messages.
-- Empty archived sessions occur when a Claude Code session is created but terminated
-- before any messages are sent (crash, cancel, timeout before first output).
--
-- Usage:
--   # Dry run - see what would be deleted (development)
--   npx wrangler d1 execute happy-dev --remote --file=scripts/cleanup-empty-sessions-dryrun.sql --env=dev
--
--   # Actually delete (development)
--   npx wrangler d1 execute happy-dev --remote --file=scripts/cleanup-empty-sessions.sql --env=dev
--
--   # For production
--   npx wrangler d1 execute happy-prod --remote --file=scripts/cleanup-empty-sessions.sql --env=prod
--
-- @see HAP-xxx - Empty archived sessions cleanup

-- Step 1: Delete usage reports for empty archived sessions
DELETE FROM UsageReport
WHERE sessionId IN (
    SELECT s.id
    FROM Session s
    LEFT JOIN SessionMessage sm ON s.id = sm.sessionId
    WHERE s.active = 0
    GROUP BY s.id
    HAVING COUNT(sm.id) = 0
);

-- Step 2: Delete access keys for empty archived sessions
DELETE FROM AccessKey
WHERE sessionId IN (
    SELECT s.id
    FROM Session s
    LEFT JOIN SessionMessage sm ON s.id = sm.sessionId
    WHERE s.active = 0
    GROUP BY s.id
    HAVING COUNT(sm.id) = 0
);

-- Step 3: Delete the empty archived sessions themselves
DELETE FROM Session
WHERE id IN (
    SELECT s.id
    FROM Session s
    LEFT JOIN SessionMessage sm ON s.id = sm.sessionId
    WHERE s.active = 0
    GROUP BY s.id
    HAVING COUNT(sm.id) = 0
);

-- Verify result
SELECT 'Cleanup complete. Remaining empty archived sessions:' as status;
SELECT COUNT(*) as remaining_empty_sessions
FROM Session s
LEFT JOIN SessionMessage sm ON s.id = sm.sessionId
WHERE s.active = 0
GROUP BY s.id
HAVING COUNT(sm.id) = 0;
