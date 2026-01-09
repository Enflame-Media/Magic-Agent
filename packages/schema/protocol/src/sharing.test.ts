import { describe, it, expect } from 'vitest';
import {
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
} from './sharing';
import { STRING_LIMITS } from './constraints';

// ═══════════════════════════════════════════════════════════════
// SessionSharePermissionSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('SessionSharePermissionSchema', () => {
    it('accepts view_only permission', () => {
        const result = SessionSharePermissionSchema.safeParse('view_only');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('view_only');
        }
    });

    it('accepts view_and_chat permission', () => {
        const result = SessionSharePermissionSchema.safeParse('view_and_chat');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('view_and_chat');
        }
    });

    it('rejects invalid permission', () => {
        const result = SessionSharePermissionSchema.safeParse('admin');
        expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
        const result = SessionSharePermissionSchema.safeParse('');
        expect(result.success).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// SessionShareEntrySchema Tests
// ═══════════════════════════════════════════════════════════════

describe('SessionShareEntrySchema', () => {
    const validEntry = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user_abc123',
        permission: 'view_and_chat' as const,
        sharedAt: '2026-01-04T12:00:00.000Z',
        sharedBy: 'user_xyz789',
    };

    describe('valid data', () => {
        it('validates complete entry without userProfile', () => {
            const result = SessionShareEntrySchema.safeParse(validEntry);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe(validEntry.id);
                expect(result.data.userId).toBe(validEntry.userId);
                expect(result.data.permission).toBe('view_and_chat');
            }
        });

        it('validates entry with userProfile', () => {
            const entryWithProfile = {
                ...validEntry,
                userProfile: {
                    id: 'user_abc123',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    avatar: null,
                    username: 'janedoe',
                    bio: null,
                    status: 'friend' as const,
                },
            };
            const result = SessionShareEntrySchema.safeParse(entryWithProfile);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.userProfile?.firstName).toBe('Jane');
            }
        });

        it('validates view_only permission', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                permission: 'view_only',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects invalid UUID for id', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                id: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
        });

        it('rejects empty userId', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                userId: '',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid permission', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                permission: 'admin',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid datetime format', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                sharedAt: 'not-a-date',
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing required fields', () => {
            const result = SessionShareEntrySchema.safeParse({
                id: validEntry.id,
                userId: validEntry.userId,
            });
            expect(result.success).toBe(false);
        });
    });

    describe('length limits', () => {
        it('rejects userId exceeding ID_MAX', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                userId: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
            });
            expect(result.success).toBe(false);
        });

        it('rejects sharedBy exceeding ID_MAX', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                sharedBy: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
            });
            expect(result.success).toBe(false);
        });

        it('accepts values at exactly the limit', () => {
            const result = SessionShareEntrySchema.safeParse({
                ...validEntry,
                userId: 'x'.repeat(STRING_LIMITS.ID_MAX),
                sharedBy: 'y'.repeat(STRING_LIMITS.ID_MAX),
            });
            expect(result.success).toBe(true);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// SessionShareUrlConfigSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('SessionShareUrlConfigSchema', () => {
    describe('valid data', () => {
        it('validates minimal config (disabled)', () => {
            const config = {
                enabled: false,
                permission: 'view_only' as const,
            };
            const result = SessionShareUrlConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.enabled).toBe(false);
                expect(result.data.token).toBeUndefined();
            }
        });

        it('validates complete enabled config', () => {
            const config = {
                enabled: true,
                token: 'abc123xyz789',
                password: 'secret',
                permission: 'view_and_chat' as const,
                expiresAt: '2026-01-11T12:00:00.000Z',
            };
            const result = SessionShareUrlConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.enabled).toBe(true);
                expect(result.data.token).toBe('abc123xyz789');
                expect(result.data.password).toBe('secret');
            }
        });

        it('validates config without expiration', () => {
            const config = {
                enabled: true,
                token: 'abc123',
                permission: 'view_only' as const,
            };
            const result = SessionShareUrlConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.expiresAt).toBeUndefined();
            }
        });
    });

    describe('invalid data', () => {
        it('rejects missing enabled field', () => {
            const result = SessionShareUrlConfigSchema.safeParse({
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing permission field', () => {
            const result = SessionShareUrlConfigSchema.safeParse({
                enabled: false,
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid expiresAt format', () => {
            const result = SessionShareUrlConfigSchema.safeParse({
                enabled: true,
                permission: 'view_only',
                expiresAt: 'invalid-date',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('length limits', () => {
        it('rejects token exceeding TOKEN_MAX', () => {
            const result = SessionShareUrlConfigSchema.safeParse({
                enabled: true,
                token: 'x'.repeat(STRING_LIMITS.TOKEN_MAX + 1),
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });

        it('rejects password exceeding NAME_MAX', () => {
            const result = SessionShareUrlConfigSchema.safeParse({
                enabled: true,
                password: 'x'.repeat(STRING_LIMITS.NAME_MAX + 1),
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// InvitationStatusSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('InvitationStatusSchema', () => {
    it.each(['pending', 'accepted', 'expired', 'revoked'])('accepts %s status', (status) => {
        const result = InvitationStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
        const result = InvitationStatusSchema.safeParse('cancelled');
        expect(result.success).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
// SessionShareInvitationSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('SessionShareInvitationSchema', () => {
    const validInvitation = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'friend@example.com',
        permission: 'view_only' as const,
        invitedAt: '2026-01-04T12:00:00.000Z',
        invitedBy: 'user_xyz789',
        status: 'pending' as const,
        expiresAt: '2026-01-11T12:00:00.000Z',
    };

    describe('valid data', () => {
        it('validates complete invitation', () => {
            const result = SessionShareInvitationSchema.safeParse(validInvitation);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe('friend@example.com');
                expect(result.data.status).toBe('pending');
            }
        });

        it('validates accepted invitation', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                status: 'accepted',
            });
            expect(result.success).toBe(true);
        });

        it('validates expired invitation', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                status: 'expired',
            });
            expect(result.success).toBe(true);
        });

        it('validates revoked invitation', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                status: 'revoked',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects invalid UUID', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                id: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid email', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                email: 'not-an-email',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid status', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                status: 'invalid',
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing required fields', () => {
            const result = SessionShareInvitationSchema.safeParse({
                id: validInvitation.id,
                email: validInvitation.email,
            });
            expect(result.success).toBe(false);
        });
    });

    describe('length limits', () => {
        it('rejects email exceeding NAME_MAX', () => {
            const longEmail = 'x'.repeat(STRING_LIMITS.NAME_MAX) + '@test.com';
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                email: longEmail,
            });
            expect(result.success).toBe(false);
        });

        it('rejects invitedBy exceeding ID_MAX', () => {
            const result = SessionShareInvitationSchema.safeParse({
                ...validInvitation,
                invitedBy: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// SessionShareSettingsSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('SessionShareSettingsSchema', () => {
    const validSettings = {
        sessionId: 'session_abc123',
        shares: [],
        urlSharing: {
            enabled: false,
            permission: 'view_only' as const,
        },
        invitations: [],
    };

    describe('valid data', () => {
        it('validates empty settings', () => {
            const result = SessionShareSettingsSchema.safeParse(validSettings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.shares).toHaveLength(0);
                expect(result.data.invitations).toHaveLength(0);
            }
        });

        it('validates settings with shares', () => {
            const settingsWithShares = {
                ...validSettings,
                shares: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        userId: 'user_abc123',
                        permission: 'view_and_chat' as const,
                        sharedAt: '2026-01-04T12:00:00.000Z',
                        sharedBy: 'user_xyz789',
                    },
                ],
            };
            const result = SessionShareSettingsSchema.safeParse(settingsWithShares);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.shares).toHaveLength(1);
            }
        });

        it('validates settings with invitations', () => {
            const settingsWithInvitations = {
                ...validSettings,
                invitations: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440000',
                        email: 'friend@example.com',
                        permission: 'view_only' as const,
                        invitedAt: '2026-01-04T12:00:00.000Z',
                        invitedBy: 'user_xyz789',
                        status: 'pending' as const,
                        expiresAt: '2026-01-11T12:00:00.000Z',
                    },
                ],
            };
            const result = SessionShareSettingsSchema.safeParse(settingsWithInvitations);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.invitations).toHaveLength(1);
            }
        });

        it('validates settings with URL sharing enabled', () => {
            const settingsWithUrl = {
                ...validSettings,
                urlSharing: {
                    enabled: true,
                    token: 'abc123',
                    permission: 'view_only' as const,
                },
            };
            const result = SessionShareSettingsSchema.safeParse(settingsWithUrl);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.urlSharing.enabled).toBe(true);
            }
        });
    });

    describe('invalid data', () => {
        it('rejects empty sessionId', () => {
            const result = SessionShareSettingsSchema.safeParse({
                ...validSettings,
                sessionId: '',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid share in array', () => {
            const result = SessionShareSettingsSchema.safeParse({
                ...validSettings,
                shares: [{ id: 'invalid' }],
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid invitation in array', () => {
            const result = SessionShareSettingsSchema.safeParse({
                ...validSettings,
                invitations: [{ id: 'invalid' }],
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing urlSharing', () => {
            const result = SessionShareSettingsSchema.safeParse({
                sessionId: 'session_abc123',
                shares: [],
                invitations: [],
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// AddSessionShareRequestSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('AddSessionShareRequestSchema', () => {
    describe('valid data', () => {
        it('validates request with userId', () => {
            const request = {
                sessionId: 'session_abc123',
                userId: 'user_xyz789',
                permission: 'view_and_chat' as const,
            };
            const result = AddSessionShareRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('validates request with email', () => {
            const request = {
                sessionId: 'session_abc123',
                email: 'friend@example.com',
                permission: 'view_only' as const,
            };
            const result = AddSessionShareRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('validates request with both userId and email', () => {
            const request = {
                sessionId: 'session_abc123',
                userId: 'user_xyz789',
                email: 'friend@example.com',
                permission: 'view_only' as const,
            };
            const result = AddSessionShareRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });
    });

    describe('refine validation', () => {
        it('rejects request without userId or email', () => {
            const request = {
                sessionId: 'session_abc123',
                permission: 'view_only' as const,
            };
            const result = AddSessionShareRequestSchema.safeParse(request);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Either userId or email must be provided');
            }
        });
    });

    describe('invalid data', () => {
        it('rejects empty sessionId', () => {
            const result = AddSessionShareRequestSchema.safeParse({
                sessionId: '',
                userId: 'user_xyz789',
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid email format', () => {
            const result = AddSessionShareRequestSchema.safeParse({
                sessionId: 'session_abc123',
                email: 'not-an-email',
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });

        it('rejects empty userId when provided', () => {
            const result = AddSessionShareRequestSchema.safeParse({
                sessionId: 'session_abc123',
                userId: '',
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// UpdateSessionShareRequestSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('UpdateSessionShareRequestSchema', () => {
    describe('valid data', () => {
        it('validates complete request', () => {
            const request = {
                shareId: '550e8400-e29b-41d4-a716-446655440000',
                permission: 'view_only' as const,
            };
            const result = UpdateSessionShareRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects invalid UUID', () => {
            const result = UpdateSessionShareRequestSchema.safeParse({
                shareId: 'not-a-uuid',
                permission: 'view_only',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid permission', () => {
            const result = UpdateSessionShareRequestSchema.safeParse({
                shareId: '550e8400-e29b-41d4-a716-446655440000',
                permission: 'admin',
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// RemoveSessionShareRequestSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('RemoveSessionShareRequestSchema', () => {
    describe('valid data', () => {
        it('validates complete request', () => {
            const result = RemoveSessionShareRequestSchema.safeParse({
                shareId: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects invalid UUID', () => {
            const result = RemoveSessionShareRequestSchema.safeParse({
                shareId: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing shareId', () => {
            const result = RemoveSessionShareRequestSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// UpdateUrlSharingRequestSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('UpdateUrlSharingRequestSchema', () => {
    describe('valid data', () => {
        it('validates enable request', () => {
            const request = {
                sessionId: 'session_abc123',
                enabled: true,
            };
            const result = UpdateUrlSharingRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('validates disable request', () => {
            const request = {
                sessionId: 'session_abc123',
                enabled: false,
            };
            const result = UpdateUrlSharingRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('validates request with password', () => {
            const request = {
                sessionId: 'session_abc123',
                enabled: true,
                password: 'secret123',
            };
            const result = UpdateUrlSharingRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('validates request with null password to remove', () => {
            const request = {
                sessionId: 'session_abc123',
                enabled: true,
                password: null,
            };
            const result = UpdateUrlSharingRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });

        it('validates request with permission change', () => {
            const request = {
                sessionId: 'session_abc123',
                enabled: true,
                permission: 'view_and_chat' as const,
            };
            const result = UpdateUrlSharingRequestSchema.safeParse(request);
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects empty sessionId', () => {
            const result = UpdateUrlSharingRequestSchema.safeParse({
                sessionId: '',
                enabled: true,
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing enabled field', () => {
            const result = UpdateUrlSharingRequestSchema.safeParse({
                sessionId: 'session_abc123',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid permission', () => {
            const result = UpdateUrlSharingRequestSchema.safeParse({
                sessionId: 'session_abc123',
                enabled: true,
                permission: 'invalid',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('length limits', () => {
        it('rejects password exceeding NAME_MAX', () => {
            const result = UpdateUrlSharingRequestSchema.safeParse({
                sessionId: 'session_abc123',
                enabled: true,
                password: 'x'.repeat(STRING_LIMITS.NAME_MAX + 1),
            });
            expect(result.success).toBe(false);
        });

        it('rejects sessionId exceeding ID_MAX', () => {
            const result = UpdateUrlSharingRequestSchema.safeParse({
                sessionId: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
                enabled: true,
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// RevokeInvitationRequestSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('RevokeInvitationRequestSchema', () => {
    describe('valid data', () => {
        it('validates complete request', () => {
            const result = RevokeInvitationRequestSchema.safeParse({
                invitationId: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects invalid UUID', () => {
            const result = RevokeInvitationRequestSchema.safeParse({
                invitationId: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
        });

        it('rejects missing invitationId', () => {
            const result = RevokeInvitationRequestSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// ResendInvitationRequestSchema Tests
// ═══════════════════════════════════════════════════════════════

describe('ResendInvitationRequestSchema', () => {
    describe('valid data', () => {
        it('validates complete request', () => {
            const result = ResendInvitationRequestSchema.safeParse({
                invitationId: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(result.success).toBe(true);
        });
    });

    describe('invalid data', () => {
        it('rejects invalid UUID', () => {
            const result = ResendInvitationRequestSchema.safeParse({
                invitationId: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// Real-world Scenarios
// ═══════════════════════════════════════════════════════════════

describe('Real-world scenarios', () => {
    it('validates complete session sharing workflow', () => {
        // 1. Start with empty settings
        const initialSettings = {
            sessionId: 'session_prod_12345',
            shares: [],
            urlSharing: { enabled: false, permission: 'view_only' as const },
            invitations: [],
        };
        expect(SessionShareSettingsSchema.safeParse(initialSettings).success).toBe(true);

        // 2. Add a share via userId
        const addUserRequest = {
            sessionId: 'session_prod_12345',
            userId: 'user_colleague_001',
            permission: 'view_and_chat' as const,
        };
        expect(AddSessionShareRequestSchema.safeParse(addUserRequest).success).toBe(true);

        // 3. Invite someone via email
        const inviteRequest = {
            sessionId: 'session_prod_12345',
            email: 'external@company.com',
            permission: 'view_only' as const,
        };
        expect(AddSessionShareRequestSchema.safeParse(inviteRequest).success).toBe(true);

        // 4. Enable URL sharing with password
        const urlRequest = {
            sessionId: 'session_prod_12345',
            enabled: true,
            password: 'TeamSecret123',
            permission: 'view_only' as const,
        };
        expect(UpdateUrlSharingRequestSchema.safeParse(urlRequest).success).toBe(true);

        // 5. Full settings after all operations
        const fullSettings = {
            sessionId: 'session_prod_12345',
            shares: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    userId: 'user_colleague_001',
                    userProfile: {
                        id: 'user_colleague_001',
                        firstName: 'Alice',
                        lastName: 'Smith',
                        avatar: null,
                        username: 'asmith',
                        bio: 'Engineer',
                        status: 'friend' as const,
                    },
                    permission: 'view_and_chat' as const,
                    sharedAt: '2026-01-04T14:00:00.000Z',
                    sharedBy: 'user_owner_999',
                },
            ],
            urlSharing: {
                enabled: true,
                token: 'share_token_abc123xyz789',
                password: 'TeamSecret123',
                permission: 'view_only' as const,
                expiresAt: '2026-02-04T14:00:00.000Z',
            },
            invitations: [
                {
                    id: '660e8400-e29b-41d4-a716-446655440001',
                    email: 'external@company.com',
                    permission: 'view_only' as const,
                    invitedAt: '2026-01-04T14:30:00.000Z',
                    invitedBy: 'user_owner_999',
                    status: 'pending' as const,
                    expiresAt: '2026-01-11T14:30:00.000Z',
                },
            ],
        };
        const result = SessionShareSettingsSchema.safeParse(fullSettings);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.shares).toHaveLength(1);
            expect(result.data.invitations).toHaveLength(1);
            expect(result.data.urlSharing.enabled).toBe(true);
        }
    });
});
