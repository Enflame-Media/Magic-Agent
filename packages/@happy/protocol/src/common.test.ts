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

    describe('passthrough behavior', () => {
        it('allows additional GitHub fields', () => {
            const profile = {
                id: 12345,
                login: 'octocat',
                name: 'The Octocat',
                avatar_url: 'https://avatars.githubusercontent.com/u/12345',
                // Additional fields from GitHub API
                node_id: 'MDQ6VXNlcjE=',
                gravatar_id: '',
                url: 'https://api.github.com/users/octocat',
                html_url: 'https://github.com/octocat',
                followers_url: 'https://api.github.com/users/octocat/followers',
                following_url: 'https://api.github.com/users/octocat/following{/other_user}',
                gists_url: 'https://api.github.com/users/octocat/gists{/gist_id}',
                repos_url: 'https://api.github.com/users/octocat/repos',
                type: 'User',
                site_admin: false,
                company: '@github',
                blog: 'https://github.blog',
                location: 'San Francisco',
                hireable: null,
                twitter_username: null,
                public_repos: 8,
                public_gists: 8,
                followers: 12345,
                following: 0,
                created_at: '2011-01-25T18:44:36Z',
                updated_at: '2024-01-01T00:00:00Z',
            };
            const result = GitHubProfileSchema.safeParse(profile);
            expect(result.success).toBe(true);
            if (result.success) {
                // Additional fields should be preserved
                expect(result.data.node_id).toBe('MDQ6VXNlcjE=');
                expect(result.data.type).toBe('User');
                expect(result.data.followers).toBe(12345);
            }
        });
    });
});
