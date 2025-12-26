import { OpenAPIHono } from '@hono/zod-openapi';
import type { Env, Variables } from '../env';
import { createAuth } from '../auth';

/**
 * Authentication routes powered by Better-Auth
 *
 * Mounts Better-Auth handler to handle all authentication operations:
 * - POST /api/auth/sign-in/email - Sign in with email/password
 * - POST /api/auth/sign-up/email - Sign up with email/password
 * - POST /api/auth/sign-out - Sign out and clear session
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/reference - OpenAPI documentation for auth endpoints
 */
export const authRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

/**
 * Handle all Better-Auth requests
 *
 * Better-Auth handles:
 * - /sign-in/email - Email/password login
 * - /sign-up/email - Email/password registration
 * - /sign-out - Session termination
 * - /session - Session retrieval
 * - /reference - OpenAPI docs (via openAPI plugin)
 */
authRoutes.on(['GET', 'POST'], '/*', async (c) => {
    const auth = createAuth(c.env);
    return auth.handler(c.req.raw);
});
