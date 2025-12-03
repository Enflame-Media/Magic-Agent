import { z } from '@hono/zod-openapi';

// ============================================================================
// Development Logging Schemas
// ============================================================================

/**
 * Request body for combined logging endpoint
 */
export const DevLogRequestSchema = z
    .object({
        timestamp: z.string().openapi({
            description: 'ISO timestamp of the log entry',
            example: '2024-01-15T10:30:00.000Z',
        }),
        level: z.string().openapi({
            description: 'Log level (error, warn, info, debug)',
            example: 'info',
        }),
        message: z.string().openapi({
            description: 'Log message',
            example: 'User action completed',
        }),
        messageRawObject: z.any().optional().openapi({
            description: 'Optional raw object for detailed logging',
        }),
        source: z.enum(['mobile', 'cli']).openapi({
            description: 'Source of the log (mobile app or CLI)',
            example: 'mobile',
        }),
        platform: z.string().optional().openapi({
            description: 'Platform identifier (ios, android, macos, etc.)',
            example: 'ios',
        }),
    })
    .openapi('DevLogRequest');

/**
 * Response for dev logging
 */
export const DevLogResponseSchema = z
    .object({
        success: z.literal(true),
    })
    .openapi('DevLogResponse');

/**
 * Error response when logging is disabled
 */
export const DevLogDisabledSchema = z
    .object({
        error: z.literal('Debug logging is disabled'),
    })
    .openapi('DevLogDisabled');
