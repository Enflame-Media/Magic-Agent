#!/usr/bin/env tsx
/**
 * Swift Type Generation Script
 *
 * Generates Swift Codable types from @happy/protocol Zod schemas.
 * This is a two-step process:
 * 1. Convert Zod schemas to JSON Schema
 * 2. Convert JSON Schema to Swift using quicktype
 *
 * Usage:
 *   yarn generate:swift           # Generate to apps/macos/Happy/Generated/
 *   yarn generate:swift --dry-run # Preview without writing files
 *
 * Output:
 *   - apps/macos/Happy/Generated/HappyProtocol.swift
 *
 * @see HAP-687 - Set up Zod to Swift type generation for happy-macos
 */

import { z } from 'zod';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    quicktype,
    InputData,
    JSONSchemaInput,
    FetchingJSONSchemaStore,
} from 'quicktype-core';

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
    // Session sharing schemas (HAP-766)
    SessionSharePermissionSchema,
    SessionShareEntrySchema,
    SessionShareUrlConfigSchema,
    InvitationStatusSchema,
    SessionShareInvitationSchema,
    SessionShareSettingsSchema,
    AddSessionShareRequestSchema,
    UpdateSessionShareRequestSchema,
    RemoveSessionShareRequestSchema,
    UpdateUrlSharingRequestSchema,
    RevokeInvitationRequestSchema,
    ResendInvitationRequestSchema,
} from '../src/index';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Schema definitions to generate Swift types for
 *
 * Organized by category for documentation purposes.
 * All schemas will be combined into a single Swift file.
 */
const schemasToGenerate = {
    // Common types (foundational, used by other schemas)
    GitHubProfile: GitHubProfileSchema,
    ImageRef: ImageRefSchema,
    RelationshipStatus: RelationshipStatusSchema,
    UserProfile: UserProfileSchema,
    FeedBody: FeedBodySchema,
    EncryptedContent: EncryptedContentSchema,
    VersionedValue: VersionedValueSchema,
    NullableVersionedValue: NullableVersionedValueSchema,

    // Session updates
    ApiUpdateNewSession: ApiUpdateNewSessionSchema,
    ApiUpdateSessionState: ApiUpdateSessionStateSchema,
    ApiDeleteSession: ApiDeleteSessionSchema,

    // Machine updates
    ApiNewMachine: ApiNewMachineSchema,
    ApiUpdateMachineState: ApiUpdateMachineStateSchema,

    // Message updates
    ApiMessage: ApiMessageSchema,
    ApiUpdateNewMessage: ApiUpdateNewMessageSchema,

    // Artifact updates
    ApiNewArtifact: ApiNewArtifactSchema,
    ApiUpdateArtifact: ApiUpdateArtifactSchema,
    ApiDeleteArtifact: ApiDeleteArtifactSchema,

    // Account updates
    ApiUpdateAccount: ApiUpdateAccountSchema,

    // Social updates
    ApiRelationshipUpdated: ApiRelationshipUpdatedSchema,
    ApiNewFeedPost: ApiNewFeedPostSchema,
    ApiKvBatchUpdate: ApiKvBatchUpdateSchema,

    // Main discriminated union for all updates
    ApiUpdate: ApiUpdateSchema,

    // Ephemeral events
    ApiEphemeralActivityUpdate: ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdate: ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdate: ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdate: ApiEphemeralMachineStatusUpdateSchema,
    ApiEphemeralUpdate: ApiEphemeralUpdateSchema,

    // Payload wrappers
    ApiUpdateContainer: ApiUpdateContainerSchema,
    UpdatePayload: UpdatePayloadSchema,
    EphemeralPayload: EphemeralPayloadSchema,

    // Session sharing (HAP-766)
    SessionSharePermission: SessionSharePermissionSchema,
    SessionShareEntry: SessionShareEntrySchema,
    SessionShareUrlConfig: SessionShareUrlConfigSchema,
    InvitationStatus: InvitationStatusSchema,
    SessionShareInvitation: SessionShareInvitationSchema,
    SessionShareSettings: SessionShareSettingsSchema,
    AddSessionShareRequest: AddSessionShareRequestSchema,
    UpdateSessionShareRequest: UpdateSessionShareRequestSchema,
    RemoveSessionShareRequest: RemoveSessionShareRequestSchema,
    UpdateUrlSharingRequest: UpdateUrlSharingRequestSchema,
    RevokeInvitationRequest: RevokeInvitationRequestSchema,
    ResendInvitationRequest: ResendInvitationRequestSchema,
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
 * Generate Swift code from JSON Schema using quicktype
 */
async function generateSwift(
    jsonSchemas: Record<string, Record<string, unknown>>
): Promise<string> {
    const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());

    // Add each schema as a separate type
    for (const [name, schema] of Object.entries(jsonSchemas)) {
        await schemaInput.addSource({
            name,
            schema: JSON.stringify(schema),
        });
    }

    const inputData = new InputData();
    inputData.addInput(schemaInput);

    const result = await quicktype({
        inputData,
        lang: 'swift',
        rendererOptions: {
            // Swift-specific options (see: npx quicktype --lang swift --help)
            'just-types': 'false', // Generate full Codable types with CodingKeys
            'struct-or-class': 'struct', // Use structs (value types)
            'mutable-properties': 'false', // Use let for immutability
            'acronym-style': 'camel', // URL -> Url, ID -> Id
            'access-level': 'public', // Public access for cross-module use
            'swift-5-support': 'true', // Swift 5+ features
            'protocol': 'hashable', // Make types Hashable (implies Equatable)
            'sendable': 'true', // Mark as Sendable for concurrency
            'initializers': 'true', // Generate memberwise initializers
            'coding-keys': 'true', // Explicit CodingKey values
        },
    });

    return result.lines.join('\n');
}

/**
 * Generate file header with metadata
 */
function generateHeader(): string {
    const timestamp = new Date().toISOString();
    return `//
// HappyProtocol.swift
// Happy
//
// AUTO-GENERATED FILE - DO NOT EDIT
// Generated: ${timestamp}
// Source: @happy/protocol Zod schemas
//
// Regenerate with:
//   yarn workspace @happy/protocol generate:swift
//
// @see HAP-687 - Set up Zod to Swift type generation for happy-macos
//

import Foundation

`;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const verbose = args.includes('--verbose');

    console.error('🔧 Generating Swift types from Zod schemas...');

    // Step 1: Convert Zod schemas to JSON Schema using Zod 4's native toJSONSchema
    console.error('   📋 Converting Zod → JSON Schema (Zod 4 native)...');
    const jsonSchemas: Record<string, Record<string, unknown>> = {};

    for (const [name, schema] of Object.entries(schemasToGenerate)) {
        try {
            jsonSchemas[name] = zodToJson(schema);
            if (verbose) {
                console.error(`      ✓ ${name}`);
            }
        } catch (error) {
            console.error(`   ⚠️  Failed to convert ${name}:`, error);
        }
    }

    console.error(`      ${Object.keys(jsonSchemas).length} schemas converted`);

    // Step 2: Generate Swift from JSON Schema
    console.error('   🔨 Generating Swift code with quicktype...');
    let swiftCode: string;
    try {
        swiftCode = await generateSwift(jsonSchemas);
    } catch (error) {
        console.error('❌ Failed to generate Swift code:', error);
        process.exit(1);
    }

    // Step 3: Add header and write file
    const fullContent = generateHeader() + swiftCode;

    // Calculate output path (from packages/schema/protocol/scripts to apps/macos/Happy/Generated)
    const outputDir = resolve(__dirname, '..', '..', '..', '..', 'apps', 'macos', 'Happy', 'Generated');
    const outputPath = join(outputDir, 'HappyProtocol.swift');

    if (dryRun) {
        console.error('\n📄 [DRY RUN] Would write to:', outputPath);
        console.error('\n--- Generated Swift code preview (first 100 lines) ---');
        console.log(fullContent.split('\n').slice(0, 100).join('\n'));
        console.error('--- End preview ---\n');
    } else {
        // Ensure output directory exists
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
            console.error(`   📁 Created directory: ${outputDir}`);
        }

        writeFileSync(outputPath, fullContent, 'utf-8');
        console.error(`✅ Swift types generated: ${outputPath}`);
    }

    // Print summary
    const typeCount = Object.keys(schemasToGenerate).length;
    const lineCount = fullContent.split('\n').length;
    console.error(`   📊 ${typeCount} types, ${lineCount} lines of Swift code`);
}

main().catch((error) => {
    console.error('❌ Swift generation failed:', error);
    process.exit(1);
});
