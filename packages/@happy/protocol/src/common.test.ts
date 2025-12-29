import { describe, it, expect } from 'vitest';
import {
    GitHubProfileSchema,
    UserProfileSchema,
    ImageRefSchema,
    EncryptedContentSchema,
    VersionedValueSchema,
} from './common';
import { STRING_LIMITS } from './constraints';
import { ApiUpdateNewSessionSchema } from './updates/session';
import { ApiMessageSchema } from './updates/message';

describe('GitHubProfileSchema', () => {
    describe('required fields', () => {
        it('validates profile with all required fields', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });

        it('rejects profile without id', () => {
            const profile = {
                login: 'octocat',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(false);
        });

        it('rejects profile without login', () => {
            const profile = {
                id: 12345,
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(false);
        });
    });

    describe('nullable name field (HAP-432)', () => {
        it('accepts profile with null name', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                name: null,
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBeNull();
            }
        });

        it('accepts profile without name field', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBeUndefined();
            }
        });

        it('accepts profile with valid name', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                name: 'The Octocat',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('The Octocat');
            }
        });
    });

    describe('optional fields', () => {
        it('accepts profile without avatar_url', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });

        it('accepts profile with avatar_url', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                avatar_url: 'https://avatars.githubusercontent.com/u/12345',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });

        it('accepts null email', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                email: null,
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });

        it('accepts null bio', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                bio: null,
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });
    });

    describe('strip behavior (HAP-626)', () => {
        it('strips unknown fields from GitHub API response', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                name: 'The Octocat',
                avatar_url: 'https://avatars.githubusercontent.com/u/12345',
                // Additional fields from GitHub API - should be stripped
                node_id: 'MDQ6VXNlcjE=',
                gravatar_id: '',
                url: 'https://api.github.com/users/octocat',
                html_url: 'https://github.com/octocat',
                followers_url: 'https://api.github.com/users/octocat/followers',
                type: 'User',
                site_admin: false,
                company: '@github',
                followers: 12345,
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
            if (result.success) {
                // Known fields are preserved
                expect(result.data.id).toBe(12345);
                expect(result.data.login).toBe('octocat');
                expect(result.data.name).toBe('The Octocat');
                expect(result.data.avatar_url).toBe('https://avatars.githubusercontent.com/u/12345');

                // Unknown fields are stripped
                expect('node_id' in result.data).toBe(false);
                expect('type' in result.data).toBe(false);
                expect('followers' in result.data).toBe(false);
                expect('company' in result.data).toBe(false);
            }
        });

        it('validates successfully even when GitHub adds new fields', () => {
            // Simulates GitHub API adding new fields in the future
            const profile = {
                id: 99999,
                login: 'newuser',
                some_new_field_from_github: 'value',
                another_future_field: { nested: true },
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });
    });

    describe('security (HAP-626)', () => {
        it('strips prototype pollution attempts via __proto__', () => {
            // Note: In JavaScript, setting __proto__ in an object literal actually
            // sets the prototype, it doesn't add an own property. We test with
            // Object.defineProperty to simulate a malicious JSON payload.
            const maliciousProfile = Object.defineProperty(
                { id: 12345, login: 'attacker' },
                '__proto__',
                { value: { isAdmin: true }, enumerable: true, writable: true }
            );
            const result = GitHubProfileSchema.safeParse(maliciousProfile);
            expect(result.success).toBe(true);
            if (result.success) {
                // __proto__ should not be an own property in the result
                expect(Object.hasOwn(result.data, '__proto__')).toBe(false);
                // Verify no prototype pollution occurred
                expect(({} as { isAdmin?: boolean }).isAdmin).toBeUndefined();
            }
        });

        it('strips prototype pollution attempts via constructor', () => {
            const maliciousProfile = {
                id: 12345,
                login: 'attacker',
                constructor: { prototype: { polluted: true } },
            };
            const result = GitHubProfileSchema.safeParse(maliciousProfile);
            expect(result.success).toBe(true);
            if (result.success) {
                // constructor should not be in result (it's an unknown field)
                const data = result.data as Record<string, unknown>;
                expect('constructor' in data && typeof data.constructor === 'object').toBe(false);
            }
        });

        it('strips potential storage bloat attacks', () => {
            const bloatProfile = {
                id: 12345,
                login: 'bloater',
                // Large unexpected field that could bloat storage
                largeUnexpectedField: 'x'.repeat(10000),
                anotherLargeField: Array(1000).fill({ nested: 'data' }),
            };
            const result = GitHubProfileSchema.safeParse(bloatProfile);
            expect(result.success).toBe(true);
            if (result.success) {
                // Only expected fields in result
                expect(Object.keys(result.data)).toEqual(['id', 'login']);
                // Verify bloat fields are not present
                expect('largeUnexpectedField' in result.data).toBe(false);
                expect('anotherLargeField' in result.data).toBe(false);
            }
        });
    });
});

/**
 * Input Validation Tests (HAP-629)
 *
 * Verifies that all schemas properly reject oversized inputs
 * to prevent DoS and storage bloat attacks.
 */
describe('Input validation (HAP-629)', () => {
    describe('STRING_LIMITS constants', () => {
        it('defines expected limits', () => {
            // Verify key limits are defined
            expect(STRING_LIMITS.TITLE_MAX).toBe(256);
            expect(STRING_LIMITS.NAME_MAX).toBe(128);
            expect(STRING_LIMITS.DESCRIPTION_MAX).toBe(4096);
            expect(STRING_LIMITS.CONTENT_MAX).toBe(1_000_000);
            expect(STRING_LIMITS.ID_MAX).toBe(128);
            expect(STRING_LIMITS.URL_MAX).toBe(2048);
        });
    });

    describe('GitHubProfileSchema length limits', () => {
        it('rejects login exceeding USERNAME_MAX', () => {
            const profile = {
                id: 12345,
                login: 'x'.repeat(STRING_LIMITS.USERNAME_MAX + 1),
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(false);
        });

        it('rejects name exceeding NAME_MAX', () => {
            const profile = {
                id: 12345,
                login: 'valid',
                name: 'x'.repeat(STRING_LIMITS.NAME_MAX + 1),
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(false);
        });

        it('rejects bio exceeding BIO_MAX', () => {
            const profile = {
                id: 12345,
                login: 'valid',
                bio: 'x'.repeat(STRING_LIMITS.BIO_MAX + 1),
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(false);
        });

        it('accepts values at exactly the limit', () => {
            const profile = {
                id: 12345,
                login: 'x'.repeat(STRING_LIMITS.USERNAME_MAX),
                name: 'y'.repeat(STRING_LIMITS.NAME_MAX),
                bio: 'z'.repeat(STRING_LIMITS.BIO_MAX),
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
        });
    });

    describe('ImageRefSchema length limits', () => {
        it('rejects path exceeding PATH_MAX', () => {
            const image = {
                path: 'x'.repeat(STRING_LIMITS.PATH_MAX + 1),
                url: 'https://example.com/image.jpg',
            };
            const result = ImageRefSchema.safeParse(image);
            expect(result.success).toBe(false);
        });

        it('rejects URL exceeding URL_MAX', () => {
            const image = {
                path: 'valid/path.jpg',
                url: 'https://example.com/' + 'x'.repeat(STRING_LIMITS.URL_MAX),
            };
            const result = ImageRefSchema.safeParse(image);
            expect(result.success).toBe(false);
        });

        it('rejects empty path', () => {
            const image = {
                path: '',
                url: 'https://example.com/image.jpg',
            };
            const result = ImageRefSchema.safeParse(image);
            expect(result.success).toBe(false);
        });
    });

    describe('UserProfileSchema length limits', () => {
        it('rejects id exceeding ID_MAX', () => {
            const user = {
                id: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
                firstName: 'Jane',
                lastName: 'Doe',
                avatar: null,
                username: 'janedoe',
                bio: null,
                status: 'none' as const,
            };
            const result = UserProfileSchema.safeParse(user);
            expect(result.success).toBe(false);
        });

        it('rejects username exceeding USERNAME_MAX', () => {
            const user = {
                id: 'user_123',
                firstName: 'Jane',
                lastName: 'Doe',
                avatar: null,
                username: 'x'.repeat(STRING_LIMITS.USERNAME_MAX + 1),
                bio: null,
                status: 'none' as const,
            };
            const result = UserProfileSchema.safeParse(user);
            expect(result.success).toBe(false);
        });
    });

    describe('EncryptedContentSchema length limits', () => {
        it('rejects content exceeding CONTENT_MAX', () => {
            const content = {
                t: 'encrypted' as const,
                c: 'x'.repeat(STRING_LIMITS.CONTENT_MAX + 1),
            };
            const result = EncryptedContentSchema.safeParse(content);
            expect(result.success).toBe(false);
        });

        it('accepts content at exactly CONTENT_MAX', () => {
            const content = {
                t: 'encrypted' as const,
                c: 'x'.repeat(STRING_LIMITS.CONTENT_MAX),
            };
            const result = EncryptedContentSchema.safeParse(content);
            expect(result.success).toBe(true);
        });
    });

    describe('VersionedValueSchema length limits', () => {
        it('rejects value exceeding VERSIONED_VALUE_MAX', () => {
            const versioned = {
                version: 1,
                value: 'x'.repeat(STRING_LIMITS.VERSIONED_VALUE_MAX + 1),
            };
            const result = VersionedValueSchema.safeParse(versioned);
            expect(result.success).toBe(false);
        });
    });

    describe('ApiUpdateNewSessionSchema length limits', () => {
        it('rejects session ID exceeding ID_MAX', () => {
            const session = {
                t: 'new-session' as const,
                id: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
                seq: 1,
                metadata: 'encrypted',
                metadataVersion: 1,
                agentState: null,
                agentStateVersion: 0,
                dataEncryptionKey: null,
                active: true,
                activeAt: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const result = ApiUpdateNewSessionSchema.safeParse(session);
            expect(result.success).toBe(false);
        });

        it('rejects metadata exceeding ENCRYPTED_STATE_MAX', () => {
            const session = {
                t: 'new-session' as const,
                id: 'session_valid',
                seq: 1,
                metadata: 'x'.repeat(STRING_LIMITS.ENCRYPTED_STATE_MAX + 1),
                metadataVersion: 1,
                agentState: null,
                agentStateVersion: 0,
                dataEncryptionKey: null,
                active: true,
                activeAt: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const result = ApiUpdateNewSessionSchema.safeParse(session);
            expect(result.success).toBe(false);
        });

        it('rejects empty session ID', () => {
            const session = {
                t: 'new-session' as const,
                id: '',
                seq: 1,
                metadata: 'encrypted',
                metadataVersion: 1,
                agentState: null,
                agentStateVersion: 0,
                dataEncryptionKey: null,
                active: true,
                activeAt: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const result = ApiUpdateNewSessionSchema.safeParse(session);
            expect(result.success).toBe(false);
        });
    });

    describe('ApiMessageSchema length limits', () => {
        it('rejects message ID exceeding ID_MAX', () => {
            const message = {
                id: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
                seq: 1,
                content: { t: 'encrypted' as const, c: 'data' },
                createdAt: Date.now(),
            };
            const result = ApiMessageSchema.safeParse(message);
            expect(result.success).toBe(false);
        });

        it('rejects empty message ID', () => {
            const message = {
                id: '',
                seq: 1,
                content: { t: 'encrypted' as const, c: 'data' },
                createdAt: Date.now(),
            };
            const result = ApiMessageSchema.safeParse(message);
            expect(result.success).toBe(false);
        });

        it('accepts valid message with all fields within limits', () => {
            const message = {
                id: 'msg_' + 'x'.repeat(100),
                seq: 42,
                localId: 'local_123',
                content: { t: 'encrypted' as const, c: 'valid_encrypted_content' },
                createdAt: Date.now(),
            };
            const result = ApiMessageSchema.safeParse(message);
            expect(result.success).toBe(true);
        });
    });
});
