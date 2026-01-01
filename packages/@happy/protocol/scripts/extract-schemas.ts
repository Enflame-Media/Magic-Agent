#!/usr/bin/env tsx
/**
 * Protocol Schema Extraction Script
 *
 * Extracts all Zod schemas from @happy/protocol and converts them to JSON Schema format
 * for schema drift detection. This allows comparing protocol schemas with OpenAPI schemas
 * generated from the server routes.
 *
 * Usage:
 *   yarn schema:extract           # Generate protocol-schemas.json
 *   yarn schema:extract --stdout  # Print to stdout (for piping)
 *
 * Output:
 *   - packages/@happy/protocol/protocol-schemas.json
 *
 * @see HAP-565 - Add cross-project schema drift detection to CI
 * @see HAP-695 - Migrate to Zod 4 native JSON Schema
 */

import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import all schemas from the protocol package
import {
    // Common types
    GitHubProfileSchema,
    ImageRefSchema,
    RelationshipStatusSchema,
    UserProfileSchema,
    FeedBodySchema,
    EncryptedContentSchema,
    VersionedValueSchema,
    NullableVersionedValueSchema,
    // Update schemas
    ApiUpdateSchema,
    ApiMessageSchema,
    ApiUpdateNewMessageSchema,
    ApiDeleteSessionSchema,
    ApiUpdateNewSessionSchema,
    ApiUpdateSessionStateSchema,
    ApiNewMachineSchema,
    ApiUpdateMachineStateSchema,
    ApiNewArtifactSchema,
    ApiUpdateArtifactSchema,
    ApiDeleteArtifactSchema,
    ApiUpdateAccountSchema,
    ApiRelationshipUpdatedSchema,
    ApiNewFeedPostSchema,
    ApiKvBatchUpdateSchema,
    // Ephemeral schemas
    ApiEphemeralUpdateSchema,
    ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdateSchema,
    // Payload schemas
    ApiUpdateContainerSchema,
    UpdatePayloadSchema,
    EphemeralPayloadSchema,
} from '../src/index';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Schema definitions to extract
 *
 * Each entry maps a schema name to its Zod schema.
 * The name is used as the key in the output JSON and should match
 * the TypeScript export name for consistency.
 */
const schemas = {
    // Common types (foundational, used by other schemas)
    common: {
        GitHubProfile: GitHubProfileSchema,
        ImageRef: ImageRefSchema,
        RelationshipStatus: RelationshipStatusSchema,
        UserProfile: UserProfileSchema,
        FeedBody: FeedBodySchema,
        EncryptedContent: EncryptedContentSchema,
        VersionedValue: VersionedValueSchema,
        NullableVersionedValue: NullableVersionedValueSchema,
    },

    // Update schemas (persistent state changes)
    updates: {
        ApiUpdate: ApiUpdateSchema,
        ApiMessage: ApiMessageSchema,
        ApiUpdateNewMessage: ApiUpdateNewMessageSchema,
        ApiDeleteSession: ApiDeleteSessionSchema,
        ApiUpdateNewSession: ApiUpdateNewSessionSchema,
        ApiUpdateSessionState: ApiUpdateSessionStateSchema,
        ApiNewMachine: ApiNewMachineSchema,
        ApiUpdateMachineState: ApiUpdateMachineStateSchema,
        ApiNewArtifact: ApiNewArtifactSchema,
        ApiUpdateArtifact: ApiUpdateArtifactSchema,
        ApiDeleteArtifact: ApiDeleteArtifactSchema,
        ApiUpdateAccount: ApiUpdateAccountSchema,
        ApiRelationshipUpdated: ApiRelationshipUpdatedSchema,
        ApiNewFeedPost: ApiNewFeedPostSchema,
        ApiKvBatchUpdate: ApiKvBatchUpdateSchema,
    },

    // Ephemeral schemas (transient real-time events)
    ephemeral: {
        ApiEphemeralUpdate: ApiEphemeralUpdateSchema,
        ApiEphemeralActivityUpdate: ApiEphemeralActivityUpdateSchema,
        ApiEphemeralUsageUpdate: ApiEphemeralUsageUpdateSchema,
        ApiEphemeralMachineActivityUpdate: ApiEphemeralMachineActivityUpdateSchema,
        ApiEphemeralMachineStatusUpdate: ApiEphemeralMachineStatusUpdateSchema,
    },

    // Payload wrappers (sequencing containers)
    payloads: {
        ApiUpdateContainer: ApiUpdateContainerSchema,
        UpdatePayload: UpdatePayloadSchema,
        EphemeralPayload: EphemeralPayloadSchema,
    },
};

/**
 * Convert Zod schema to JSON Schema using Zod 4's native toJSONSchema
 *
 * Note: Zod 4 has built-in JSON Schema support, eliminating the need for
 * the zod-to-json-schema library which has compatibility issues with Zod 4.
 *
 * @see https://zod.dev/v4 for Zod 4 JSON Schema documentation
 */
function zodToJson(schema: unknown): Record<string, unknown> {
    return z.toJSONSchema(schema as z.ZodType) as Record<string, unknown>;
}

/**
 * Convert all Zod schemas to JSON Schema format
 */
function extractSchemas(): Record<string, unknown> {
    const result: Record<string, Record<string, unknown>> = {};

    for (const [category, categorySchemas] of Object.entries(schemas)) {
        result[category] = {};
        for (const [name, schema] of Object.entries(categorySchemas)) {
            try {
                result[category][name] = zodToJson(schema);
            } catch (error) {
                console.error(`⚠️  Failed to convert ${category}.${name}:`, error);
                result[category][name] = {
                    error: `Failed to convert: ${error instanceof Error ? error.message : String(error)}`,
                };
            }
        }
    }

    return result;
}

/**
 * Generate metadata about the extraction
 */
function generateMetadata(): Record<string, unknown> {
    return {
        generatedAt: new Date().toISOString(),
        packageVersion: process.env.npm_package_version || '0.0.1',
        schemaCount: Object.values(schemas).reduce(
            (acc, cat) => acc + Object.keys(cat).length,
            0
        ),
        categories: Object.keys(schemas),
    };
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const outputStdout = args.includes('--stdout');

    console.error('🔧 Extracting protocol schemas...');

    const extracted = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: '@happy/protocol schemas',
        description: 'JSON Schema representation of @happy/protocol Zod schemas for drift detection',
        _metadata: generateMetadata(),
        schemas: extractSchemas(),
    };

    if (outputStdout) {
        console.log(JSON.stringify(extracted, null, 2));
    } else {
        const outputPath = resolve(__dirname, '..', 'protocol-schemas.json');
        writeFileSync(outputPath, JSON.stringify(extracted, null, 2), 'utf-8');

        console.error(`✅ Protocol schemas extracted: ${outputPath}`);

        // Print summary
        const schemaCount = Object.values(extracted.schemas).reduce(
            (acc: number, cat: unknown) => acc + Object.keys(cat as object).length,
            0
        );
        console.error(`   📊 ${schemaCount} schemas in ${Object.keys(extracted.schemas).length} categories`);
    }
}

main().catch((error) => {
    console.error('❌ Failed to extract protocol schemas:', error);
    process.exit(1);
});
