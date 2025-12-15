import fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { type Fastify } from "../../types";
import { vi } from "vitest";

/**
 * Test user data for mocking authenticated requests
 */
export const TEST_USER_ID = 'test-user-123';
export const TEST_USER_ID_2 = 'test-user-456';

/**
 * Creates a test Fastify app with Zod validation and mocked authentication
 * The authenticate decorator is mocked to always succeed for valid tokens
 */
export function createTestApp(): Fastify {
    const app = fastify({
        logger: false, // Disable logging in tests
    });

    // Set up Zod type provider
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    const typed = app.withTypeProvider<ZodTypeProvider>() as unknown as Fastify;

    // Mock the authenticate decorator
    typed.decorate('authenticate', async function (request: any, reply: any) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Missing authorization header' });
        }

        const token = authHeader.substring(7);

        // Allow specific test tokens
        if (token === 'valid-token') {
            request.userId = TEST_USER_ID;
        } else if (token === 'valid-token-2') {
            request.userId = TEST_USER_ID_2;
        } else if (token.startsWith('user-')) {
            // Allow custom user ID tokens like "user-custom123"
            request.userId = token.substring(5);
        } else {
            return reply.code(401).send({ error: 'Invalid token' });
        }
    });

    return typed;
}

/**
 * Helper to create Authorization header with test token
 */
export function authHeader(token: string = 'valid-token'): { Authorization: string } {
    return { Authorization: `Bearer ${token}` };
}

/**
 * Helper to generate random CUID-like IDs for testing
 */
export function randomId(prefix: string = ''): string {
    return `${prefix}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Creates mock session data for testing
 */
export function createMockSession(overrides: Partial<{
    id: string;
    accountId: string;
    tag: string;
    metadata: string;
    metadataVersion: number;
    agentState: string | null;
    agentStateVersion: number;
    dataEncryptionKey: Uint8Array | null;
    seq: number;
    active: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}> = {}) {
    const now = new Date();
    return {
        id: randomId('sess-'),
        accountId: TEST_USER_ID,
        tag: 'test-tag-' + randomId(),
        metadata: '{"encrypted": true}',
        metadataVersion: 1,
        agentState: null,
        agentStateVersion: 0,
        dataEncryptionKey: null,
        seq: 0,
        active: true,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

/**
 * Creates mock machine data for testing
 */
export function createMockMachine(overrides: Partial<{
    id: string;
    accountId: string;
    metadata: string;
    metadataVersion: number;
    daemonState: string | null;
    daemonStateVersion: number;
    dataEncryptionKey: Uint8Array | null;
    seq: number;
    active: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}> = {}) {
    const now = new Date();
    return {
        id: randomId('machine-'),
        accountId: TEST_USER_ID,
        metadata: '{"name": "test-machine"}',
        metadataVersion: 1,
        daemonState: null,
        daemonStateVersion: 0,
        dataEncryptionKey: null,
        seq: 0,
        active: true,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

/**
 * Creates mock artifact data for testing
 */
export function createMockArtifact(overrides: Partial<{
    id: string;
    accountId: string;
    header: Uint8Array;
    headerVersion: number;
    body: Uint8Array;
    bodyVersion: number;
    dataEncryptionKey: Uint8Array;
    seq: number;
    createdAt: Date;
    updatedAt: Date;
}> = {}) {
    const now = new Date();
    return {
        id: randomId(),
        accountId: TEST_USER_ID,
        header: new Uint8Array([1, 2, 3, 4]),
        headerVersion: 1,
        body: new Uint8Array([5, 6, 7, 8]),
        bodyVersion: 1,
        dataEncryptionKey: new Uint8Array([9, 10, 11, 12]),
        seq: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

/**
 * Creates mock access key data for testing
 */
export function createMockAccessKey(overrides: Partial<{
    id: string;
    accountId: string;
    machineId: string;
    sessionId: string;
    data: string;
    dataVersion: number;
    createdAt: Date;
    updatedAt: Date;
}> = {}) {
    const now = new Date();
    return {
        id: randomId('ak-'),
        accountId: TEST_USER_ID,
        machineId: randomId('machine-'),
        sessionId: randomId('sess-'),
        data: '{"encrypted": "access-key-data"}',
        dataVersion: 1,
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

/**
 * Creates mock service account token data for testing
 */
export function createMockServiceToken(overrides: Partial<{
    id: string;
    accountId: string;
    vendor: string;
    token: Uint8Array;
    metadata: any;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}> = {}) {
    const now = new Date();
    return {
        id: randomId('sat-'),
        accountId: TEST_USER_ID,
        vendor: 'anthropic',
        token: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        metadata: null,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}
