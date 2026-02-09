import { z } from '@hono/zod-openapi';

// ============================================================================
// Voice Token Schemas (ElevenLabs Integration)
// ============================================================================

/**
 * Request body for voice token
 */
export const VoiceTokenRequestSchema = z
    .object({
        agentId: z.string().openapi({
            description: 'ElevenLabs agent ID for conversation',
            example: 'agent_abc123',
        }),
        revenueCatPublicKey: z.string().optional().openapi({
            description:
                'RevenueCat public key for subscription verification (required in production)',
            example: 'appl_XYZ789',
        }),
    })
    .openapi('VoiceTokenRequest');

/**
 * Response for successful voice token
 */
export const VoiceTokenSuccessSchema = z
    .object({
        allowed: z.literal(true),
        token: z.string().openapi({
            description: 'ElevenLabs conversation token',
            example: 'xi_token_...',
        }),
        agentId: z.string().openapi({
            description: 'Agent ID the token was issued for',
            example: 'agent_abc123',
        }),
    })
    .openapi('VoiceTokenSuccess');

/**
 * Response for denied voice token (subscription required)
 */
export const VoiceTokenDeniedSchema = z
    .object({
        allowed: z.literal(false),
        agentId: z.string().optional(),
    })
    .openapi('VoiceTokenDenied');

/**
 * Error response for voice token
 */
export const VoiceTokenErrorSchema = z
    .object({
        allowed: z.literal(false),
        error: z.string().openapi({
            description: 'Error message',
            example: 'RevenueCat public key required',
        }),
    })
    .openapi('VoiceTokenError');

/**
 * Unauthorized error schema
 */
export const UnauthorizedErrorSchema = z
    .object({
        error: z.literal('Unauthorized'),
    })
    .openapi('UnauthorizedError');

// ============================================================================
// Voice Access Schemas (Lightweight subscription check - HAP-816)
// ============================================================================

/**
 * Query parameters for voice access check
 */
export const VoiceAccessQuerySchema = z
    .object({
        revenueCatPublicKey: z.string().optional().openapi({
            description:
                'RevenueCat public key for subscription verification (required in production)',
            example: 'appl_XYZ789',
        }),
    })
    .openapi('VoiceAccessQuery');

/**
 * Response for voice access check
 */
export const VoiceAccessResponseSchema = z
    .object({
        allowed: z.boolean().openapi({
            description: 'Whether the user has voice access',
            example: true,
        }),
        reason: z.string().optional().openapi({
            description:
                'Reason for denied access (only present when allowed is false)',
            example: 'subscription_required',
        }),
    })
    .openapi('VoiceAccessResponse');
