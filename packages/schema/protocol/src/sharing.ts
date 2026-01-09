/**
 * Session sharing schemas for sharing sessions with other users
 *
 * These schemas define the structure for session sharing permissions,
 * URL sharing configuration, and email invitations.
 *
 * @example
 * ```typescript
 * import { SessionShareSettingsSchema, type SessionShareSettings } from '@happy/protocol';
 *
 * const result = SessionShareSettingsSchema.safeParse(data);
 * if (result.success) {
 *     const settings: SessionShareSettings = result.data;
 *     console.log('Shares:', settings.shares.length);
 * }
 * ```
 */

import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
import { UserProfileSchema } from './common';

// ═══════════════════════════════════════════════════════════════
// Permission Types
// ═══════════════════════════════════════════════════════════════

/**
 * Permission levels for session sharing
 *
 * @example
 * ```typescript
 * const permission = SessionSharePermissionSchema.parse('view_only');
 * // Valid values: 'view_only', 'view_and_chat'
 * ```
 */
export const SessionSharePermissionSchema = z.enum(['view_only', 'view_and_chat']);

export type SessionSharePermission = z.infer<typeof SessionSharePermissionSchema>;

// ═══════════════════════════════════════════════════════════════
// Share Entry
// ═══════════════════════════════════════════════════════════════

/**
 * Individual session share entry representing a user who has access
 *
 * @example
 * ```typescript
 * const entry = SessionShareEntrySchema.parse({
 *     id: '550e8400-e29b-41d4-a716-446655440000',
 *     userId: 'user_abc123',
 *     permission: 'view_and_chat',
 *     sharedAt: '2026-01-04T12:00:00.000Z',
 *     sharedBy: 'user_xyz789',
 * });
 * ```
 */
export const SessionShareEntrySchema = z.object({
    /** Unique identifier for this share entry */
    id: z.string().uuid(),

    /** User ID of the person who has access */
    userId: z.string().min(1).max(STRING_LIMITS.ID_MAX),

    /** Optional user profile information */
    userProfile: UserProfileSchema.optional(),

    /** Permission level granted */
    permission: SessionSharePermissionSchema,

    /** ISO 8601 timestamp when this share was created */
    sharedAt: z.string().datetime(),

    /** User ID of the person who granted access */
    sharedBy: z.string().min(1).max(STRING_LIMITS.ID_MAX),
});

export type SessionShareEntry = z.infer<typeof SessionShareEntrySchema>;

// ═══════════════════════════════════════════════════════════════
// URL Sharing Configuration
// ═══════════════════════════════════════════════════════════════

/**
 * URL sharing configuration for public link access
 *
 * @example
 * ```typescript
 * const urlConfig = SessionShareUrlConfigSchema.parse({
 *     enabled: true,
 *     token: 'abc123xyz789',
 *     permission: 'view_only',
 * });
 * ```
 */
export const SessionShareUrlConfigSchema = z.object({
    /** Whether URL sharing is enabled */
    enabled: z.boolean(),

    /** Unique token for the shareable URL (generated server-side) */
    token: z.string().max(STRING_LIMITS.TOKEN_MAX).optional(),

    /** Optional password protection for the shared URL */
    password: z.string().max(STRING_LIMITS.NAME_MAX).optional(),

    /** Permission level for users accessing via URL */
    permission: SessionSharePermissionSchema,

    /** Optional ISO 8601 expiration timestamp */
    expiresAt: z.string().datetime().optional(),
});

export type SessionShareUrlConfig = z.infer<typeof SessionShareUrlConfigSchema>;

// ═══════════════════════════════════════════════════════════════
// Email Invitation
// ═══════════════════════════════════════════════════════════════

/**
 * Invitation status for email-based invitations
 *
 * @example
 * ```typescript
 * const status = InvitationStatusSchema.parse('pending');
 * // Valid values: 'pending', 'accepted', 'expired', 'revoked'
 * ```
 */
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked']);

export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

/**
 * Email invitation for non-users
 *
 * @example
 * ```typescript
 * const invitation = SessionShareInvitationSchema.parse({
 *     id: '550e8400-e29b-41d4-a716-446655440000',
 *     email: 'friend@example.com',
 *     permission: 'view_only',
 *     invitedAt: '2026-01-04T12:00:00.000Z',
 *     invitedBy: 'user_xyz789',
 *     status: 'pending',
 *     expiresAt: '2026-01-11T12:00:00.000Z',
 * });
 * ```
 */
export const SessionShareInvitationSchema = z.object({
    /** Unique identifier for this invitation */
    id: z.string().uuid(),

    /** Email address of the invitee */
    email: z.string().email().max(STRING_LIMITS.NAME_MAX),

    /** Permission level to be granted when accepted */
    permission: SessionSharePermissionSchema,

    /** ISO 8601 timestamp when invitation was sent */
    invitedAt: z.string().datetime(),

    /** User ID of the person who sent the invitation */
    invitedBy: z.string().min(1).max(STRING_LIMITS.ID_MAX),

    /** Current status of the invitation */
    status: InvitationStatusSchema,

    /** ISO 8601 timestamp when invitation expires */
    expiresAt: z.string().datetime(),
});

export type SessionShareInvitation = z.infer<typeof SessionShareInvitationSchema>;

// ═══════════════════════════════════════════════════════════════
// Combined Settings
// ═══════════════════════════════════════════════════════════════

/**
 * Complete session sharing settings
 *
 * @example
 * ```typescript
 * const settings = SessionShareSettingsSchema.parse({
 *     sessionId: 'session_abc123',
 *     shares: [],
 *     urlSharing: {
 *         enabled: false,
 *         permission: 'view_only',
 *     },
 *     invitations: [],
 * });
 * ```
 */
export const SessionShareSettingsSchema = z.object({
    /** Session ID these settings apply to */
    sessionId: z.string().min(1).max(STRING_LIMITS.ID_MAX),

    /** List of users who have access */
    shares: z.array(SessionShareEntrySchema),

    /** URL sharing configuration */
    urlSharing: SessionShareUrlConfigSchema,

    /** Pending email invitations */
    invitations: z.array(SessionShareInvitationSchema),
});

export type SessionShareSettings = z.infer<typeof SessionShareSettingsSchema>;

// ═══════════════════════════════════════════════════════════════
// API Request Schemas
// ═══════════════════════════════════════════════════════════════

/**
 * Request to add a session share (either by userId or email)
 *
 * At least one of userId or email must be provided.
 *
 * @example
 * ```typescript
 * // Share with existing user
 * const byUser = AddSessionShareRequestSchema.parse({
 *     sessionId: 'session_abc123',
 *     userId: 'user_xyz789',
 *     permission: 'view_and_chat',
 * });
 *
 * // Invite via email
 * const byEmail = AddSessionShareRequestSchema.parse({
 *     sessionId: 'session_abc123',
 *     email: 'friend@example.com',
 *     permission: 'view_only',
 * });
 * ```
 */
export const AddSessionShareRequestSchema = z
    .object({
        /** Session ID to share */
        sessionId: z.string().min(1).max(STRING_LIMITS.ID_MAX),

        /** User ID to share with (for existing users) */
        userId: z.string().min(1).max(STRING_LIMITS.ID_MAX).optional(),

        /** Email to invite (for non-users) */
        email: z.string().email().max(STRING_LIMITS.NAME_MAX).optional(),

        /** Permission level to grant */
        permission: SessionSharePermissionSchema,
    })
    .refine((data) => data.userId || data.email, {
        message: 'Either userId or email must be provided',
    });

export type AddSessionShareRequest = z.infer<typeof AddSessionShareRequestSchema>;

/**
 * Request to update an existing share's permission level
 *
 * @example
 * ```typescript
 * const request = UpdateSessionShareRequestSchema.parse({
 *     shareId: '550e8400-e29b-41d4-a716-446655440000',
 *     permission: 'view_only',
 * });
 * ```
 */
export const UpdateSessionShareRequestSchema = z.object({
    /** Share entry ID to update */
    shareId: z.string().uuid(),

    /** New permission level */
    permission: SessionSharePermissionSchema,
});

export type UpdateSessionShareRequest = z.infer<typeof UpdateSessionShareRequestSchema>;

/**
 * Request to remove a session share
 *
 * @example
 * ```typescript
 * const request = RemoveSessionShareRequestSchema.parse({
 *     shareId: '550e8400-e29b-41d4-a716-446655440000',
 * });
 * ```
 */
export const RemoveSessionShareRequestSchema = z.object({
    /** Share entry ID to remove */
    shareId: z.string().uuid(),
});

export type RemoveSessionShareRequest = z.infer<typeof RemoveSessionShareRequestSchema>;

/**
 * Request to update URL sharing configuration
 *
 * @example
 * ```typescript
 * // Enable URL sharing with password
 * const request = UpdateUrlSharingRequestSchema.parse({
 *     sessionId: 'session_abc123',
 *     enabled: true,
 *     password: 'secret123',
 *     permission: 'view_only',
 * });
 * ```
 */
export const UpdateUrlSharingRequestSchema = z.object({
    /** Session ID to update URL sharing for */
    sessionId: z.string().min(1).max(STRING_LIMITS.ID_MAX),

    /** Whether to enable or disable URL sharing */
    enabled: z.boolean(),

    /** Optional password protection (pass null to remove) */
    password: z.string().max(STRING_LIMITS.NAME_MAX).nullable().optional(),

    /** Optional new permission level for URL access */
    permission: SessionSharePermissionSchema.optional(),
});

export type UpdateUrlSharingRequest = z.infer<typeof UpdateUrlSharingRequestSchema>;

/**
 * Request to revoke an email invitation
 *
 * @example
 * ```typescript
 * const request = RevokeInvitationRequestSchema.parse({
 *     invitationId: '550e8400-e29b-41d4-a716-446655440000',
 * });
 * ```
 */
export const RevokeInvitationRequestSchema = z.object({
    /** Invitation ID to revoke */
    invitationId: z.string().uuid(),
});

export type RevokeInvitationRequest = z.infer<typeof RevokeInvitationRequestSchema>;

/**
 * Request to resend an email invitation
 *
 * @example
 * ```typescript
 * const request = ResendInvitationRequestSchema.parse({
 *     invitationId: '550e8400-e29b-41d4-a716-446655440000',
 * });
 * ```
 */
export const ResendInvitationRequestSchema = z.object({
    /** Invitation ID to resend */
    invitationId: z.string().uuid(),
});

export type ResendInvitationRequest = z.infer<typeof ResendInvitationRequestSchema>;
