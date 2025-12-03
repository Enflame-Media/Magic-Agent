/**
 * WebSocket Routes for Happy Server Workers
 *
 * Handles WebSocket upgrade requests and routes them to the appropriate
 * ConnectionManager Durable Object based on the authenticated user.
 *
 * The WebSocket endpoint follows the same path as the original Socket.io
 * implementation (/v1/updates) for client compatibility.
 *
 * @module routes/websocket
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { verifyToken, initAuth } from '@/lib/auth';

/**
 * Environment interface with Durable Object bindings
 */
interface Env {
    /** Durable Object namespace for ConnectionManager */
    CONNECTION_MANAGER: DurableObjectNamespace;

    /** Master secret for auth token verification */
    HANDY_MASTER_SECRET: string;

    /** Current environment */
    ENVIRONMENT?: 'development' | 'staging' | 'production';
}

/**
 * Create WebSocket routes
 */
const websocketRoutes = new OpenAPIHono<{ Bindings: Env }>();

/**
 * WebSocket upgrade endpoint
 *
 * Authenticates the request and forwards to the user's ConnectionManager DO.
 * The DO handles the actual WebSocket connection lifecycle.
 *
 * Client authentication options:
 * 1. Query parameter: ?token=xxx&clientType=user-scoped
 * 2. Headers: Authorization: Bearer xxx, X-Client-Type: user-scoped
 *
 * @route GET /v1/updates
 * @route GET /v1/websocket
 */
websocketRoutes.get('/v1/updates', async (c) => {
    return handleWebSocketUpgrade(c);
});

websocketRoutes.get('/v1/websocket', async (c) => {
    return handleWebSocketUpgrade(c);
});

/**
 * Handle WebSocket upgrade request
 *
 * 1. Verify the upgrade header
 * 2. Extract and validate auth token
 * 3. Get or create the user's ConnectionManager DO
 * 4. Forward the upgrade request to the DO
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleWebSocketUpgrade(c: any): Promise<Response> {
    const request = c.req.raw;

    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', {
            status: 426,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // Extract token from query params or headers
    const url = new URL(request.url);
    let token = url.searchParams.get('token');

    if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) {
        return new Response('Missing authentication token', {
            status: 401,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // Verify token to get userId
    if (c.env.HANDY_MASTER_SECRET) {
        await initAuth(c.env.HANDY_MASTER_SECRET);
    }

    const verified = await verifyToken(token);
    if (!verified) {
        return new Response('Invalid authentication token', {
            status: 401,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    // Get the ConnectionManager DO for this user
    // Using userId as the DO ID ensures one DO per user
    const doId = c.env.CONNECTION_MANAGER.idFromName(verified.userId);
    const stub = c.env.CONNECTION_MANAGER.get(doId);

    // Forward the request to the DO
    // The DO will handle the WebSocket upgrade and connection management
    const doUrl = new URL(request.url);
    doUrl.pathname = '/websocket';

    return stub.fetch(
        new Request(doUrl.toString(), {
            method: request.method,
            headers: request.headers,
        })
    );
}

/**
 * WebSocket stats endpoint (for monitoring)
 *
 * Returns connection statistics for a specific user.
 * Requires authentication.
 *
 * @route GET /v1/websocket/stats
 */
const statsRoute = createRoute({
    method: 'get',
    path: '/v1/websocket/stats',
    tags: ['WebSocket'],
    summary: 'Get WebSocket connection statistics',
    description: 'Returns connection statistics for the authenticated user',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Connection statistics',
            content: {
                'application/json': {
                    schema: z.object({
                        totalConnections: z.number(),
                        byType: z.object({
                            'user-scoped': z.number(),
                            'session-scoped': z.number(),
                            'machine-scoped': z.number(),
                        }),
                        activeSessions: z.number(),
                        activeMachines: z.number(),
                        oldestConnection: z.number().nullable(),
                    }),
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.string(),
                    }),
                },
            },
        },
    },
});

websocketRoutes.openapi(statsRoute, async (c) => {
    // Extract and verify token
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing authorization header' } as const, 401);
    }

    const token = authHeader.slice(7);
    if (c.env.HANDY_MASTER_SECRET) {
        await initAuth(c.env.HANDY_MASTER_SECRET);
    }

    const verified = await verifyToken(token);
    if (!verified) {
        return c.json({ error: 'Invalid token' } as const, 401);
    }

    // Get stats from the user's ConnectionManager DO
    const doId = c.env.CONNECTION_MANAGER.idFromName(verified.userId);
    const stub = c.env.CONNECTION_MANAGER.get(doId);

    const response = await stub.fetch(new Request('https://do/stats'));
    const stats = (await response.json()) as {
        totalConnections: number;
        byType: {
            'user-scoped': number;
            'session-scoped': number;
            'machine-scoped': number;
        };
        activeSessions: number;
        activeMachines: number;
        oldestConnection: number | null;
    };

    return c.json(stats, 200);
});

/**
 * Broadcast message to user's connections (internal use)
 *
 * Allows other Workers to send messages to a user's WebSocket connections.
 * This is used for real-time updates when data changes.
 *
 * @route POST /v1/websocket/broadcast
 */
const broadcastRoute = createRoute({
    method: 'post',
    path: '/v1/websocket/broadcast',
    tags: ['WebSocket'],
    summary: 'Broadcast message to user connections',
    description: 'Send a message to all or filtered WebSocket connections for a user',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.object({
                        message: z.object({
                            type: z.string(),
                            payload: z.unknown().optional(),
                            timestamp: z.number(),
                        }),
                        filter: z
                            .object({
                                type: z.enum(['all', 'user-scoped-only', 'session', 'machine', 'exclude']),
                                sessionId: z.string().optional(),
                                machineId: z.string().optional(),
                                connectionId: z.string().optional(),
                            })
                            .optional(),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Broadcast result',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean(),
                        delivered: z.number(),
                    }),
                },
            },
        },
        401: {
            description: 'Unauthorized',
            content: {
                'application/json': {
                    schema: z.object({
                        error: z.string(),
                    }),
                },
            },
        },
    },
});

websocketRoutes.openapi(broadcastRoute, async (c) => {
    // Extract and verify token
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Missing authorization header' } as const, 401);
    }

    const token = authHeader.slice(7);
    if (c.env.HANDY_MASTER_SECRET) {
        await initAuth(c.env.HANDY_MASTER_SECRET);
    }

    const verified = await verifyToken(token);
    if (!verified) {
        return c.json({ error: 'Invalid token' } as const, 401);
    }

    const body = c.req.valid('json');

    // Forward to the user's ConnectionManager DO
    const doId = c.env.CONNECTION_MANAGER.idFromName(verified.userId);
    const stub = c.env.CONNECTION_MANAGER.get(doId);

    const response = await stub.fetch(
        new Request('https://do/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    );

    const result = (await response.json()) as { success: boolean; delivered: number };
    return c.json(result, 200);
});

export default websocketRoutes;
