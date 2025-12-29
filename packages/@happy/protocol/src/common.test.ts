import { describe, it, expect } from 'vitest';
import { GitHubProfileSchema } from './common';

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
