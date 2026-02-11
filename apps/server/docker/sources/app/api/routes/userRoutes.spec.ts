import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID, TEST_USER_ID_2 } from './__test__/testUtils';
import { userRoutes } from './userRoutes';
import type { Fastify } from '../types';

// Define RelationshipStatus enum locally to avoid Prisma client dependency
const RelationshipStatus = {
    none: 'none',
    requested: 'requested',
    pending: 'pending',
    friend: 'friend',
    rejected: 'rejected',
} as const;

// Mock @prisma/client before any imports that depend on it
vi.mock('@prisma/client', () => ({
    RelationshipStatus: {
        none: 'none',
        requested: 'requested',
        pending: 'pending',
        friend: 'friend',
        rejected: 'rejected',
    },
}));

// Mock external dependencies
vi.mock('@/storage/db', () => ({
    db: {
        account: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
        userRelationship: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock('@/storage/files', () => ({
    getPublicUrl: vi.fn((path: string) => `https://cdn.example.com/${path}`),
}));

vi.mock('@/app/social/friendAdd', () => ({
    friendAdd: vi.fn(),
}));

vi.mock('@/app/social/friendRemove', () => ({
    friendRemove: vi.fn(),
}));

vi.mock('@/app/social/friendList', () => ({
    friendList: vi.fn(),
}));

import { db } from '@/storage/db';
import { friendAdd } from '@/app/social/friendAdd';
import { friendRemove } from '@/app/social/friendRemove';
import { friendList } from '@/app/social/friendList';

describe('userRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        await userRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /v1/user/:id', () => {
        it('should return user profile with relationship status', async () => {
            const mockUser = {
                id: TEST_USER_ID_2,
                firstName: 'Jane',
                lastName: 'Smith',
                username: 'janesmith',
                avatar: { path: 'avatars/456.jpg', width: 100, height: 100 },
                githubUser: { profile: { login: 'janesmith', bio: 'Engineer' } },
            };
            vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
            vi.mocked(db.userRelationship.findFirst).mockResolvedValue({
                status: RelationshipStatus.friend,
            } as any);

            const response = await app.inject({
                method: 'GET',
                url: `/v1/user/${TEST_USER_ID_2}`,
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.user).toBeDefined();
            expect(body.user.id).toBe(TEST_USER_ID_2);
            expect(body.user.firstName).toBe('Jane');
            expect(body.user.status).toBe('friend');
        });

        it('should return 404 when user not found', async () => {
            vi.mocked(db.account.findUnique).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/user/non-existent-user',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('User not found');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: `/v1/user/${TEST_USER_ID_2}`,
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return none status when no relationship exists', async () => {
            const mockUser = {
                id: TEST_USER_ID_2,
                firstName: 'Stranger',
                lastName: null,
                username: 'stranger',
                avatar: null,
                githubUser: null,
            };
            vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
            vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: `/v1/user/${TEST_USER_ID_2}`,
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.user.status).toBe('none');
        });

        // HAP-786: profileVisibility privacy enforcement tests
        describe('profileVisibility privacy enforcement (HAP-786)', () => {
            it('should return full profile for friends-only profile when viewer is a friend', async () => {
                const mockUser = {
                    id: TEST_USER_ID_2,
                    firstName: 'Private',
                    lastName: 'Person',
                    username: 'privateperson',
                    profileVisibility: 'friends-only',
                    avatar: { path: 'avatars/private.jpg', width: 100, height: 100 },
                    githubUser: { profile: { login: 'privateperson', bio: 'Private bio' } },
                };
                vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue({
                    status: RelationshipStatus.friend,
                } as any);

                const response = await app.inject({
                    method: 'GET',
                    url: `/v1/user/${TEST_USER_ID_2}`,
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.user.id).toBe(TEST_USER_ID_2);
                expect(body.user.firstName).toBe('Private');
                expect(body.user.lastName).toBe('Person');
                expect(body.user.bio).toBe('Private bio');
                expect(body.user.isPrivate).toBeUndefined();
            });

            it('should return restricted profile with isPrivate flag for friends-only profile when viewer is not a friend', async () => {
                const mockUser = {
                    id: TEST_USER_ID_2,
                    firstName: 'Private',
                    lastName: 'Person',
                    username: 'privateperson',
                    profileVisibility: 'friends-only',
                    avatar: { path: 'avatars/private.jpg', width: 100, height: 100 },
                    githubUser: { profile: { login: 'privateperson', bio: 'Private bio' } },
                };
                vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

                const response = await app.inject({
                    method: 'GET',
                    url: `/v1/user/${TEST_USER_ID_2}`,
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.user.id).toBe(TEST_USER_ID_2);
                expect(body.user.firstName).toBe('Private');
                expect(body.user.lastName).toBeNull();
                expect(body.user.bio).toBeNull();
                expect(body.user.isPrivate).toBe(true);
            });

            it('should return restricted profile for friends-only profile when relationship is pending', async () => {
                const mockUser = {
                    id: TEST_USER_ID_2,
                    firstName: 'Private',
                    lastName: 'Person',
                    username: 'privateperson',
                    profileVisibility: 'friends-only',
                    avatar: null,
                    githubUser: { profile: { login: 'privateperson', bio: 'Secret bio' } },
                };
                vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue({
                    status: RelationshipStatus.pending,
                } as any);

                const response = await app.inject({
                    method: 'GET',
                    url: `/v1/user/${TEST_USER_ID_2}`,
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.user.isPrivate).toBe(true);
                expect(body.user.lastName).toBeNull();
                expect(body.user.bio).toBeNull();
            });

            it('should return full profile for public visibility to all users', async () => {
                const mockUser = {
                    id: TEST_USER_ID_2,
                    firstName: 'Public',
                    lastName: 'Person',
                    username: 'publicperson',
                    profileVisibility: 'public',
                    avatar: null,
                    githubUser: { profile: { login: 'publicperson', bio: 'Public bio' } },
                };
                vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

                const response = await app.inject({
                    method: 'GET',
                    url: `/v1/user/${TEST_USER_ID_2}`,
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.user.firstName).toBe('Public');
                expect(body.user.lastName).toBe('Person');
                expect(body.user.bio).toBe('Public bio');
                expect(body.user.isPrivate).toBeUndefined();
            });

            it('should return full profile when profileVisibility is not set (default public)', async () => {
                const mockUser = {
                    id: TEST_USER_ID_2,
                    firstName: 'Default',
                    lastName: 'User',
                    username: 'defaultuser',
                    // profileVisibility is undefined (not set)
                    avatar: null,
                    githubUser: { profile: { login: 'defaultuser', bio: 'Default bio' } },
                };
                vi.mocked(db.account.findUnique).mockResolvedValue(mockUser as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

                const response = await app.inject({
                    method: 'GET',
                    url: `/v1/user/${TEST_USER_ID_2}`,
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.user.firstName).toBe('Default');
                expect(body.user.lastName).toBe('User');
                expect(body.user.bio).toBe('Default bio');
                expect(body.user.isPrivate).toBeUndefined();
            });
        });
    });

    describe('GET /v1/user/search', () => {
        it('should return matching users by username prefix', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    firstName: 'John',
                    lastName: 'Doe',
                    username: 'johndoe',
                    avatar: null,
                    githubUser: null,
                },
                {
                    id: 'user-2',
                    firstName: 'Johnny',
                    lastName: 'Appleseed',
                    username: 'johnnyapple',
                    avatar: null,
                    githubUser: null,
                },
            ];
            vi.mocked(db.account.findMany).mockResolvedValue(mockUsers as any);
            vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/user/search?query=john',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.users).toHaveLength(2);
            expect(body.users[0].username).toBe('johndoe');
            expect(body.users[1].username).toBe('johnnyapple');
        });

        it('should return empty array when no users match', async () => {
            vi.mocked(db.account.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/user/search?query=xyz123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.users).toHaveLength(0);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/user/search?query=test',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should include relationship status for each user', async () => {
            const mockUsers = [
                {
                    id: 'friend-user',
                    firstName: 'Friend',
                    lastName: null,
                    username: 'friend',
                    avatar: null,
                    githubUser: null,
                },
            ];
            vi.mocked(db.account.findMany).mockResolvedValue(mockUsers as any);
            vi.mocked(db.userRelationship.findFirst).mockResolvedValue({
                status: RelationshipStatus.friend,
            } as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/user/search?query=friend',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.users[0].status).toBe('friend');
        });

        // HAP-786: profileVisibility privacy enforcement tests for search
        describe('profileVisibility privacy enforcement (HAP-786)', () => {
            it('should return full profiles for friends-only users when viewer is their friend', async () => {
                const mockUsers = [
                    {
                        id: 'private-friend',
                        firstName: 'Private',
                        lastName: 'Friend',
                        username: 'privatefriend',
                        profileVisibility: 'friends-only',
                        avatar: null,
                        githubUser: { profile: { login: 'privatefriend', bio: 'Friend bio' } },
                    },
                ];
                vi.mocked(db.account.findMany).mockResolvedValue(mockUsers as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue({
                    status: RelationshipStatus.friend,
                } as any);

                const response = await app.inject({
                    method: 'GET',
                    url: '/v1/user/search?query=private',
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.users).toHaveLength(1);
                expect(body.users[0].firstName).toBe('Private');
                expect(body.users[0].lastName).toBe('Friend');
                expect(body.users[0].bio).toBe('Friend bio');
                expect(body.users[0].isPrivate).toBeUndefined();
            });

            it('should return restricted profiles with isPrivate flag for friends-only users when viewer is not a friend', async () => {
                const mockUsers = [
                    {
                        id: 'private-stranger',
                        firstName: 'Private',
                        lastName: 'Stranger',
                        username: 'privatestranger',
                        profileVisibility: 'friends-only',
                        avatar: null,
                        githubUser: { profile: { login: 'privatestranger', bio: 'Hidden bio' } },
                    },
                ];
                vi.mocked(db.account.findMany).mockResolvedValue(mockUsers as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

                const response = await app.inject({
                    method: 'GET',
                    url: '/v1/user/search?query=private',
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.users).toHaveLength(1);
                expect(body.users[0].firstName).toBe('Private');
                expect(body.users[0].lastName).toBeNull();
                expect(body.users[0].bio).toBeNull();
                expect(body.users[0].isPrivate).toBe(true);
            });

            it('should correctly apply profileVisibility to multiple users with mixed privacy settings', async () => {
                const mockUsers = [
                    {
                        id: 'private-user',
                        firstName: 'Private',
                        lastName: 'User',
                        username: 'private1',
                        profileVisibility: 'friends-only',
                        avatar: null,
                        githubUser: { profile: { login: 'private1', bio: 'Private bio' } },
                    },
                    {
                        id: 'public-user',
                        firstName: 'Public',
                        lastName: 'User',
                        username: 'public1',
                        profileVisibility: 'public',
                        avatar: null,
                        githubUser: { profile: { login: 'public1', bio: 'Public bio' } },
                    },
                ];
                vi.mocked(db.account.findMany).mockResolvedValue(mockUsers as any);
                // No relationship with either user
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

                const response = await app.inject({
                    method: 'GET',
                    url: '/v1/user/search?query=user',
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.users).toHaveLength(2);
                // Private user should have restricted profile
                const privateUser = body.users.find((u: any) => u.id === 'private-user');
                expect(privateUser.isPrivate).toBe(true);
                expect(privateUser.lastName).toBeNull();
                expect(privateUser.bio).toBeNull();
                // Public user should have full profile
                const publicUser = body.users.find((u: any) => u.id === 'public-user');
                expect(publicUser.isPrivate).toBeUndefined();
                expect(publicUser.lastName).toBe('User');
                expect(publicUser.bio).toBe('Public bio');
            });

            it('should return full profile for public visibility in search results', async () => {
                const mockUsers = [
                    {
                        id: 'public-user',
                        firstName: 'Openly',
                        lastName: 'Public',
                        username: 'openlypublic',
                        profileVisibility: 'public',
                        avatar: null,
                        githubUser: { profile: { login: 'openlypublic', bio: 'Everyone can see this' } },
                    },
                ];
                vi.mocked(db.account.findMany).mockResolvedValue(mockUsers as any);
                vi.mocked(db.userRelationship.findFirst).mockResolvedValue(null);

                const response = await app.inject({
                    method: 'GET',
                    url: '/v1/user/search?query=openly',
                    headers: authHeader(),
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.users[0].lastName).toBe('Public');
                expect(body.users[0].bio).toBe('Everyone can see this');
                expect(body.users[0].isPrivate).toBeUndefined();
            });
        });
    });

    describe('POST /v1/friends/add', () => {
        it('should add friend successfully', async () => {
            const mockProfile = {
                id: TEST_USER_ID_2,
                firstName: 'New',
                lastName: 'Friend',
                username: 'newfriend',
                avatar: null,
                bio: null,
                status: RelationshipStatus.requested,
            };
            vi.mocked(friendAdd).mockResolvedValue(mockProfile);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/friends/add',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    uid: TEST_USER_ID_2,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.user).toBeDefined();
            expect(body.user.id).toBe(TEST_USER_ID_2);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/friends/add',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    uid: TEST_USER_ID_2,
                },
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('POST /v1/friends/remove', () => {
        it('should remove friend successfully', async () => {
            const mockProfile = {
                id: TEST_USER_ID_2,
                firstName: 'Ex',
                lastName: 'Friend',
                username: 'exfriend',
                avatar: null,
                bio: null,
                status: RelationshipStatus.none,
            };
            vi.mocked(friendRemove).mockResolvedValue(mockProfile);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/friends/remove',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    uid: TEST_USER_ID_2,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.user).toBeDefined();
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/friends/remove',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    uid: TEST_USER_ID_2,
                },
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('GET /v1/friends', () => {
        it('should return list of friends', async () => {
            const mockFriends = [
                {
                    id: 'friend-1',
                    firstName: 'Friend',
                    lastName: 'One',
                    username: 'friend1',
                    avatar: null,
                    bio: null,
                    status: RelationshipStatus.friend,
                },
                {
                    id: 'friend-2',
                    firstName: 'Friend',
                    lastName: 'Two',
                    username: 'friend2',
                    avatar: null,
                    bio: null,
                    status: RelationshipStatus.friend,
                },
            ];
            vi.mocked(friendList).mockResolvedValue(mockFriends);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/friends',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.friends).toHaveLength(2);
        });

        it('should return empty array when user has no friends', async () => {
            vi.mocked(friendList).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/friends',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.friends).toHaveLength(0);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/friends',
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
