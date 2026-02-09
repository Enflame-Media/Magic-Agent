import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import * as semver from 'semver';
import {
    VersionCheckRequestSchema,
    VersionCheckResponseSchema,
} from '@/schemas/version';

/**
 * Minimum version requirements for each platform
 * Clients below these versions will be prompted to update
 */
const IOS_UP_TO_DATE = '>=1.4.1';
const ANDROID_UP_TO_DATE = '>=1.4.1';

/**
 * App store URLs for each platform
 */
const IOS_APP_STORE_URL =
    'https://apps.apple.com/us/app/happy-claude-code-client/id6748571505';
const ANDROID_PLAY_STORE_URL =
    'https://play.google.com/store/apps/details?id=com.ex3ndr.happy';

/**
 * Environment bindings for version routes
 */
interface Env {
    DB: D1Database;
}

/**
 * Version routes module
 *
 * Implements version check endpoint:
 * - POST /v1/version - Check if app version requires update
 *
 * No authentication required for version checks.
 */
const versionRoutes = new OpenAPIHono<{ Bindings: Env }>();

// ============================================================================
// POST /v1/version - Check App Version
// ============================================================================

const versionCheckRoute = createRoute({
    method: 'post',
    path: '/v1/version',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: VersionCheckRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: VersionCheckResponseSchema,
                },
            },
            description: 'Version check result with optional update URL',
        },
    },
    tags: ['Version'],
    summary: 'Check app version',
    description:
        'Check if the client app version requires an update. Returns update URL if update is needed, null if up to date.',
});

versionRoutes.openapi(versionCheckRoute, async (c) => {
    const { platform, version } = c.req.valid('json');

    // Check iOS version
    if (platform.toLowerCase() === 'ios') {
        if (semver.satisfies(version, IOS_UP_TO_DATE)) {
            return c.json({ updateUrl: null });
        }
        return c.json({ updateUrl: IOS_APP_STORE_URL });
    }

    // Check Android version
    if (platform.toLowerCase() === 'android') {
        if (semver.satisfies(version, ANDROID_UP_TO_DATE)) {
            return c.json({ updateUrl: null });
        }
        return c.json({ updateUrl: ANDROID_PLAY_STORE_URL });
    }

    // Fallback for unknown platforms (web, etc.)
    return c.json({ updateUrl: null });
});

export default versionRoutes;
