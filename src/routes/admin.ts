import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
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

    // Audit log (console for MVP, TODO: persistent audit log table)
    console.log(
        `[Admin Audit] User ${currentUser?.email} changed role of ${targetUser.email} (${id}) from "${targetUser.role ?? 'null'}" to "${role}"`
    );

    return c.json({
        success: true,
        userId: id,
        previousRole: targetUser.role,
        newRole: role,
    });
});
