import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { authMiddleware, type AuthVariables } from '@/middleware/auth';
import { getDb } from '@/db/client';
import { schema } from '@/db/schema';
import { createId } from '@/utils/id';
import { eq, and } from 'drizzle-orm';
import {
    SessionIdParamSchema,
    ShareIdParamSchema,
    InvitationIdParamSchema,
    ShareTokenParamSchema,
    InvitationTokenParamSchema,
    AddShareRequestSchema,
    UpdateShareRequestSchema,
    UpdateUrlSharingRequestSchema,
    SendInvitationRequestSchema,
    AccessSharedSessionRequestSchema,
    GetSharingSettingsResponseSchema,
    AddShareResponseSchema,
    UpdateShareResponseSchema,
    DeleteShareResponseSchema,
    UpdateUrlSharingResponseSchema,
    AccessSharedSessionResponseSchema,
    SendInvitationResponseSchema,
    AcceptInvitationResponseSchema,
    RevokeInvitationResponseSchema,
    UnauthorizedErrorSchema,
    NotFoundErrorSchema,
    ForbiddenErrorSchema,
    BadRequestErrorSchema,
    ConflictErrorSchema,
    RateLimitErrorSchema,
    PasswordRequiredErrorSchema,
} from '@/schemas/sharing';

/**
 * Environment bindings for sharing routes
 */
interface Env {
    DB: D1Database;
    RATE_LIMIT_KV?: KVNamespace;
}

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
    /** Maximum invitations per user per hour */
    MAX_INVITATIONS_PER_HOUR: 10,
    /** Rate limit window in seconds */
    WINDOW_SECONDS: 3600,
};

/**
 * Invitation expiration configuration
 */
const INVITATION_EXPIRY_DAYS = 7;

/**
 * Session Sharing routes module (HAP-772)
 *
 * Implements all session sharing endpoints:
 * - GET /v1/sessions/:id/sharing - Get sharing settings
 * - POST /v1/sessions/:id/sharing - Add a share
 * - PATCH /v1/sessions/:id/sharing/:shareId - Update share permission
 * - DELETE /v1/sessions/:id/sharing/:shareId - Remove a share
 * - PUT /v1/sessions/:id/sharing/url - Configure URL sharing
 * - GET /v1/sessions/shared/:token - Access session via share URL
 * - POST /v1/sessions/:id/sharing/invite - Send email invitation
 * - GET /v1/invitations/:token/accept - Accept invitation
 * - DELETE /v1/sessions/:id/sharing/invitations/:invitationId - Revoke invitation
 *
 * All routes use OpenAPI schemas for automatic documentation and validation.
 */
const sharingRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Apply auth middleware to protected routes
sharingRoutes.use('/v1/sessions/:id/sharing', authMiddleware());
sharingRoutes.use('/v1/sessions/:id/sharing/*', authMiddleware());
sharingRoutes.use('/v1/invitations/:token/accept', authMiddleware());

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify that the current user owns the session
 */
async function verifySessionOwnership(
    db: ReturnType<typeof getDb>,
    sessionId: string,
    userId: string
): Promise<{ error?: string; session?: typeof schema.sessions.$inferSelect }> {
    const session = await db.query.sessions.findFirst({
        where: (sessions, { eq, and }) =>
            and(eq(sessions.id, sessionId), eq(sessions.accountId, userId)),
    });

    if (!session) {
        return { error: 'Session not found or you do not have permission' };
    }

    return { session };
}

/**
 * Check rate limit for invitations
 */
async function checkInvitationRateLimit(
    kv: KVNamespace | undefined,
    userId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!kv) {
        // Rate limiting not configured, allow all
        return { allowed: true };
    }

    const key = `invite_rate:${userId}`;
    const current = await kv.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= RATE_LIMIT.MAX_INVITATIONS_PER_HOUR) {
        // Rate limit exceeded, return default retry-after
        // KV doesn't expose TTL, so we use the window duration
        return { allowed: false, retryAfter: RATE_LIMIT.WINDOW_SECONDS };
    }

    // Increment counter
    await kv.put(key, String(count + 1), {
        expirationTtl: RATE_LIMIT.WINDOW_SECONDS,
    });

    return { allowed: true };
}

/**
 * Hash a password using Web Crypto API (bcrypt alternative for Workers)
 * Uses PBKDF2 with SHA-256
 */
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    // Encode salt and hash as base64
    const saltBase64 = btoa(String.fromCharCode(...salt));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));

    return `$pbkdf2$${saltBase64}$${hashBase64}`;
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!hash.startsWith('$pbkdf2$')) {
        return false;
    }

    const parts = hash.split('$');
    if (parts.length !== 4) {
        return false;
    }

    const saltBase64 = parts[2];
    const expectedHashBase64 = parts[3];

    if (!saltBase64) {
        return false;
    }

    const salt = new Uint8Array(
        atob(saltBase64)
            .split('')
            .map((c) => c.charCodeAt(0))
    );

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        256
    );

    const actualHashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));

    return actualHashBase64 === expectedHashBase64;
}

// ============================================================================
// GET /v1/sessions/:id/sharing - Get Sharing Settings
// ============================================================================

const getSharingSettingsRoute = createRoute({
    method: 'get',
    path: '/v1/sessions/{id}/sharing',
    request: {
        params: SessionIdParamSchema,
    },
    responses: {
        200: {
            content: { 'application/json': { schema: GetSharingSettingsResponseSchema } },
            description: 'Sharing settings for the session',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session not found',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Get sharing settings',
    description: 'Returns all sharing settings for a session including shares, URL config, and invitations.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(getSharingSettingsRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId } = c.req.valid('param');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Get shares
    const shares = await db
        .select()
        .from(schema.sessionShares)
        .where(eq(schema.sessionShares.sessionId, sessionId));

    // Get user profiles for shares
    const shareEntries = await Promise.all(
        shares.map(async (share) => {
            const user = await db.query.accounts.findFirst({
                where: (accounts, { eq }) => eq(accounts.id, share.userId),
            });
            return {
                id: share.id,
                userId: share.userId,
                userProfile: user
                    ? {
                          id: user.id,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          username: user.username,
                      }
                    : undefined,
                permission: share.permission,
                sharedAt: share.sharedAt.toISOString(),
                sharedBy: share.sharedBy,
            };
        })
    );

    // Get URL sharing config
    const urlConfig = await db.query.sessionShareUrls.findFirst({
        where: (urls, { eq }) => eq(urls.sessionId, sessionId),
    });

    // Get pending invitations
    const invitations = await db
        .select()
        .from(schema.sessionShareInvitations)
        .where(
            and(
                eq(schema.sessionShareInvitations.sessionId, sessionId),
                eq(schema.sessionShareInvitations.status, 'pending')
            )
        );

    return c.json({
        sessionId,
        shares: shareEntries,
        urlSharing: urlConfig
            ? {
                  enabled: true,
                  token: urlConfig.token,
                  permission: urlConfig.permission,
                  expiresAt: urlConfig.expiresAt?.toISOString(),
              }
            : {
                  enabled: false,
                  permission: 'view_only' as const,
              },
        invitations: invitations.map((inv) => ({
            id: inv.id,
            email: inv.email,
            permission: inv.permission,
            invitedAt: inv.invitedAt.toISOString(),
            invitedBy: inv.invitedBy,
            status: inv.status,
            expiresAt: inv.expiresAt.toISOString(),
        })),
    });
});

// ============================================================================
// POST /v1/sessions/:id/sharing - Add Share
// ============================================================================

const addShareRoute = createRoute({
    method: 'post',
    path: '/v1/sessions/{id}/sharing',
    request: {
        params: SessionIdParamSchema,
        body: {
            content: { 'application/json': { schema: AddShareRequestSchema } },
            description: 'Share details (either userId or email required)',
        },
    },
    responses: {
        200: {
            content: { 'application/json': { schema: AddShareResponseSchema } },
            description: 'Share or invitation created successfully',
        },
        400: {
            content: { 'application/json': { schema: BadRequestErrorSchema } },
            description: 'Invalid request',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session or user not found',
        },
        409: {
            content: { 'application/json': { schema: ConflictErrorSchema } },
            description: 'User already has access',
        },
        429: {
            content: { 'application/json': { schema: RateLimitErrorSchema } },
            description: 'Rate limit exceeded',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Add a share',
    description: 'Share a session with a user (by userId) or send an email invitation.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(addShareRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId } = c.req.valid('param');
    const body = c.req.valid('json');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Handle share with existing user
    if (body.userId) {
        // Check if user exists
        const targetUser = await db.query.accounts.findFirst({
            where: (accounts, { eq }) => eq(accounts.id, body.userId!),
        });

        if (!targetUser) {
            return c.json({ error: 'User not found' }, 404);
        }

        // Check if already shared
        const existing = await db.query.sessionShares.findFirst({
            where: (shares, { eq, and }) =>
                and(eq(shares.sessionId, sessionId), eq(shares.userId, body.userId!)),
        });

        if (existing) {
            return c.json({ error: 'User already has access to this session' }, 409);
        }

        // Create share
        const share = {
            id: createId(),
            sessionId,
            userId: body.userId,
            permission: body.permission,
            sharedAt: new Date(),
            sharedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(schema.sessionShares).values(share);

        return c.json({
            success: true,
            share: {
                id: share.id,
                userId: share.userId,
                userProfile: {
                    id: targetUser.id,
                    firstName: targetUser.firstName,
                    lastName: targetUser.lastName,
                    username: targetUser.username,
                },
                permission: share.permission,
                sharedAt: share.sharedAt.toISOString(),
                sharedBy: share.sharedBy,
            },
        });
    }

    // Handle email invitation
    if (body.email) {
        // Check rate limit
        const rateLimit = await checkInvitationRateLimit(c.env.RATE_LIMIT_KV, userId);
        if (!rateLimit.allowed) {
            return c.json(
                {
                    error: `Rate limit exceeded. Maximum ${RATE_LIMIT.MAX_INVITATIONS_PER_HOUR} invitations per hour.`,
                    retryAfter: rateLimit.retryAfter,
                },
                429
            );
        }

        // Check if invitation already exists
        const existing = await db.query.sessionShareInvitations.findFirst({
            where: (invs, { eq, and }) =>
                and(
                    eq(invs.sessionId, sessionId),
                    eq(invs.email, body.email!),
                    eq(invs.status, 'pending')
                ),
        });

        if (existing) {
            return c.json({ error: 'Invitation already sent to this email' }, 409);
        }

        // Check if user with this email already has a share
        const existingUser = await db.query.accounts.findFirst({
            where: (accounts, { eq }) => eq(accounts.username, body.email!), // Assuming email lookup
        });

        if (existingUser) {
            const existingShare = await db.query.sessionShares.findFirst({
                where: (shares, { eq, and }) =>
                    and(eq(shares.sessionId, sessionId), eq(shares.userId, existingUser.id)),
            });

            if (existingShare) {
                return c.json({ error: 'User with this email already has access' }, 409);
            }
        }

        // Create invitation
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

        const invitation = {
            id: createId(),
            sessionId,
            email: body.email,
            permission: body.permission,
            token: crypto.randomUUID(),
            status: 'pending' as const,
            invitedAt: new Date(),
            invitedBy: userId,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(schema.sessionShareInvitations).values(invitation);

        // TODO: Send email (out of scope for HAP-772)

        return c.json({
            success: true,
            invitation: {
                id: invitation.id,
                email: invitation.email,
                permission: invitation.permission,
                invitedAt: invitation.invitedAt.toISOString(),
                invitedBy: invitation.invitedBy,
                status: invitation.status,
                expiresAt: invitation.expiresAt.toISOString(),
            },
        });
    }

    return c.json({ error: 'Either userId or email must be provided' }, 400);
});

// ============================================================================
// PATCH /v1/sessions/:id/sharing/:shareId - Update Share Permission
// ============================================================================

const updateShareRoute = createRoute({
    method: 'patch',
    path: '/v1/sessions/{id}/sharing/{shareId}',
    request: {
        params: ShareIdParamSchema,
        body: {
            content: { 'application/json': { schema: UpdateShareRequestSchema } },
            description: 'New permission level',
        },
    },
    responses: {
        200: {
            content: { 'application/json': { schema: UpdateShareResponseSchema } },
            description: 'Share updated successfully',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session or share not found',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Update share permission',
    description: 'Update the permission level for an existing share.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(updateShareRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId, shareId } = c.req.valid('param');
    const { permission } = c.req.valid('json');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Find and update share
    const share = await db.query.sessionShares.findFirst({
        where: (shares, { eq, and }) =>
            and(eq(shares.id, shareId), eq(shares.sessionId, sessionId)),
    });

    if (!share) {
        return c.json({ error: 'Share not found' }, 404);
    }

    await db
        .update(schema.sessionShares)
        .set({ permission, updatedAt: new Date() })
        .where(eq(schema.sessionShares.id, shareId));

    // Get user profile
    const user = await db.query.accounts.findFirst({
        where: (accounts, { eq }) => eq(accounts.id, share.userId),
    });

    return c.json({
        success: true,
        share: {
            id: share.id,
            userId: share.userId,
            userProfile: user
                ? {
                      id: user.id,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      username: user.username,
                  }
                : undefined,
            permission,
            sharedAt: share.sharedAt.toISOString(),
            sharedBy: share.sharedBy,
        },
    });
});

// ============================================================================
// DELETE /v1/sessions/:id/sharing/:shareId - Remove Share
// ============================================================================

const deleteShareRoute = createRoute({
    method: 'delete',
    path: '/v1/sessions/{id}/sharing/{shareId}',
    request: {
        params: ShareIdParamSchema,
    },
    responses: {
        200: {
            content: { 'application/json': { schema: DeleteShareResponseSchema } },
            description: 'Share removed successfully',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session or share not found',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Remove a share',
    description: 'Remove a user\'s access to the session.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(deleteShareRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId, shareId } = c.req.valid('param');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Delete share
    await db
        .delete(schema.sessionShares)
        .where(
            and(
                eq(schema.sessionShares.id, shareId),
                eq(schema.sessionShares.sessionId, sessionId)
            )
        );

    return c.json({ success: true });
});

// ============================================================================
// PUT /v1/sessions/:id/sharing/url - Configure URL Sharing
// ============================================================================

const updateUrlSharingRoute = createRoute({
    method: 'put',
    path: '/v1/sessions/{id}/sharing/url',
    request: {
        params: SessionIdParamSchema,
        body: {
            content: { 'application/json': { schema: UpdateUrlSharingRequestSchema } },
            description: 'URL sharing configuration',
        },
    },
    responses: {
        200: {
            content: { 'application/json': { schema: UpdateUrlSharingResponseSchema } },
            description: 'URL sharing updated successfully',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session not found',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Configure URL sharing',
    description: 'Enable, disable, or configure URL sharing for a session.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(updateUrlSharingRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId } = c.req.valid('param');
    const body = c.req.valid('json');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Get existing config
    const existing = await db.query.sessionShareUrls.findFirst({
        where: (urls, { eq }) => eq(urls.sessionId, sessionId),
    });

    if (!body.enabled) {
        // Disable URL sharing
        if (existing) {
            await db
                .delete(schema.sessionShareUrls)
                .where(eq(schema.sessionShareUrls.sessionId, sessionId));
        }
        return c.json({
            success: true,
            urlSharing: {
                enabled: false,
                permission: 'view_only' as const,
            },
        });
    }

    // Enable or update URL sharing
    const passwordHash =
        body.password === null
            ? null
            : body.password
              ? await hashPassword(body.password)
              : existing?.passwordHash ?? null;

    const permission = body.permission ?? existing?.permission ?? 'view_only';
    const token = existing?.token ?? crypto.randomUUID();

    if (existing) {
        await db
            .update(schema.sessionShareUrls)
            .set({
                passwordHash,
                permission,
                updatedAt: new Date(),
            })
            .where(eq(schema.sessionShareUrls.sessionId, sessionId));
    } else {
        await db.insert(schema.sessionShareUrls).values({
            sessionId,
            token,
            passwordHash,
            permission,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    return c.json({
        success: true,
        urlSharing: {
            enabled: true,
            token,
            permission,
        },
    });
});

// ============================================================================
// GET /v1/sessions/shared/:token - Access Session via Share URL
// ============================================================================

const accessSharedSessionRoute = createRoute({
    method: 'post',
    path: '/v1/sessions/shared/{token}',
    request: {
        params: ShareTokenParamSchema,
        body: {
            content: { 'application/json': { schema: AccessSharedSessionRequestSchema } },
            description: 'Password if required',
            required: false,
        },
    },
    responses: {
        200: {
            content: { 'application/json': { schema: AccessSharedSessionResponseSchema } },
            description: 'Session data',
        },
        401: {
            content: { 'application/json': { schema: PasswordRequiredErrorSchema } },
            description: 'Password required',
        },
        403: {
            content: { 'application/json': { schema: ForbiddenErrorSchema } },
            description: 'Invalid password',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Share not found or expired',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Access shared session',
    description: 'Access a session via a share URL token. No authentication required.',
});

// @ts-expect-error - OpenAPI handler type inference with mixed response types
sharingRoutes.openapi(accessSharedSessionRoute, async (c) => {
    const { token } = c.req.valid('param');
    const body = await c.req.json().catch(() => ({}));
    const db = getDb(c.env.DB);

    // Find share URL config
    const shareUrl = await db.query.sessionShareUrls.findFirst({
        where: (urls, { eq }) => eq(urls.token, token),
    });

    if (!shareUrl) {
        return c.json({ error: 'Share not found or expired' }, 404);
    }

    // Check expiration
    if (shareUrl.expiresAt && shareUrl.expiresAt < new Date()) {
        return c.json({ error: 'Share has expired' }, 404);
    }

    // Check password
    if (shareUrl.passwordHash) {
        if (!body.password) {
            return c.json({ error: 'Password required', passwordRequired: true }, 401);
        }

        const validPassword = await verifyPassword(body.password, shareUrl.passwordHash);
        if (!validPassword) {
            return c.json({ error: 'Invalid password' }, 403);
        }
    }

    // Get session
    const session = await db.query.sessions.findFirst({
        where: (sessions, { eq }) => eq(sessions.id, shareUrl.sessionId),
    });

    if (!session) {
        return c.json({ error: 'Session not found' }, 404);
    }

    return c.json({
        session: {
            id: session.id,
            metadata: session.metadata,
            permission: shareUrl.permission,
        },
    });
});

// ============================================================================
// POST /v1/sessions/:id/sharing/invite - Send Email Invitation
// ============================================================================

const sendInvitationRoute = createRoute({
    method: 'post',
    path: '/v1/sessions/{id}/sharing/invite',
    request: {
        params: SessionIdParamSchema,
        body: {
            content: { 'application/json': { schema: SendInvitationRequestSchema } },
            description: 'Invitation details',
        },
    },
    responses: {
        200: {
            content: { 'application/json': { schema: SendInvitationResponseSchema } },
            description: 'Invitation sent successfully',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session not found',
        },
        409: {
            content: { 'application/json': { schema: ConflictErrorSchema } },
            description: 'Invitation already exists',
        },
        429: {
            content: { 'application/json': { schema: RateLimitErrorSchema } },
            description: 'Rate limit exceeded',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Send email invitation',
    description: 'Send an email invitation to share a session with a non-user.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(sendInvitationRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId } = c.req.valid('param');
    const { email, permission } = c.req.valid('json');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Check rate limit
    const rateLimit = await checkInvitationRateLimit(c.env.RATE_LIMIT_KV, userId);
    if (!rateLimit.allowed) {
        return c.json(
            {
                error: `Rate limit exceeded. Maximum ${RATE_LIMIT.MAX_INVITATIONS_PER_HOUR} invitations per hour.`,
                retryAfter: rateLimit.retryAfter,
            },
            429
        );
    }

    // Check if invitation already exists
    const existing = await db.query.sessionShareInvitations.findFirst({
        where: (invs, { eq, and }) =>
            and(eq(invs.sessionId, sessionId), eq(invs.email, email), eq(invs.status, 'pending')),
    });

    if (existing) {
        return c.json({ error: 'Invitation already sent to this email' }, 409);
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = {
        id: createId(),
        sessionId,
        email,
        permission,
        token: crypto.randomUUID(),
        status: 'pending' as const,
        invitedAt: new Date(),
        invitedBy: userId,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(schema.sessionShareInvitations).values(invitation);

    // TODO: Send email (out of scope for HAP-772)

    return c.json({
        success: true,
        invitation: {
            id: invitation.id,
            email: invitation.email,
            permission: invitation.permission,
            invitedAt: invitation.invitedAt.toISOString(),
            invitedBy: invitation.invitedBy,
            status: invitation.status,
            expiresAt: invitation.expiresAt.toISOString(),
        },
    });
});

// ============================================================================
// GET /v1/invitations/:token/accept - Accept Invitation
// ============================================================================

const acceptInvitationRoute = createRoute({
    method: 'get',
    path: '/v1/invitations/{token}/accept',
    request: {
        params: InvitationTokenParamSchema,
    },
    responses: {
        200: {
            content: { 'application/json': { schema: AcceptInvitationResponseSchema } },
            description: 'Invitation accepted successfully',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Invitation not found or expired',
        },
        409: {
            content: { 'application/json': { schema: ConflictErrorSchema } },
            description: 'Already have access',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Accept invitation',
    description: 'Accept an email invitation and gain access to the shared session.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(acceptInvitationRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { token } = c.req.valid('param');
    const db = getDb(c.env.DB);

    // Find invitation
    const invitation = await db.query.sessionShareInvitations.findFirst({
        where: (invs, { eq, and }) => and(eq(invs.token, token), eq(invs.status, 'pending')),
    });

    if (!invitation) {
        return c.json({ error: 'Invitation not found or expired' }, 404);
    }

    // Check expiration
    if (invitation.expiresAt < new Date()) {
        // Mark as expired
        await db
            .update(schema.sessionShareInvitations)
            .set({ status: 'expired', updatedAt: new Date() })
            .where(eq(schema.sessionShareInvitations.id, invitation.id));
        return c.json({ error: 'Invitation has expired' }, 404);
    }

    // Check if already has access
    const existing = await db.query.sessionShares.findFirst({
        where: (shares, { eq, and }) =>
            and(eq(shares.sessionId, invitation.sessionId), eq(shares.userId, userId)),
    });

    if (existing) {
        return c.json({ error: 'You already have access to this session' }, 409);
    }

    // Create share
    const share = {
        id: createId(),
        sessionId: invitation.sessionId,
        userId,
        permission: invitation.permission,
        sharedAt: new Date(),
        sharedBy: invitation.invitedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(schema.sessionShares).values(share);

    // Mark invitation as accepted
    await db
        .update(schema.sessionShareInvitations)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(schema.sessionShareInvitations.id, invitation.id));

    // Get current user profile
    const user = await db.query.accounts.findFirst({
        where: (accounts, { eq }) => eq(accounts.id, userId),
    });

    return c.json({
        success: true,
        share: {
            id: share.id,
            userId: share.userId,
            userProfile: user
                ? {
                      id: user.id,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      username: user.username,
                  }
                : undefined,
            permission: share.permission,
            sharedAt: share.sharedAt.toISOString(),
            sharedBy: share.sharedBy,
        },
        sessionId: invitation.sessionId,
    });
});

// ============================================================================
// DELETE /v1/sessions/:id/sharing/invitations/:invitationId - Revoke Invitation
// ============================================================================

const revokeInvitationRoute = createRoute({
    method: 'delete',
    path: '/v1/sessions/{id}/sharing/invitations/{invitationId}',
    request: {
        params: InvitationIdParamSchema,
    },
    responses: {
        200: {
            content: { 'application/json': { schema: RevokeInvitationResponseSchema } },
            description: 'Invitation revoked successfully',
        },
        401: {
            content: { 'application/json': { schema: UnauthorizedErrorSchema } },
            description: 'Unauthorized',
        },
        404: {
            content: { 'application/json': { schema: NotFoundErrorSchema } },
            description: 'Session or invitation not found',
        },
    },
    tags: ['Session Sharing'],
    summary: 'Revoke invitation',
    description: 'Revoke a pending email invitation.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
sharingRoutes.openapi(revokeInvitationRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { id: sessionId, invitationId } = c.req.valid('param');
    const db = getDb(c.env.DB);

    // Verify ownership
    const { error } = await verifySessionOwnership(db, sessionId, userId);
    if (error) {
        return c.json({ error }, 404);
    }

    // Update invitation to revoked
    await db
        .update(schema.sessionShareInvitations)
        .set({ status: 'revoked', updatedAt: new Date() })
        .where(
            and(
                eq(schema.sessionShareInvitations.id, invitationId),
                eq(schema.sessionShareInvitations.sessionId, sessionId),
                eq(schema.sessionShareInvitations.status, 'pending')
            )
        );

    return c.json({ success: true });
});

export default sharingRoutes;
