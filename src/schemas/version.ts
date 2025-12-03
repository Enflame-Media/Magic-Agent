import { z } from '@hono/zod-openapi';

// ============================================================================
// Version Check Schemas
// ============================================================================

/**
 * Request body for version check
 */
export const VersionCheckRequestSchema = z
    .object({
        platform: z.string().openapi({
            description: 'Client platform (ios, android)',
            example: 'ios',
        }),
        version: z.string().openapi({
            description: 'Current app version (semver format)',
            example: '1.2.3',
        }),
        app_id: z.string().openapi({
            description: 'Application bundle identifier',
            example: 'com.ex3ndr.happy',
        }),
    })
    .openapi('VersionCheckRequest');

/**
 * Response for version check
 */
export const VersionCheckResponseSchema = z
    .object({
        updateUrl: z.string().nullable().openapi({
            description: 'URL to download update, null if up to date',
            example:
                'https://apps.apple.com/us/app/happy-claude-code-client/id6748571505',
        }),
    })
    .openapi('VersionCheckResponse');
