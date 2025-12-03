/**
 * Comprehensive Test Data Seeding Script
 *
 * Creates test data for integration and load testing in staging environments.
 * Generates realistic data patterns across all entity types.
 *
 * Usage:
 *   yarn db:seed:test          # Seed local D1
 *   yarn db:seed:test:staging  # Seed staging D1
 *
 * @module scripts/seed-test-data
 */

import { createId } from '../src/utils/id';

/**
 * Configuration for test data generation
 */
const CONFIG = {
    accounts: 10,          // Number of test accounts
    sessionsPerAccount: 5, // Sessions per account
    messagesPerSession: 10, // Messages per session
    machinesPerAccount: 3, // Machines per account
    artifactsPerAccount: 5, // Artifacts per account
    kvEntriesPerAccount: 10, // KV entries per account
    feedItemsPerAccount: 20, // Feed items per account
};

/**
 * Generate mock encrypted data (for Bytes fields)
 */
function mockEncrypted(data: string): string {
    return Buffer.from(data, 'utf-8').toString('hex');
}

/**
 * Generate a random string for names
 */
function randomName(): string {
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    const lastNames = ['Developer', 'Tester', 'Engineer', 'Admin', 'User', 'Smith', 'Jones', 'Davis', 'Wilson', 'Brown'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]}_${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

/**
 * Generate test accounts
 */
function generateAccounts(count: number): { id: string; sql: string }[] {
    const now = Date.now();
    const accounts: { id: string; sql: string }[] = [];

    for (let i = 0; i < count; i++) {
        const id = createId();
        const name = randomName();
        const [firstName, lastName] = name.split('_');
        const username = `test_${name.toLowerCase()}_${i}`;

        accounts.push({
            id,
            sql: `
INSERT INTO Account (id, publicKey, seq, feedSeq, createdAt, updatedAt, settings, settingsVersion, firstName, lastName, username)
VALUES (
    '${id}',
    'ed25519_pk_test_${id}',
    0,
    0,
    ${now - i * 86400000}, -- Stagger creation dates
    ${now},
    '{"theme":"${i % 2 === 0 ? 'dark' : 'light'}","notifications":${i % 3 === 0}}',
    1,
    '${firstName}',
    '${lastName}',
    '${username}'
);`,
        });
    }

    return accounts;
}

/**
 * Generate test sessions for accounts
 */
function generateSessions(accounts: { id: string }[], sessionsPerAccount: number): { id: string; accountId: string; sql: string }[] {
    const now = Date.now();
    const sessions: { id: string; accountId: string; sql: string }[] = [];

    for (const account of accounts) {
        for (let i = 0; i < sessionsPerAccount; i++) {
            const id = createId();
            const tag = `session_${account.id}_${i}`;
            const active = i < 2; // First 2 sessions are active

            sessions.push({
                id,
                accountId: account.id,
                sql: `
INSERT INTO Session (id, tag, accountId, metadata, metadataVersion, dataEncryptionKey, seq, active, lastActiveAt, createdAt, updatedAt)
VALUES (
    '${id}',
    '${tag}',
    '${account.id}',
    '{"name":"Test Session ${i + 1}","device":"${['laptop', 'desktop', 'tablet'][i % 3]}"}',
    1,
    X'${mockEncrypted(`session_key_${id}`)}',
    ${i},
    ${active ? 1 : 0},
    ${now - (sessionsPerAccount - i) * 3600000},
    ${now - sessionsPerAccount * 86400000},
    ${now}
);`,
            });
        }
    }

    return sessions;
}

/**
 * Generate test messages for sessions
 */
function generateMessages(sessions: { id: string }[], messagesPerSession: number): string[] {
    const now = Date.now();
    const messages: string[] = [];

    for (const session of sessions) {
        for (let i = 0; i < messagesPerSession; i++) {
            const id = createId();
            const messageType = i % 2 === 0 ? 'user' : 'assistant';

            messages.push(`
INSERT INTO SessionMessage (id, sessionId, localId, seq, content, createdAt, updatedAt)
VALUES (
    '${id}',
    '${session.id}',
    'local_${id}',
    ${i + 1},
    '{"type":"${messageType}","text":"Test message ${i + 1} in session ${session.id}"}',
    ${now - (messagesPerSession - i) * 60000},
    ${now}
);`);
        }
    }

    return messages;
}

/**
 * Generate test machines for accounts
 */
function generateMachines(accounts: { id: string }[], machinesPerAccount: number): { id: string; accountId: string; sql: string }[] {
    const now = Date.now();
    const machines: { id: string; accountId: string; sql: string }[] = [];
    const hostnames = ['laptop', 'desktop', 'workstation', 'server', 'dev-box'];
    const oses = ['macOS', 'Windows', 'Linux', 'ChromeOS'];

    for (const account of accounts) {
        for (let i = 0; i < machinesPerAccount; i++) {
            const id = createId();
            const hostname = `${hostnames[i % hostnames.length]}-${account.id.slice(-4)}`;
            const os = oses[i % oses.length];
            const active = i === 0; // First machine is active

            machines.push({
                id,
                accountId: account.id,
                sql: `
INSERT INTO Machine (id, accountId, metadata, metadataVersion, dataEncryptionKey, seq, active, lastActiveAt, createdAt, updatedAt)
VALUES (
    '${id}',
    '${account.id}',
    '{"hostname":"${hostname}","os":"${os}","version":"1.0.${i}"}',
    1,
    X'${mockEncrypted(`machine_key_${id}`)}',
    0,
    ${active ? 1 : 0},
    ${now - i * 3600000},
    ${now - machinesPerAccount * 86400000},
    ${now}
);`,
            });
        }
    }

    return machines;
}

/**
 * Generate test artifacts for accounts
 */
function generateArtifacts(accounts: { id: string }[], artifactsPerAccount: number): string[] {
    const now = Date.now();
    const artifacts: string[] = [];

    for (const account of accounts) {
        for (let i = 0; i < artifactsPerAccount; i++) {
            const id = createId();

            artifacts.push(`
INSERT INTO Artifact (id, accountId, header, headerVersion, body, bodyVersion, dataEncryptionKey, seq, createdAt, updatedAt)
VALUES (
    '${id}',
    '${account.id}',
    X'${mockEncrypted(`artifact_header_${id}`)}',
    1,
    X'${mockEncrypted(`artifact_body_content_${id}_Lorem ipsum dolor sit amet`)}',
    1,
    X'${mockEncrypted(`artifact_key_${id}`)}',
    ${i},
    ${now - (artifactsPerAccount - i) * 86400000},
    ${now}
);`);
        }
    }

    return artifacts;
}

/**
 * Generate access keys linking sessions and machines
 */
function generateAccessKeys(
    sessions: { id: string; accountId: string }[],
    machines: { id: string; accountId: string }[]
): string[] {
    const now = Date.now();
    const accessKeys: string[] = [];

    // Create access keys for matching account pairs
    for (const session of sessions) {
        const accountMachines = machines.filter(m => m.accountId === session.accountId);
        for (const machine of accountMachines.slice(0, 2)) { // Max 2 per session
            const id = createId();
            accessKeys.push(`
INSERT INTO AccessKey (id, accountId, machineId, sessionId, data, dataVersion, createdAt, updatedAt)
VALUES (
    '${id}',
    '${session.accountId}',
    '${machine.id}',
    '${session.id}',
    '{"encryptedAccessKey":"test_key_${id}"}',
    1,
    ${now},
    ${now}
);`);
        }
    }

    return accessKeys;
}

/**
 * Generate user relationships (friendships)
 */
function generateRelationships(accounts: { id: string }[]): string[] {
    const now = Date.now();
    const relationships: string[] = [];
    const statuses = ['none', 'requested', 'pending', 'friend', 'friend'];

    // Create some relationships between accounts
    for (let i = 0; i < accounts.length - 1; i++) {
        const status = statuses[i % statuses.length];
        if (status !== 'none') {
            relationships.push(`
INSERT INTO UserRelationship (fromUserId, toUserId, status, createdAt, updatedAt)
VALUES (
    '${accounts[i].id}',
    '${accounts[i + 1].id}',
    '${status}',
    ${now},
    ${now}
);`);
        }
    }

    return relationships;
}

/**
 * Generate feed items for accounts
 */
function generateFeedItems(accounts: { id: string }[], itemsPerAccount: number): string[] {
    const now = Date.now();
    const feedItems: string[] = [];
    const eventTypes = ['session_created', 'session_completed', 'artifact_created', 'machine_connected'];

    for (const account of accounts) {
        for (let i = 0; i < itemsPerAccount; i++) {
            const id = createId();
            const eventType = eventTypes[i % eventTypes.length];

            feedItems.push(`
INSERT INTO UserFeedItem (id, userId, counter, body, createdAt, updatedAt)
VALUES (
    '${id}',
    '${account.id}',
    ${i + 1},
    '{"type":"${eventType}","timestamp":${now - (itemsPerAccount - i) * 3600000}}',
    ${now - (itemsPerAccount - i) * 3600000},
    ${now}
);`);
        }
    }

    return feedItems;
}

/**
 * Generate KV store entries for accounts
 */
function generateKVEntries(accounts: { id: string }[], entriesPerAccount: number): string[] {
    const now = Date.now();
    const kvEntries: string[] = [];
    const keyPrefixes = ['settings:', 'cache:', 'state:', 'pref:'];

    for (const account of accounts) {
        for (let i = 0; i < entriesPerAccount; i++) {
            const id = createId();
            const prefix = keyPrefixes[i % keyPrefixes.length];
            const key = `${prefix}item_${i}`;

            kvEntries.push(`
INSERT INTO UserKVStore (id, accountId, key, value, version, createdAt, updatedAt)
VALUES (
    '${id}',
    '${account.id}',
    '${key}',
    X'${mockEncrypted(`{"data":"test_value_${i}"}`)}',
    1,
    ${now},
    ${now}
);`);
        }
    }

    return kvEntries;
}

/**
 * Generate push tokens for some accounts
 */
function generatePushTokens(accounts: { id: string }[]): string[] {
    const now = Date.now();
    const pushTokens: string[] = [];

    // Generate push tokens for first half of accounts
    for (const account of accounts.slice(0, Math.ceil(accounts.length / 2))) {
        const id = createId();
        pushTokens.push(`
INSERT INTO PushToken (id, accountId, token, createdAt, updatedAt)
VALUES (
    '${id}',
    '${account.id}',
    'ExponentPushToken[test_${id}]',
    ${now},
    ${now}
);`);
    }

    return pushTokens;
}

/**
 * Main seed function
 */
function main() {
    console.log('-- =====================================================');
    console.log('-- Happy Server Workers - Test Data Seed Script');
    console.log('-- Generated at:', new Date().toISOString());
    console.log('-- =====================================================');
    console.log('');
    console.log('-- Configuration:');
    console.log(`--   Accounts: ${CONFIG.accounts}`);
    console.log(`--   Sessions per account: ${CONFIG.sessionsPerAccount}`);
    console.log(`--   Messages per session: ${CONFIG.messagesPerSession}`);
    console.log(`--   Machines per account: ${CONFIG.machinesPerAccount}`);
    console.log(`--   Artifacts per account: ${CONFIG.artifactsPerAccount}`);
    console.log('');
    console.log('-- Enable foreign keys');
    console.log('PRAGMA foreign_keys = ON;');
    console.log('');

    // Generate all data
    const accounts = generateAccounts(CONFIG.accounts);
    const sessions = generateSessions(accounts, CONFIG.sessionsPerAccount);
    const machines = generateMachines(accounts, CONFIG.machinesPerAccount);

    console.log('-- =====================================================');
    console.log('-- Accounts');
    console.log('-- =====================================================');
    accounts.forEach(a => console.log(a.sql.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Sessions');
    console.log('-- =====================================================');
    sessions.forEach(s => console.log(s.sql.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Session Messages');
    console.log('-- =====================================================');
    generateMessages(sessions, CONFIG.messagesPerSession).forEach(m => console.log(m.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Machines');
    console.log('-- =====================================================');
    machines.forEach(m => console.log(m.sql.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Artifacts');
    console.log('-- =====================================================');
    generateArtifacts(accounts, CONFIG.artifactsPerAccount).forEach(a => console.log(a.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Access Keys');
    console.log('-- =====================================================');
    generateAccessKeys(sessions, machines).forEach(ak => console.log(ak.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- User Relationships');
    console.log('-- =====================================================');
    generateRelationships(accounts).forEach(r => console.log(r.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Feed Items');
    console.log('-- =====================================================');
    generateFeedItems(accounts, CONFIG.feedItemsPerAccount).forEach(f => console.log(f.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- KV Store Entries');
    console.log('-- =====================================================');
    generateKVEntries(accounts, CONFIG.kvEntriesPerAccount).forEach(kv => console.log(kv.trim()));

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Push Tokens');
    console.log('-- =====================================================');
    generatePushTokens(accounts).forEach(pt => console.log(pt.trim()));

    // Summary
    const totalSessions = accounts.length * CONFIG.sessionsPerAccount;
    const totalMessages = totalSessions * CONFIG.messagesPerSession;
    const totalMachines = accounts.length * CONFIG.machinesPerAccount;
    const totalArtifacts = accounts.length * CONFIG.artifactsPerAccount;

    console.log('');
    console.log('-- =====================================================');
    console.log('-- Seed complete!');
    console.log('-- =====================================================');
    console.log(`-- Created:`);
    console.log(`--   ${accounts.length} accounts`);
    console.log(`--   ${totalSessions} sessions`);
    console.log(`--   ${totalMessages} messages`);
    console.log(`--   ${totalMachines} machines`);
    console.log(`--   ${totalArtifacts} artifacts`);
    console.log(`--   ${accounts.length * CONFIG.kvEntriesPerAccount} KV entries`);
    console.log(`--   ${accounts.length * CONFIG.feedItemsPerAccount} feed items`);
}

// Run if executed directly
main();
