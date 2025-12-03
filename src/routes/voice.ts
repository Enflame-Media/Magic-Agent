import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { authMiddleware, type AuthVariables } from '@/middleware/auth';
import {
    VoiceTokenRequestSchema,
    VoiceTokenSuccessSchema,
    VoiceTokenDeniedSchema,
    VoiceTokenErrorSchema,
    UnauthorizedErrorSchema,
} from '@/schemas/voice';

/**
 * Environment bindings for voice routes
 */
interface Env {
    DB: D1Database;
    /**
     * Current deployment environment
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';
    /**
     * ElevenLabs API key for voice synthesis
     */
    ELEVENLABS_API_KEY?: string;
}

/**
 * Voice routes module
 *
 * Implements ElevenLabs voice integration:
 * - POST /v1/voice/token - Get ElevenLabs conversation token
 *
 * All routes require authentication. In production, also requires RevenueCat
 * subscription verification.
 */
const voiceRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Apply auth middleware to all voice routes
voiceRoutes.use('/v1/voice/*', authMiddleware());

// ============================================================================
// POST /v1/voice/token - Get ElevenLabs Conversation Token
// ============================================================================

const voiceTokenRoute = createRoute({
    method: 'post',
    path: '/v1/voice/token',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: VoiceTokenRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: VoiceTokenSuccessSchema.or(VoiceTokenDeniedSchema),
                },
            },
            description: 'Voice token response (allowed or denied)',
        },
        400: {
            content: {
                'application/json': {
                    schema: VoiceTokenErrorSchema,
                },
            },
            description:
                'Bad request (missing API key, failed token generation)',
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
    tags: ['Voice'],
    summary: 'Get ElevenLabs conversation token',
    description:
        'Get a token for ElevenLabs voice conversation. Requires active subscription in production.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
voiceRoutes.openapi(voiceTokenRoute, async (c) => {
    const userId = (
        c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>
    ).get('userId');
    const { agentId, revenueCatPublicKey } = c.req.valid('json');

    const isDevelopment =
        c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'staging';

    // Production requires RevenueCat key for subscription verification
    if (!isDevelopment && !revenueCatPublicKey) {
        return c.json(
            {
                allowed: false as const,
                error: 'RevenueCat public key required',
            },
            400
        );
    }

    // Check subscription in production
    if (!isDevelopment && revenueCatPublicKey) {
        try {
            const response = await fetch(
                `https://api.revenuecat.com/v1/subscribers/${userId}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${revenueCatPublicKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                console.warn(
                    `RevenueCat check failed for user ${userId}: ${response.status}`
                );
                return c.json({
                    allowed: false as const,
                    agentId,
                });
            }

            const data = (await response.json()) as {
                subscriber?: {
                    entitlements?: {
                        active?: {
                            pro?: unknown;
                        };
                    };
                };
            };
            const proEntitlement = data.subscriber?.entitlements?.active?.pro;

            if (!proEntitlement) {
                console.info(
                    `User ${userId} does not have active subscription`
                );
                return c.json({
                    allowed: false as const,
                    agentId,
                });
            }
        } catch (error) {
            console.error(
                `RevenueCat verification error for user ${userId}:`,
                error
            );
            return c.json({
                allowed: false as const,
                agentId,
            });
        }
    }

    // Check if ElevenLabs API key is configured
    const elevenLabsApiKey = c.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
        return c.json(
            {
                allowed: false as const,
                error: 'Missing ElevenLabs API key on the server',
            },
            400
        );
    }

    // Get ElevenLabs conversation token
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': elevenLabsApiKey,
                    Accept: 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error(
                `Failed to get ElevenLabs token for user ${userId}: ${response.status}`
            );
            return c.json(
                {
                    allowed: false as const,
                    error: `Failed to get ElevenLabs token`,
                },
                400
            );
        }

        const data = (await response.json()) as { token?: string };
        const token = data.token;

        if (!token) {
            return c.json(
                {
                    allowed: false as const,
                    error: 'ElevenLabs returned empty token',
                },
                400
            );
        }

        console.info(`Voice token issued for user ${userId}`);
        return c.json({
            allowed: true as const,
            token,
            agentId,
        });
    } catch (error) {
        console.error(`ElevenLabs API error for user ${userId}:`, error);
        return c.json(
            {
                allowed: false as const,
                error: 'ElevenLabs API error',
            },
            400
        );
    }
});

export default voiceRoutes;
