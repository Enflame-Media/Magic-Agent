import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { authMiddleware, type AuthVariables } from '@/middleware/auth';
import { getDb } from '@/db/client';
import {
    FeedQuerySchema,
    FeedResponseSchema,
    UnauthorizedErrorSchema,
    BadRequestErrorSchema,
} from '@/schemas/feed';

/**
 * Environment bindings for feed routes
 */
interface Env {
    DB: D1Database;
}

/**
 * Feed routes module
 *
 * Implements activity feed endpoints:
 * - GET /v1/feed - Get user activity feed with cursor-based pagination
 *
 * The feed shows the user's own session/artifact activity (per HAP-14 Q2 decision).
 * Uses counter-based cursors for consistent pagination.
 *
 * All routes require authentication and use OpenAPI schemas for validation.
 */
const feedRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Apply auth middleware to feed routes
feedRoutes.use('/v1/feed', authMiddleware());

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse cursor string to extract counter value
 *
 * Cursor format: "cursor_{counter}" (e.g., "cursor_42")
 *
 * @param cursor - Cursor string
 * @returns Counter number or null if invalid
 */
function parseCursor(cursor: string): number | null {
    if (!cursor.startsWith('cursor_')) {
        return null;
    }
    const counter = parseInt(cursor.substring(7), 10);
    return isNaN(counter) ? null : counter;
}

/**
 * Build cursor string from counter value
 *
 * @param counter - Counter number
 * @returns Cursor string
 */
function buildCursor(counter: number): string {
    return `cursor_${counter}`;
}

// ============================================================================
// GET /v1/feed - Get Activity Feed
// ============================================================================

const getFeedRoute = createRoute({
    method: 'get',
    path: '/v1/feed',
    request: {
        query: FeedQuerySchema,
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: FeedResponseSchema,
                },
            },
            description: 'User activity feed with pagination',
        },
        400: {
            content: {
                'application/json': {
                    schema: BadRequestErrorSchema,
                },
            },
            description: 'Invalid cursor format',
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
    tags: ['Feed'],
    summary: 'Get activity feed',
    description: 'Get user activity feed with cursor-based pagination. Use "before" cursor to get older items, "after" for newer items.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
feedRoutes.openapi(getFeedRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { before, after, limit = 50 } = c.req.valid('query');
    const db = getDb(c.env.DB);

    // Parse cursors
    let beforeCounter: number | null = null;
    let afterCounter: number | null = null;

    if (before) {
        beforeCounter = parseCursor(before);
        if (beforeCounter === null) {
            return c.json({ error: 'Invalid cursor format' }, 400);
        }
    }

    if (after) {
        afterCounter = parseCursor(after);
        if (afterCounter === null) {
            return c.json({ error: 'Invalid cursor format' }, 400);
        }
    }

    // Build query conditions
    // Default: Get most recent items (descending by counter)
    // With 'before': Get items with counter < beforeCounter (older items)
    // With 'after': Get items with counter > afterCounter (newer items)

    let items: Array<{
        id: string;
        counter: number;
        repeatKey: string | null;
        body: unknown;
        createdAt: Date;
    }>;

    if (afterCounter !== null) {
        // Get newer items (ascending order, then reverse for consistent newest-first output)
        items = await db.query.userFeedItems.findMany({
            where: (feed, { eq, and, gt }) =>
                and(eq(feed.userId, userId), gt(feed.counter, afterCounter)),
            orderBy: (feed, { asc }) => [asc(feed.counter)],
            limit: limit + 1, // +1 to check for more
        });
        // Reverse to get newest first
        items.reverse();
    } else if (beforeCounter !== null) {
        // Get older items (descending order)
        items = await db.query.userFeedItems.findMany({
            where: (feed, { eq, and, lt }) =>
                and(eq(feed.userId, userId), lt(feed.counter, beforeCounter)),
            orderBy: (feed, { desc }) => [desc(feed.counter)],
            limit: limit + 1, // +1 to check for more
        });
    } else {
        // Default: Get most recent items
        items = await db.query.userFeedItems.findMany({
            where: (feed, { eq }) => eq(feed.userId, userId),
            orderBy: (feed, { desc }) => [desc(feed.counter)],
            limit: limit + 1, // +1 to check for more
        });
    }

    // Check if there are more items
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Transform to response format
    const feedItems = resultItems.map((item) => ({
        id: item.id,
        body: item.body as { type: string; [key: string]: unknown },
        repeatKey: item.repeatKey,
        cursor: buildCursor(item.counter),
        createdAt: item.createdAt.getTime(),
    }));

    return c.json({
        items: feedItems,
        hasMore,
    });
});

export default feedRoutes;
