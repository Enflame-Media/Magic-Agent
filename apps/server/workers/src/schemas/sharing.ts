import { z } from '@hono/zod-openapi';

/**
 * Zod schemas for session sharing endpoints with OpenAPI metadata (HAP-772)
 *
 * These schemas define the request/response contracts for all sharing routes.
 * They provide both runtime validation (via Zod) and automatic OpenAPI
 * documentation generation (via .openapi() extensions).
 *
 * Note: We import core schemas from @magic-agent/protocol and extend them with
 * OpenAPI metadata for API documentation.
 */

// ============================================================================
// Common Schemas (re-exported with OpenAPI extensions)
// ============================================================================

/**
 * Permission level schema
 */
export const PermissionSchema = z.enum(['view_only', 'view_and_chat']).openapi({
    description: 'Permission level for shared session access',
    example: 'view_only',
});

/**
 * User profile schema for share entries
 */
const UserProfileSchema = z
    .object({
        id: z.string().openapi({
            description: 'User ID',
            example: 'user_abc123',
        }),
        firstName: z.string().nullable().optional().openapi({
            description: 'User first name',
            example: 'John',
        }),
        lastName: z.string().nullable().optional().openapi({
            description: 'User last name',
            example: 'Doe',
        }),
        username: z.string().nullable().optional().openapi({
            description: 'Username',
            example: 'johndoe',
        }),
    })
    .openapi('UserProfile');

/**
 * Schema for a single share entry
 */
export const ShareEntrySchema = z
    .object({
        id: z.string().uuid().openapi({
            description: 'Unique share identifier',
            example: '550e8400-e29b-41d4-a716-446655440000',
        }),
        userId: z.string().openapi({
            description: 'User ID of the person with access',
            example: 'user_xyz789',
        }),
        userProfile: UserProfileSchema.optional().openapi({
            description: 'Profile information of the user',
        }),
        permission: PermissionSchema,
        sharedAt: z.string().datetime().openapi({
            description: 'ISO 8601 timestamp when the share was created',
            example: '2026-01-04T12:00:00.000Z',
        }),
        sharedBy: z.string().openapi({
            description: 'User ID of the person who granted access',
            example: 'user_abc123',
        }),
    })
    .openapi('SessionShareEntry');

/**
 * Schema for URL sharing configuration
 */
export const UrlSharingConfigSchema = z
    .object({
        enabled: z.boolean().openapi({
            description: 'Whether URL sharing is enabled',
            example: true,
        }),
        token: z.string().optional().openapi({
            description: 'Unique token for the shareable URL',
            example: 'abc123xyz789',
        }),
        permission: PermissionSchema,
        expiresAt: z.string().datetime().optional().openapi({
            description: 'ISO 8601 timestamp when the URL expires',
            example: '2026-02-04T12:00:00.000Z',
        }),
    })
    .openapi('SessionShareUrlConfig');

/**
 * Schema for email invitation
 */
export const InvitationSchema = z
    .object({
        id: z.string().uuid().openapi({
            description: 'Unique invitation identifier',
            example: '550e8400-e29b-41d4-a716-446655440001',
        }),
        email: z.string().email().openapi({
            description: 'Email address of the invitee',
            example: 'friend@example.com',
        }),
        permission: PermissionSchema,
        invitedAt: z.string().datetime().openapi({
            description: 'ISO 8601 timestamp when the invitation was sent',
            example: '2026-01-04T12:00:00.000Z',
        }),
        invitedBy: z.string().openapi({
            description: 'User ID of the person who sent the invitation',
            example: 'user_abc123',
        }),
        status: z.enum(['pending', 'accepted', 'expired', 'revoked']).openapi({
            description: 'Current status of the invitation',
            example: 'pending',
        }),
        expiresAt: z.string().datetime().openapi({
            description: 'ISO 8601 timestamp when the invitation expires',
            example: '2026-01-11T12:00:00.000Z',
        }),
    })
    .openapi('SessionShareInvitation');

// ============================================================================
// Path Parameters
// ============================================================================

export const SessionIdParamSchema = z.object({
    id: z.string().openapi({
        description: 'Session ID',
        example: 'cmed556s4002bvb2020igg8jf',
        param: { name: 'id', in: 'path' },
    }),
});

export const ShareIdParamSchema = z.object({
    id: z.string().openapi({
        description: 'Session ID',
        example: 'cmed556s4002bvb2020igg8jf',
        param: { name: 'id', in: 'path' },
    }),
    shareId: z.string().uuid().openapi({
        description: 'Share entry ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
        param: { name: 'shareId', in: 'path' },
    }),
});

export const InvitationIdParamSchema = z.object({
    id: z.string().openapi({
        description: 'Session ID',
        example: 'cmed556s4002bvb2020igg8jf',
        param: { name: 'id', in: 'path' },
    }),
    invitationId: z.string().uuid().openapi({
        description: 'Invitation ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
        param: { name: 'invitationId', in: 'path' },
    }),
});

export const ShareTokenParamSchema = z.object({
    token: z.string().openapi({
        description: 'Share URL token',
        example: 'abc123xyz789',
        param: { name: 'token', in: 'path' },
    }),
});

export const InvitationTokenParamSchema = z.object({
    token: z.string().openapi({
        description: 'Invitation token',
        example: 'invite_abc123xyz789',
        param: { name: 'token', in: 'path' },
    }),
});

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Request to add a share (either by userId or email)
 */
export const AddShareRequestSchema = z
    .object({
        userId: z.string().optional().openapi({
            description: 'User ID to share with (for existing users)',
            example: 'user_xyz789',
        }),
        email: z.string().email().optional().openapi({
            description: 'Email to invite (for non-users)',
            example: 'friend@example.com',
        }),
        permission: PermissionSchema,
    })
    .refine((data) => data.userId || data.email, {
        message: 'Either userId or email must be provided',
    })
    .openapi('AddShareRequest');

/**
 * Request to update a share's permission
 */
export const UpdateShareRequestSchema = z
    .object({
        permission: PermissionSchema,
    })
    .openapi('UpdateShareRequest');

/**
 * Request to configure URL sharing
 */
export const UpdateUrlSharingRequestSchema = z
    .object({
        enabled: z.boolean().openapi({
            description: 'Whether to enable or disable URL sharing',
            example: true,
        }),
        password: z.string().max(100).nullable().optional().openapi({
            description: 'Optional password protection (pass null to remove)',
            example: 'secret123',
        }),
        permission: PermissionSchema.optional().openapi({
            description: 'Permission level for URL access',
        }),
    })
    .openapi('UpdateUrlSharingRequest');

/**
 * Request to send an email invitation
 */
export const SendInvitationRequestSchema = z
    .object({
        email: z.string().email().openapi({
            description: 'Email address to invite',
            example: 'friend@example.com',
        }),
        permission: PermissionSchema,
    })
    .openapi('SendInvitationRequest');

/**
 * Request to access a shared session via URL
 */
export const AccessSharedSessionRequestSchema = z
    .object({
        password: z.string().optional().openapi({
            description: 'Password if the share URL is password-protected',
            example: 'secret123',
        }),
    })
    .openapi('AccessSharedSessionRequest');

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Response for GET /v1/sessions/:id/sharing
 */
export const GetSharingSettingsResponseSchema = z
    .object({
        sessionId: z.string().openapi({
            description: 'Session ID',
            example: 'cmed556s4002bvb2020igg8jf',
        }),
        shares: z.array(ShareEntrySchema).openapi({
            description: 'List of users with access',
        }),
        urlSharing: UrlSharingConfigSchema.openapi({
            description: 'URL sharing configuration',
        }),
        invitations: z.array(InvitationSchema).openapi({
            description: 'Pending email invitations',
        }),
    })
    .openapi('GetSharingSettingsResponse');

/**
 * Response for POST /v1/sessions/:id/sharing (add share)
 */
export const AddShareResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
        share: ShareEntrySchema.optional().openapi({
            description: 'Created share entry (when sharing with existing user)',
        }),
        invitation: InvitationSchema.optional().openapi({
            description: 'Created invitation (when inviting via email)',
        }),
    })
    .openapi('AddShareResponse');

/**
 * Response for PATCH /v1/sessions/:id/sharing/:shareId
 */
export const UpdateShareResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
        share: ShareEntrySchema.openapi({
            description: 'Updated share entry',
        }),
    })
    .openapi('UpdateShareResponse');

/**
 * Response for DELETE /v1/sessions/:id/sharing/:shareId
 */
export const DeleteShareResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
    })
    .openapi('DeleteShareResponse');

/**
 * Response for PUT /v1/sessions/:id/sharing/url
 */
export const UpdateUrlSharingResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
        urlSharing: UrlSharingConfigSchema.openapi({
            description: 'Updated URL sharing configuration',
        }),
    })
    .openapi('UpdateUrlSharingResponse');

/**
 * Response for GET /v1/sessions/shared/:token
 */
export const AccessSharedSessionResponseSchema = z
    .object({
        session: z
            .object({
                id: z.string().openapi({
                    description: 'Session ID',
                    example: 'cmed556s4002bvb2020igg8jf',
                }),
                metadata: z.string().openapi({
                    description: 'Encrypted session metadata',
                }),
                permission: PermissionSchema,
            })
            .openapi({
                description: 'Shared session data with limited fields',
            }),
    })
    .openapi('AccessSharedSessionResponse');

/**
 * Response for POST /v1/sessions/:id/sharing/invite
 */
export const SendInvitationResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
        invitation: InvitationSchema.openapi({
            description: 'Created invitation',
        }),
    })
    .openapi('SendInvitationResponse');

/**
 * Response for GET /v1/invitations/:token/accept
 */
export const AcceptInvitationResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
        share: ShareEntrySchema.openapi({
            description: 'Created share entry',
        }),
        sessionId: z.string().openapi({
            description: 'Session ID that was shared',
            example: 'cmed556s4002bvb2020igg8jf',
        }),
    })
    .openapi('AcceptInvitationResponse');

/**
 * Response for DELETE /v1/sessions/:id/sharing/invitations/:invitationId
 */
export const RevokeInvitationResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the operation succeeded',
            example: true,
        }),
    })
    .openapi('RevokeInvitationResponse');

// ============================================================================
// Error Schemas
// ============================================================================

export const UnauthorizedErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Unauthorized',
        }),
    })
    .openapi('UnauthorizedError');

export const NotFoundErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Session not found',
        }),
    })
    .openapi('NotFoundError');

export const ForbiddenErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'You do not have permission to access this session',
        }),
    })
    .openapi('ForbiddenError');

export const BadRequestErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Invalid request',
        }),
    })
    .openapi('BadRequestError');

export const ConflictErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'User already has access to this session',
        }),
    })
    .openapi('ConflictError');

export const RateLimitErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Rate limit exceeded. Maximum 10 invitations per hour.',
        }),
        retryAfter: z.number().int().optional().openapi({
            description: 'Seconds until rate limit resets',
            example: 3600,
        }),
    })
    .openapi('RateLimitError');

export const PasswordRequiredErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Password required',
        }),
        passwordRequired: z.boolean().openapi({
            description: 'Indicates password is required',
            example: true,
        }),
    })
    .openapi('PasswordRequiredError');
