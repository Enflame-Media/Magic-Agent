/**
 * Artifact-related update schemas
 *
 * Handles: new-artifact, update-artifact, delete-artifact
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { VersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';

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
    artifactId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    header: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX), // Encrypted header
    headerVersion: z.number(),
    body: z.string().max(STRING_LIMITS.CONTENT_MAX).optional(), // Encrypted body (optional for header-only artifacts)
    bodyVersion: z.number().optional(),
    dataEncryptionKey: z.string().min(1).max(STRING_LIMITS.DATA_ENCRYPTION_KEY_MAX),
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
    artifactId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
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
    artifactId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
});

export type ApiDeleteArtifact = z.infer<typeof ApiDeleteArtifactSchema>;
