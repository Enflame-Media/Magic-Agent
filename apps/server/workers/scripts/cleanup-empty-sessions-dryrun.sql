-- Cleanup Empty Archived Sessions - DRY RUN
--
-- This SQL script shows what empty archived sessions would be deleted.
-- Run this first to preview before running the actual cleanup script.
--
-- Usage:
--   # Development
--   npx wrangler d1 execute happy-dev --remote --file=scripts/cleanup-empty-sessions-dryrun.sql --env=dev
--
--   # Production
--   npx wrangler d1 execute happy-prod --remote --file=scripts/cleanup-empty-sessions-dryrun.sql --env=prod
--
-- @see HAP-xxx - Empty archived sessions cleanup

-- Summary count
SELECT 'Empty archived sessions that would be deleted:' as status;

SELECT COUNT(*) as total_empty_sessions
FROM Session s
LEFT JOIN SessionMessage sm ON s.id = sm.sessionId
WHERE s.active = 0
GROUP BY s.id
HAVING COUNT(sm.id) = 0;

-- Detailed list with related data counts
SELECT
    s.id as session_id,
    s.accountId as account_id,
    s.tag,
    s.createdAt,
    s.updatedAt,
    datetime(s.createdAt / 1000, 'unixepoch') as created_at_readable,
    (julianday('now') - julianday(datetime(s.createdAt / 1000, 'unixepoch'))) as age_days,
    (SELECT COUNT(*) FROM UsageReport WHERE sessionId = s.id) as usage_reports,
    (SELECT COUNT(*) FROM AccessKey WHERE sessionId = s.id) as access_keys
FROM Session s
LEFT JOIN SessionMessage sm ON s.id = sm.sessionId
WHERE s.active = 0
GROUP BY s.id
HAVING COUNT(sm.id) = 0
ORDER BY s.createdAt DESC
LIMIT 100;
