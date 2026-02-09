import { z } from '@hono/zod-openapi';

// ============================================================================
// Development Logging Schemas
// ============================================================================

/**
 * Maximum size limits for dev logging payloads (HAP-820)
 * These limits prevent oversized payloads from consuming bandwidth and storage.
 */
export const DEV_LOG_SIZE_LIMITS = {
    /** Maximum length for the message string (~50KB) */
    MAX_MESSAGE_LENGTH: 50 * 1024, // 50KB
    /** Maximum serialized size for messageRawObject (~100KB) */
    MAX_RAW_OBJECT_SIZE: 100 * 1024, // 100KB
} as const;

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
        message: z
            .string()
            .max(DEV_LOG_SIZE_LIMITS.MAX_MESSAGE_LENGTH, {
                message: `Message exceeds maximum length of ${DEV_LOG_SIZE_LIMITS.MAX_MESSAGE_LENGTH} bytes`,
            })
            .openapi({
                description: `Log message (max ${DEV_LOG_SIZE_LIMITS.MAX_MESSAGE_LENGTH} bytes)`,
                example: 'User action completed',
            }),
        messageRawObject: z
            .any()
            .optional()
            .refine(
                (value) => {
                    if (value === undefined || value === null) return true;
                    try {
                        const serialized = JSON.stringify(value);
                        return serialized.length <= DEV_LOG_SIZE_LIMITS.MAX_RAW_OBJECT_SIZE;
                    } catch {
                        // If serialization fails, reject the value
                        return false;
                    }
                },
                {
                    message: `messageRawObject exceeds maximum serialized size of ${DEV_LOG_SIZE_LIMITS.MAX_RAW_OBJECT_SIZE} bytes`,
                }
            )
            .openapi({
                description: `Optional raw object for detailed logging (max ${DEV_LOG_SIZE_LIMITS.MAX_RAW_OBJECT_SIZE} bytes when serialized)`,
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

/**
 * Error response when auth token is invalid or missing
 */
export const DevLogUnauthorizedSchema = z
    .object({
        error: z.literal('Unauthorized'),
    })
    .openapi('DevLogUnauthorized');

/**
 * Error response when rate limit is exceeded (HAP-819)
 */
export const DevLogRateLimitSchema = z
    .object({
        error: z.string().openapi({
            description: 'Rate limit exceeded message',
            example: 'Rate limit exceeded',
        }),
        retryAfter: z.number().openapi({
            description: 'Seconds until the rate limit resets',
            example: 60,
        }),
    })
    .openapi('DevLogRateLimit');

/**
 * Error response when endpoint is blocked in production environment (HAP-821)
 */
export const DevLogEnvironmentBlockedSchema = z
    .object({
        error: z.literal('Debug logging is not available in production'),
    })
    .openapi('DevLogEnvironmentBlocked');

/**
 * Error response when payload is too large (HAP-820)
 */
export const DevLogPayloadTooLargeSchema = z
    .object({
        error: z.string().openapi({
            description: 'Payload too large error message',
            example: 'Payload too large: message exceeds 51200 bytes limit',
        }),
        maxMessageLength: z.number().openapi({
            description: 'Maximum allowed message length in bytes',
            example: 51200,
        }),
        maxRawObjectSize: z.number().openapi({
            description: 'Maximum allowed messageRawObject size in bytes',
            example: 102400,
        }),
    })
    .openapi('DevLogPayloadTooLarge');
