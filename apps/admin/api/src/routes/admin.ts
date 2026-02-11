import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, isNull, sql } from 'drizzle-orm';
import type { Env, Variables } from '../env';
import * as schema from '../db/schema';

/**
 * Admin User Management API Routes
 *
 * Custom endpoints for admin-only operations that extend Better-Auth's
 * built-in admin functionality. These routes provide:
 * - User listing with search and pagination
 * - Role management with self-protection guard
 * - User updates with audit logging (console for MVP)
 *
 * All endpoints require admin authentication via adminAuthMiddleware
 * applied in the main index.ts file.
 *
 * @see HAP-639 Admin User Management API & Dashboard UI
 */
export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * User type for API responses
 */
interface AdminUserResponse {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string | null;
    banned: boolean;
    banReason: string | null;
    banExpires: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users - List all users with pagination
// ─────────────────────────────────────────────────────────────

/**
 * List all users with filtering and pagination
 *
 * Query params:
 * - limit: Max users to return (1-100, default: 50)
 * - offset: Number to skip (default: 0)
 * - search: Filter by email/name (partial match)
 * - role: Filter by role ('admin' | 'user')
 */
adminRoutes.get('/users', async (c) => {
    const url = new URL(c.req.url);
    const limitParam = url.searchParams.get('limit') ?? '50';
    const offsetParam = url.searchParams.get('offset') ?? '0';
    const search = url.searchParams.get('search') ?? undefined;
    const role = url.searchParams.get('role') as 'admin' | 'user' | undefined;

    // Validate and parse numeric parameters
    const limitNum = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offsetParam, 10) || 0, 0);

    const db = drizzle(c.env.DB, { schema });

    // Build query - D1 doesn't support complex WHERE building, so we'll do basic filtering
    // For now, fetch all and filter in memory (acceptable for small user counts in admin dashboard)
    const allUsers = await db
        .select()
        .from(schema.users)
        .orderBy(schema.users.createdAt);

    // Apply filters
    let filteredUsers = allUsers;

    if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(
            (u) =>
                u.email.toLowerCase().includes(searchLower) ||
                u.name.toLowerCase().includes(searchLower)
        );
    }

    if (role) {
        filteredUsers = filteredUsers.filter((u) => u.role === role);
    }

    const total = filteredUsers.length;

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(offsetNum, offsetNum + limitNum);

    // Transform to API response format
    const users: AdminUserResponse[] = paginatedUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: u.emailVerified,
        image: u.image,
        role: u.role,
        banned: u.banned ?? false,
        banReason: u.banReason,
        banExpires: u.banExpires ? u.banExpires.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
    }));

    return c.json({
        users,
        total,
        limit: limitNum,
        offset: offsetNum,
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users/:id - Get single user details
// ─────────────────────────────────────────────────────────────

/**
 * Get details for a single user
 */
adminRoutes.get('/users/:id', async (c) => {
    const id = c.req.param('id');

    const db = drizzle(c.env.DB, { schema });

    const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .get();

    if (!user) {
        return c.json(
            {
                error: 'Not Found',
                message: 'User not found',
            },
            404
        );
    }

    const userResponse: AdminUserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        banned: user.banned ?? false,
        banReason: user.banReason,
        banExpires: user.banExpires ? user.banExpires.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };

    return c.json({
        user: userResponse,
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/users/:id/role - Update user role
// ─────────────────────────────────────────────────────────────

/**
 * Update a user's role
 *
 * SECURITY: Admins cannot modify their own role (self-demotion prevention)
 *
 * Body: { role: 'admin' | 'user' }
 */
adminRoutes.post('/users/:id/role', async (c) => {
    const id = c.req.param('id');
    const currentUser = c.get('user');

    // Parse request body
    let body: { role?: string };
    try {
        body = await c.req.json();
    } catch {
        return c.json(
            {
                error: 'Bad Request',
                message: 'Invalid JSON body',
            },
            400
        );
    }

    const role = body.role;

    // Validate role
    if (!role || (role !== 'admin' && role !== 'user')) {
        return c.json(
            {
                error: 'Bad Request',
                message: "Role must be 'admin' or 'user'",
            },
            400
        );
    }

    // SECURITY: Prevent self-demotion/modification
    if (currentUser?.id === id) {
        console.warn(`[Admin] Self-role-modification blocked for user ${currentUser.email}`);
        return c.json(
            {
                error: 'Forbidden',
                message: 'Cannot modify your own role',
            },
            400
        );
    }

    const db = drizzle(c.env.DB, { schema });

    // Verify target user exists
    const targetUser = await db
        .select({ id: schema.users.id, role: schema.users.role, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .get();

    if (!targetUser) {
        return c.json(
            {
                error: 'Not Found',
                message: 'User not found',
            },
            404
        );
    }

    // Update role
    await db
        .update(schema.users)
        .set({ role, updatedAt: new Date() })
        .where(eq(schema.users.id, id));

    // Persist audit log record (HAP-804)
    const auditId = crypto.randomUUID();
    const requestId = c.get('requestId');
    const ipAddress = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? null;
    const userAgent = c.req.header('User-Agent') ?? null;

    await db.insert(schema.adminAuditLogs).values({
        id: auditId,
        action: 'role_change',
        actorId: currentUser?.id ?? 'unknown',
        actorEmail: currentUser?.email ?? 'unknown',
        targetId: id,
        targetEmail: targetUser.email,
        previousValue: targetUser.role ?? null,
        newValue: role,
        metadata: {
            ipAddress,
            userAgent,
            requestId,
        },
    });

    // Console log retained for observability (non-blocking)
    console.log(
        `[Admin Audit] User ${currentUser?.email} changed role of ${targetUser.email} (${id}) from "${targetUser.role ?? 'null'}" to "${role}" [audit:${auditId}]`
    );

    return c.json({
        success: true,
        userId: id,
        previousRole: targetUser.role,
        newRole: role,
    });
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/sessions/bulk-archive-delete - Archive and delete all sessions
// ─────────────────────────────────────────────────────────────

/**
 * Bulk archive and delete all app sessions
 *
 * This is a DESTRUCTIVE operation that:
 * 1. Archives all non-archived sessions (sets archivedAt, archiveReason)
 * 2. Deletes all session messages
 * 3. Deletes all access keys referencing sessions
 * 4. Clears session references from usage reports
 * 5. Deletes all sessions
 *
 * Body (optional):
 * - dryRun: boolean (default: false) - If true, only counts what would be deleted
 * - archiveReason: string (default: 'admin_bulk_delete') - Reason for archival
 *
 * SECURITY: Requires admin role via adminAuthMiddleware
 */
adminRoutes.post('/sessions/bulk-archive-delete', async (c) => {
    const currentUser = c.get('user');

    // Parse request body
    let body: { dryRun?: boolean; archiveReason?: string } = {};
    try {
        const rawBody = await c.req.text();
        if (rawBody) {
            body = JSON.parse(rawBody);
        }
    } catch {
        return c.json(
            {
                error: 'Bad Request',
                message: 'Invalid JSON body',
            },
            400
        );
    }

    const dryRun = body.dryRun ?? false;
    const archiveReason = body.archiveReason ?? 'admin_bulk_delete';
    const now = Date.now();

    const db = drizzle(c.env.DB, { schema });

    // Count sessions
    const allSessions = await db
        .select({
            id: schema.appSessions.id,
            accountId: schema.appSessions.accountId,
            archivedAt: schema.appSessions.archivedAt,
        })
        .from(schema.appSessions);

    const sessionIds = allSessions.map((s) => s.id);
    const unarchivedCount = allSessions.filter((s) => !s.archivedAt).length;
    const alreadyArchivedCount = allSessions.filter((s) => s.archivedAt).length;

    // Count related records
    const messageCount = sessionIds.length > 0
        ? (await db.select({ count: sql<number>`count(*)` }).from(schema.sessionMessages))[0]?.count ?? 0
        : 0;

    const accessKeyCount = sessionIds.length > 0
        ? (await db.select({ count: sql<number>`count(*)` }).from(schema.accessKeys))[0]?.count ?? 0
        : 0;

    const usageReportCount = sessionIds.length > 0
        ? (await db.select({ count: sql<number>`count(*)` }).from(schema.usageReports).where(sql`sessionId IS NOT NULL`))[0]?.count ?? 0
        : 0;

    const stats = {
        sessionsToArchive: unarchivedCount,
        sessionsAlreadyArchived: alreadyArchivedCount,
        totalSessions: allSessions.length,
        messagesToDelete: messageCount,
        accessKeysToDelete: accessKeyCount,
        usageReportsToUpdate: usageReportCount,
    };

    // If dry run, return stats only
    if (dryRun) {
        console.log(
            `[Admin Audit] DRY RUN - User ${currentUser?.email} requested bulk session archive+delete. Stats: ${JSON.stringify(stats)}`
        );

        return c.json({
            success: true,
            dryRun: true,
            stats,
            message: 'Dry run completed. No changes made.',
            timestamp: new Date().toISOString(),
        });
    }

    // Perform the actual deletion
    console.log(
        `[Admin Audit] User ${currentUser?.email} initiating bulk session archive+delete. Stats: ${JSON.stringify(stats)}`
    );

    try {
        // Step 1: Archive all unarchived sessions
        if (unarchivedCount > 0) {
            await db
                .update(schema.appSessions)
                .set({
                    archivedAt: new Date(now),
                    archiveReason: archiveReason,
                    active: false,
                    updatedAt: new Date(now),
                })
                .where(isNull(schema.appSessions.archivedAt));
        }

        // Step 2: Delete all session messages
        if (messageCount > 0) {
            await db.delete(schema.sessionMessages);
        }

        // Step 3: Delete all access keys
        if (accessKeyCount > 0) {
            await db.delete(schema.accessKeys);
        }

        // Step 4: Clear session references from usage reports (set sessionId to null)
        if (usageReportCount > 0) {
            await db
                .update(schema.usageReports)
                .set({ sessionId: null })
                .where(sql`sessionId IS NOT NULL`);
        }

        // Step 5: Delete all sessions
        if (allSessions.length > 0) {
            await db.delete(schema.appSessions);
        }

        console.log(
            `[Admin Audit] User ${currentUser?.email} completed bulk session archive+delete. Deleted ${allSessions.length} sessions.`
        );

        return c.json({
            success: true,
            dryRun: false,
            stats: {
                ...stats,
                sessionsArchived: unarchivedCount,
                sessionsDeleted: allSessions.length,
                messagesDeleted: messageCount,
                accessKeysDeleted: accessKeyCount,
                usageReportsUpdated: usageReportCount,
            },
            message: `Successfully archived and deleted ${allSessions.length} sessions.`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error(
            `[Admin Audit] User ${currentUser?.email} bulk session archive+delete FAILED:`,
            error
        );

        return c.json(
            {
                error: 'Internal Server Error',
                message: 'Failed to complete bulk archive+delete operation',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/sessions/stats - Get session statistics
// ─────────────────────────────────────────────────────────────

/**
 * Get statistics about app sessions
 *
 * Returns counts of:
 * - Total sessions
 * - Active sessions
 * - Archived sessions
 * - Sessions with agent state
 * - Related records (messages, access keys, usage reports)
 */
adminRoutes.get('/sessions/stats', async (c) => {
    const db = drizzle(c.env.DB, { schema });

    // Get session counts
    const allSessions = await db
        .select({
            id: schema.appSessions.id,
            active: schema.appSessions.active,
            archivedAt: schema.appSessions.archivedAt,
            agentState: schema.appSessions.agentState,
        })
        .from(schema.appSessions);

    const totalSessions = allSessions.length;
    const activeSessions = allSessions.filter((s) => s.active).length;
    const archivedSessions = allSessions.filter((s) => s.archivedAt).length;
    const sessionsWithAgentState = allSessions.filter((s) => s.agentState).length;

    // Get related record counts
    const messageCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.sessionMessages))[0]?.count ?? 0;
    const accessKeyCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.accessKeys))[0]?.count ?? 0;
    const usageReportCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.usageReports).where(sql`sessionId IS NOT NULL`))[0]?.count ?? 0;

    return c.json({
        sessions: {
            total: totalSessions,
            active: activeSessions,
            archived: archivedSessions,
            withAgentState: sessionsWithAgentState,
        },
        relatedRecords: {
            messages: messageCount,
            accessKeys: accessKeyCount,
            usageReports: usageReportCount,
        },
        timestamp: new Date().toISOString(),
    });
});
