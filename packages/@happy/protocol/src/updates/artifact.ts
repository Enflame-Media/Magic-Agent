/**
 * Artifact-related update schemas
 *
 * Handles: new-artifact, update-artifact, delete-artifact
 */

import { z } from 'zod';
import { VersionedValueSchema } from '../common';

/**
 * New artifact update
 *
 * Sent when a new artifact (file/output) is created.
 *
 * @example
 * ```typescript
 * const newArtifact = ApiNewArtifactSchema.parse({
 *     t: 'new-artifact',
 *     artifactId: 'artifact_code1',
 *     header: 'encryptedHeader',
 *     headerVersion: 1,
 *     body: 'encryptedCodeBody',
 *     bodyVersion: 1,
 *     dataEncryptionKey: 'base64EncodedKey==',
 *     seq: 5,
 *     createdAt: Date.now(),
 *     updatedAt: Date.now()
 * });
 * ```
 */
export const ApiNewArtifactSchema = z.object({
    t: z.literal('new-artifact'),
    artifactId: z.string(),
    header: z.string(), // Encrypted header
    headerVersion: z.number(),
    body: z.string().optional(), // Encrypted body (optional for header-only artifacts)
    bodyVersion: z.number().optional(),
    dataEncryptionKey: z.string(),
    seq: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});

export type ApiNewArtifact = z.infer<typeof ApiNewArtifactSchema>;

/**
 * Update artifact
 *
 * Sent when artifact header or body changes.
 *
 * @example
 * ```typescript
 * const artifactUpdate = ApiUpdateArtifactSchema.parse({
 *     t: 'update-artifact',
 *     artifactId: 'artifact_code1',
 *     body: { version: 2, value: 'updatedEncryptedBody' }
 * });
 * ```
 */
export const ApiUpdateArtifactSchema = z.object({
    t: z.literal('update-artifact'),
    artifactId: z.string(),
    header: VersionedValueSchema.optional(),
    body: VersionedValueSchema.optional(),
});

export type ApiUpdateArtifact = z.infer<typeof ApiUpdateArtifactSchema>;

/**
 * Delete artifact
 *
 * Sent when an artifact is deleted.
 *
 * @example
 * ```typescript
 * const deleteArtifact = ApiDeleteArtifactSchema.parse({
 *     t: 'delete-artifact',
 *     artifactId: 'artifact_code1'
 * });
 * ```
 */
export const ApiDeleteArtifactSchema = z.object({
    t: z.literal('delete-artifact'),
    artifactId: z.string(),
});

export type ApiDeleteArtifact = z.infer<typeof ApiDeleteArtifactSchema>;
