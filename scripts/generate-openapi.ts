#!/usr/bin/env tsx
/**
 * OpenAPI Specification Generator
 *
 * This script generates a complete OpenAPI specification from ALL Fastify server routes.
 * It creates a standalone Fastify instance with all route registrations and exports
 * the generated spec as JSON or YAML.
 *
 * The script uses OPENAPI_SPEC_ONLY=true to skip database/redis/S3 connections,
 * allowing route schemas to be extracted without external dependencies.
 *
 * Usage:
 *   yarn openapi:generate           # Generate openapi.json
 *   yarn openapi:generate --yaml    # Generate openapi.yaml
 *   yarn openapi:generate --stdout  # Print to stdout (for piping)
 *
 * Output:
 *   - happy-server/openapi.json (or openapi.yaml)
 *
 * @see HAP-568 - Enhance generate-openapi.ts to include all server routes
 * @see HAP-565 - Schema drift detection depends on this output
 */

// Set environment flag BEFORE any imports to prevent storage connections
process.env.OPENAPI_SPEC_ONLY = 'true';

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

// Import OpenAPI configuration
import { openApiConfig } from "../sources/app/api/openapi";

// Import all route registration functions
import { authRoutes } from "../sources/app/api/routes/authRoutes";
import { pushRoutes } from "../sources/app/api/routes/pushRoutes";
import { sessionRoutes } from "../sources/app/api/routes/sessionRoutes";
import { accountRoutes } from "../sources/app/api/routes/accountRoutes";
import { connectRoutes } from "../sources/app/api/routes/connectRoutes";
import { machinesRoutes } from "../sources/app/api/routes/machinesRoutes";
import { artifactsRoutes } from "../sources/app/api/routes/artifactsRoutes";
import { accessKeysRoutes } from "../sources/app/api/routes/accessKeysRoutes";
import { devRoutes } from "../sources/app/api/routes/devRoutes";
import { versionRoutes } from "../sources/app/api/routes/versionRoutes";
import { voiceRoutes } from "../sources/app/api/routes/voiceRoutes";
import { userRoutes } from "../sources/app/api/routes/userRoutes";
import { feedRoutes } from "../sources/app/api/routes/feedRoutes";
import { kvRoutes } from "../sources/app/api/routes/kvRoutes";
import { healthRoutes } from "../sources/app/api/routes/healthRoutes";
import type { Fastify } from "../sources/app/api/types";

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateOpenApiSpec(): Promise<void> {
    const args = process.argv.slice(2);
    const outputYaml = args.includes("--yaml");
    const outputStdout = args.includes("--stdout");

    console.error("🔧 Generating OpenAPI specification from all server routes...");

    // Create a Fastify instance for spec generation
    const app = fastify({
        logger: false,
        bodyLimit: 1024 * 1024 * 100, // Match server config
    });

    // Register CORS (required for route compatibility)
    await app.register(import("@fastify/cors"), {
        origin: "*",
        allowedHeaders: "*",
        methods: ["GET", "POST", "DELETE"],
    });

    // Register Swagger with OpenAPI config
    await app.register(import("@fastify/swagger"), {
        ...openApiConfig,
        transform: jsonSchemaTransform,
    });

    // Set up Zod type provider
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const typed = app.withTypeProvider<ZodTypeProvider>() as unknown as Fastify;

    // Add mock authenticate decorator (routes reference this but don't need actual auth)
    app.decorate("authenticate", async function (_request: unknown, _reply: unknown) {
        // No-op for spec generation
    });

    // Register ALL routes (order matches api.ts)
    authRoutes(typed);
    pushRoutes(typed);
    sessionRoutes(typed);
    accountRoutes(typed);
    connectRoutes(typed);
    machinesRoutes(typed);
    artifactsRoutes(typed);
    accessKeysRoutes(typed);
    devRoutes(typed);
    versionRoutes(typed);
    voiceRoutes(typed);
    userRoutes(typed);
    feedRoutes(typed);
    kvRoutes(typed);
    healthRoutes(typed);

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
