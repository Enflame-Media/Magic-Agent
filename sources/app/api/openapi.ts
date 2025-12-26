/**
 * OpenAPI/Swagger configuration for Happy Server API
 *
 * This configuration enables automatic OpenAPI spec generation from route schemas.
 * The generated spec can be:
 * - Accessed at /documentation/json or /documentation/yaml when server is running
 * - Exported via `yarn openapi:generate` for CI validation
 *
 * @see https://github.com/fastify/fastify-swagger
 */

import type { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

/**
 * OpenAPI 3.0 specification configuration
 *
 * This follows the OpenAPI 3.0.3 specification format.
 * All route schemas using Zod are automatically converted to JSON Schema
 * via the jsonSchemaTransform from fastify-type-provider-zod.
 */
export const openApiConfig: FastifyDynamicSwaggerOptions = {
    openapi: {
        openapi: "3.0.3",
        info: {
            title: "Happy Server API",
            description: "Backend API for Happy - a mobile and web client for Claude Code and Codex, enabling remote control and session sharing with end-to-end encryption.",
            version: process.env.npm_package_version || "0.0.0",
            contact: {
                name: "Happy Team",
                url: "https://github.com/Enflame-Media/happy",
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT",
            },
        },
        servers: [
            {
                url: "https://api.happy.engineering",
                description: "Production server",
            },
            {
                url: "https://api.staging.happy.engineering",
                description: "Staging server",
            },
            {
                url: "http://localhost:3005",
                description: "Local development server",
            },
        ],
        tags: [
            { name: "auth", description: "Authentication endpoints" },
            { name: "sessions", description: "Claude Code session management" },
            { name: "machines", description: "Machine/device management" },
            { name: "artifacts", description: "Session artifact storage" },
            { name: "accounts", description: "User account management" },
            { name: "push", description: "Push notification management" },
            { name: "connect", description: "OAuth and external service connections" },
            { name: "access-keys", description: "API access key management" },
            { name: "voice", description: "Voice synthesis features" },
            { name: "feed", description: "Activity feed" },
            { name: "kv", description: "Key-value storage" },
            { name: "health", description: "Health check endpoints" },
            { name: "version", description: "Version checking" },
            { name: "users", description: "User profile management" },
            { name: "dev", description: "Development/debugging endpoints" },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT token obtained from /v1/auth/token endpoint",
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
};
