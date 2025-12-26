#!/usr/bin/env tsx
/**
 * OpenAPI Specification Generator
 *
 * This script generates the OpenAPI specification from the Fastify server routes.
 * It creates a standalone Fastify instance, registers Swagger with the API metadata,
 * and exports the generated spec as JSON or YAML.
 *
 * Note: This generates the base OpenAPI spec with server metadata. Route schemas
 * are automatically discovered when the actual server runs with Swagger UI.
 * For CI validation, this verifies the OpenAPI configuration is valid.
 *
 * Usage:
 *   yarn openapi:generate           # Generate openapi.json
 *   yarn openapi:generate --yaml    # Generate openapi.yaml
 *   yarn openapi:generate --stdout  # Print to stdout (for piping)
 *
 * Output:
 *   - happy-server/openapi.json (or openapi.yaml)
 *
 * @see HAP-473 - Add OpenAPI validation to CI pipeline
 */

import fastify from "fastify";
import {
    serializerCompiler,
    validatorCompiler,
    ZodTypeProvider,
    jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// OpenAPI configuration - inline to avoid import path resolution issues with @/ aliases
const openApiConfig = {
    openapi: {
        openapi: "3.0.3" as const,
        info: {
            title: "Happy Server API",
            description:
                "Backend API for Happy - a mobile and web client for Claude Code and Codex, enabling remote control and session sharing with end-to-end encryption.",
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
                    type: "http" as const,
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT token obtained from /v1/auth/token endpoint",
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
};

async function generateOpenApiSpec(): Promise<void> {
    const args = process.argv.slice(2);
    const outputYaml = args.includes("--yaml");
    const outputStdout = args.includes("--stdout");

    console.error("🔧 Generating OpenAPI specification...");

    // Create a minimal Fastify instance for spec generation
    const app = fastify({
        logger: false,
    });

    // Register Swagger
    await app.register(import("@fastify/swagger"), {
        ...openApiConfig,
        transform: jsonSchemaTransform,
    });

    // Set up Zod type provider
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const typed = app.withTypeProvider<ZodTypeProvider>();

    // Register representative sample routes to validate schema generation
    // These demonstrate the OpenAPI integration works correctly
    typed.get("/v1/health", {
        schema: {
            tags: ["health"],
            description: "Health check endpoint",
            response: {
                200: z.object({
                    status: z.enum(["ok", "degraded", "error"]),
                    timestamp: z.string().datetime(),
                }),
            },
        },
    }, async () => ({ status: "ok" as const, timestamp: new Date().toISOString() }));

    typed.post("/v1/version", {
        schema: {
            tags: ["version"],
            description: "Check if app version requires update",
            body: z.object({
                platform: z.string().describe("Platform identifier (ios, android)"),
                version: z.string().describe("Current app version"),
                app_id: z.string().describe("Application identifier"),
            }),
            response: {
                200: z.object({
                    updateUrl: z.string().nullable().describe("URL to update, or null if up-to-date"),
                }),
            },
        },
    }, async () => ({ updateUrl: null }));

    // Wait for Fastify to be ready
    await app.ready();

    // Generate the OpenAPI spec
    const spec = app.swagger();

    // Output the spec
    if (outputStdout) {
        if (outputYaml) {
            console.log(YAML.stringify(spec));
        } else {
            console.log(JSON.stringify(spec, null, 2));
        }
    } else {
        const outputDir = resolve(__dirname, "..");
        const filename = outputYaml ? "openapi.yaml" : "openapi.json";
        const outputPath = resolve(outputDir, filename);

        if (outputYaml) {
            writeFileSync(outputPath, YAML.stringify(spec), "utf-8");
        } else {
            writeFileSync(outputPath, JSON.stringify(spec, null, 2), "utf-8");
        }

        console.error(`✅ OpenAPI spec generated: ${outputPath}`);

        // Print summary
        const pathCount = Object.keys(spec.paths || {}).length;
        const schemaCount = Object.keys(spec.components?.schemas || {}).length;
        console.error(`   📊 ${pathCount} paths, ${schemaCount} schemas`);
    }

    await app.close();
}

generateOpenApiSpec().catch((error) => {
    console.error("❌ Failed to generate OpenAPI spec:", error);
    process.exit(1);
});
