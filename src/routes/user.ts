import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { authMiddleware, type AuthVariables } from '@/middleware/auth';
import { getDb } from '@/db/client';
import {
    UserSearchQuerySchema,
    UserSearchResponseSchema,
    UserIdParamSchema,
    GetUserResponseSchema,
    UnauthorizedErrorSchema,
    NotFoundErrorSchema,
    BadRequestErrorSchema,
    type RelationshipStatusSchema,
} from '@/schemas/user';
import { z } from '@hono/zod-openapi';

/**
 * Environment bindings for user routes
 */
interface Env {
    DB: D1Database;
}

/**
 * Type for relationship status values
 */
type RelationshipStatus = z.infer<typeof RelationshipStatusSchema>;

/**
 * User routes module
 *
 * Implements user discovery and profile endpoints:
 * - GET /v1/users/search - Search users by username (prefix match, case-insensitive)
 * - GET /v1/users/:id - Get user profile by ID with relationship status
 *
 * All routes require authentication and use OpenAPI schemas for validation.
 *
 * Note: Friend management routes (add/remove/list) are deferred to post-MVP
 * per issue HAP-14 Q1 decision.
 */
const userRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Apply auth middleware to all user routes
userRoutes.use('/v1/users/*', authMiddleware());

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get relationship status between two users
 *
 * @param db - Database instance
 * @param fromUserId - Current user ID
 * @param toUserId - Target user ID
 * @returns Relationship status or 'none' if no relationship exists
 */
async function getRelationshipStatus(
    db: ReturnType<typeof getDb>,
    fromUserId: string,
    toUserId: string
): Promise<RelationshipStatus> {
    const relationship = await db.query.userRelationships.findFirst({
        where: (rels, { eq, and }) =>
            and(eq(rels.fromUserId, fromUserId), eq(rels.toUserId, toUserId)),
    });

    return (relationship?.status as RelationshipStatus) ?? 'none';
}

/**
 * Build user profile object with relationship status
 *
 * @param user - User account record
 * @param status - Relationship status with current user
 * @returns User profile object for API response
 */
function buildUserProfile(
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        username: string | null;
    },
    status: RelationshipStatus
) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        status,
    };
}

// ============================================================================
// GET /v1/users/search - Search Users
// ============================================================================

const searchUsersRoute = createRoute({
    method: 'get',
    path: '/v1/users/search',
    request: {
        query: UserSearchQuerySchema,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: UserSearchResponseSchema,
                },
            },
            description: 'List of matching users',
        },
        400: {
            content: {
                'application/json': {
                    schema: BadRequestErrorSchema,
                },
            },
            description: 'Invalid query parameter',
        },
        401: {
            content: {
                'application/json': {
                    schema: UnauthorizedErrorSchema,
                },
            },
            description: 'Unauthorized',
        },
    },
    tags: ['Users'],
    summary: 'Search users by username',
    description: 'Search for users by username prefix (case-insensitive). Returns up to 10 matching users with relationship status.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
userRoutes.openapi(searchUsersRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { query, limit = 10 } = c.req.valid('query');
    const db = getDb(c.env.DB);

    // Search for users by username prefix (case-insensitive)
    // SQLite LIKE is case-insensitive for ASCII characters by default
    const users = await db.query.accounts.findMany({
        where: (accounts, { like, ne, and, isNotNull }) =>
            and(
                like(accounts.username, `${query}%`),
                ne(accounts.id, userId), // Exclude self from search results
                isNotNull(accounts.username) // Only users with usernames
            ),
        columns: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
        },
        limit,
        orderBy: (accounts, { asc }) => [asc(accounts.username)],
    });

    // Build user profiles with relationship status
    const userProfiles = await Promise.all(
        users.map(async (user) => {
            const status = await getRelationshipStatus(db, userId, user.id);
            return buildUserProfile(user, status);
        })
    );

    return c.json({
        users: userProfiles,
    });
});

// ============================================================================
// GET /v1/users/:id - Get User Profile
// ============================================================================

const getUserRoute = createRoute({
    method: 'get',
    path: '/v1/users/:id',
    request: {
        params: UserIdParamSchema,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: GetUserResponseSchema,
                },
            },
            description: 'User profile',
        },
        404: {
            content: {
                'application/json': {
                    schema: NotFoundErrorSchema,
                },
            },
            description: 'User not found',
        },
        401: {
            content: {
                'application/json': {
                    schema: UnauthorizedErrorSchema,
                },
            },
            description: 'Unauthorized',
        },
    },
    tags: ['Users'],
    summary: 'Get user profile by ID',
    description: 'Get a user profile by their ID, including the relationship status with the current user.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
userRoutes.openapi(getUserRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id } = c.req.valid('param');
    const db = getDb(c.env.DB);

    // Fetch user
    const user = await db.query.accounts.findFirst({
        where: (accounts, { eq }) => eq(accounts.id, id),
        columns: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
        },
    });

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    // Get relationship status
    const status = await getRelationshipStatus(db, userId, id);

    return c.json({
        user: buildUserProfile(user, status),
    });
});

export default userRoutes;
