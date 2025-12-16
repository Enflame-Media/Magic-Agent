/**
 * Tests for WebSocket connection ticket utilities
 *
 * @see HAP-375 for ticket-based WebSocket authentication implementation
 */

import { describe, it, expect } from 'vitest';
import { createTicket, verifyTicket, isTicketExpired } from './ticket';

describe('ticket', () => {
    const TEST_SECRET = 'test-master-secret-at-least-32-characters-long';

    describe('createTicket', () => {
        it('should create a valid ticket string', async () => {
            const ticket = await createTicket('user_abc123', TEST_SECRET);

            expect(typeof ticket).toBe('string');
            expect(ticket).toContain('.'); // payload.signature format
        });

        it('should create tickets with two parts (payload and signature)', async () => {
            const ticket = await createTicket('user_xyz', TEST_SECRET);
            const parts = ticket.split('.');

            expect(parts).toHaveLength(2);
            expect(parts[0]).toBeTruthy(); // payload
            expect(parts[1]).toBeTruthy(); // signature
        });

        it('should create unique tickets (due to random nonce)', async () => {
            const ticket1 = await createTicket('user_abc', TEST_SECRET);
            const ticket2 = await createTicket('user_abc', TEST_SECRET);

            expect(ticket1).not.toBe(ticket2);
        });

        it('should use base64url encoding (no +, /, or = characters)', async () => {
            // Create multiple tickets to increase chance of hitting these chars if encoding is wrong
            for (let i = 0; i < 10; i++) {
                const ticket = await createTicket(`user_${i}`, TEST_SECRET);

                expect(ticket).not.toContain('+');
                expect(ticket).not.toContain('/');
                expect(ticket).not.toContain('=');
            }
        });

        it('should handle various userId formats', async () => {
            const userIds = [
                'user_abc123',
                'simple',
                'with-dashes',
                'with_underscores',
                'mixedCase123',
                'a'.repeat(100), // long userId
            ];

            for (const userId of userIds) {
                const ticket = await createTicket(userId, TEST_SECRET);
                expect(typeof ticket).toBe('string');
                expect(ticket.length).toBeGreaterThan(0);
            }
        });

        it('should respect custom TTL parameter', async () => {
            const shortTtl = 100; // 100ms
            const ticket = await createTicket('user_abc', TEST_SECRET, shortTtl);

            // Verify ticket is valid immediately
            const result = await verifyTicket(ticket, TEST_SECRET);
            expect(result).not.toBeNull();

            // Wait for TTL + clock skew tolerance to expire
            await new Promise((resolve) => setTimeout(resolve, shortTtl + 6000));

            // Should be expired now
            const expiredResult = await verifyTicket(ticket, TEST_SECRET);
            expect(expiredResult).toBeNull();
        }, 10000); // Extended timeout for TTL test
    });

    describe('verifyTicket', () => {
        it('should verify a valid ticket and return userId', async () => {
            const userId = 'user_abc123';
            const ticket = await createTicket(userId, TEST_SECRET);

            const result = await verifyTicket(ticket, TEST_SECRET);

            expect(result).not.toBeNull();
            expect(result?.userId).toBe(userId);
        });

        it('should return null for invalid ticket format (missing parts)', async () => {
            const invalidTickets = [
                '',
                'no-dot-separator',
                '..empty-parts',
                'only.', // missing signature
                '.only', // missing payload
            ];

            for (const ticket of invalidTickets) {
                const result = await verifyTicket(ticket, TEST_SECRET);
                expect(result).toBeNull();
            }
        });

        it('should return null for invalid base64 payload', async () => {
            const result = await verifyTicket('!!!invalid-base64!!!.signature', TEST_SECRET);
            expect(result).toBeNull();
        });

        it('should return null for payload with missing fields', async () => {
            // Manually create a ticket with missing fields
            const incompletePayload = { userId: 'test' }; // missing exp and nonce
            const payloadB64 = btoa(JSON.stringify(incompletePayload))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const result = await verifyTicket(`${payloadB64}.fakesignature`, TEST_SECRET);
            expect(result).toBeNull();
        });

        it('should return null for expired tickets', async () => {
            // Create a ticket with very short TTL
            const ticket = await createTicket('user_abc', TEST_SECRET, 1);

            // Wait for expiration (TTL + max clock skew)
            await new Promise((resolve) => setTimeout(resolve, 6000));

            const result = await verifyTicket(ticket, TEST_SECRET);
            expect(result).toBeNull();
        }, 10000);

        it('should return null for tampered payload', async () => {
            const ticket = await createTicket('user_original', TEST_SECRET);
            const [, signature] = ticket.split('.');

            // Create a different payload
            const tamperedPayload = {
                userId: 'user_hacker',
                exp: Date.now() + 30000,
                nonce: 'fake-nonce',
            };
            const tamperedPayloadB64 = btoa(JSON.stringify(tamperedPayload))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const tamperedTicket = `${tamperedPayloadB64}.${signature}`;

            const result = await verifyTicket(tamperedTicket, TEST_SECRET);
            expect(result).toBeNull();
        });

        it('should return null for tickets signed with different secret', async () => {
            const ticket = await createTicket('user_abc', 'secret-one-32-chars-minimum-here');

            const result = await verifyTicket(ticket, 'secret-two-32-chars-minimum-here');
            expect(result).toBeNull();
        });

        it('should return null for corrupted signature', async () => {
            const ticket = await createTicket('user_abc', TEST_SECRET);
            const [payload] = ticket.split('.');

            const corruptedTicket = `${payload}.corrupted-signature-data`;

            const result = await verifyTicket(corruptedTicket, TEST_SECRET);
            expect(result).toBeNull();
        });

        it('should accept tickets within clock skew tolerance', async () => {
            // Create a ticket and verify it accepts times slightly past expiration
            // The implementation allows MAX_CLOCK_SKEW_MS (5 seconds) past exp

            // We need to create a ticket, then mock Date.now to be slightly past exp
            // but within the clock skew tolerance

            const ticket = await createTicket('user_abc', TEST_SECRET, 1000); // 1 second TTL

            // Wait 2 seconds (past the 1s TTL but within 5s clock skew)
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Should still be valid due to clock skew tolerance
            const result = await verifyTicket(ticket, TEST_SECRET);
            expect(result).not.toBeNull();
        }, 10000);
    });

    describe('isTicketExpired', () => {
        it('should return false for a fresh ticket', async () => {
            const ticket = await createTicket('user_abc', TEST_SECRET);

            expect(isTicketExpired(ticket)).toBe(false);
        });

        it('should return true for an expired ticket', async () => {
            const ticket = await createTicket('user_abc', TEST_SECRET, 1);

            // Wait for expiration
            await new Promise((resolve) => setTimeout(resolve, 6000));

            expect(isTicketExpired(ticket)).toBe(true);
        }, 10000);

        it('should return true for invalid ticket formats', async () => {
            const invalidTickets = ['', 'invalid', 'no.signature.here', '.', '..'];

            for (const ticket of invalidTickets) {
                expect(isTicketExpired(ticket)).toBe(true);
            }
        });

        it('should return true for malformed payload JSON', async () => {
            // Create a ticket with invalid JSON in payload
            const invalidPayloadB64 = btoa('not-valid-json')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            expect(isTicketExpired(`${invalidPayloadB64}.fakesig`)).toBe(true);
        });

        it('should not verify signature (quick check only)', async () => {
            // isTicketExpired should not verify signature, only check expiration
            // Create a fake ticket with valid payload structure but invalid signature
            const payload = {
                userId: 'user_abc',
                exp: Date.now() + 30000, // 30 seconds from now
                nonce: 'fake-nonce',
            };
            const payloadB64 = btoa(JSON.stringify(payload))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            // Should return false (not expired) even though signature is invalid
            expect(isTicketExpired(`${payloadB64}.invalid-signature`)).toBe(false);
        });
    });

    describe('security properties', () => {
        it('should produce signatures of consistent length', async () => {
            const tickets: string[] = [];
            for (let i = 0; i < 10; i++) {
                tickets.push(await createTicket(`user_${i}`, TEST_SECRET));
            }

            const signatureLengths = tickets.map((t) => t.split('.')[1]?.length ?? 0);
            const uniqueLengths = new Set(signatureLengths);

            // HMAC-SHA256 produces 32 bytes = 43 base64url chars (without padding)
            expect(uniqueLengths.size).toBe(1);
            expect(signatureLengths[0]).toBe(43);
        });

        it('should not expose userId in plaintext URL encoding', async () => {
            const userId = 'secret_user_id_123';
            const ticket = await createTicket(userId, TEST_SECRET);

            // The payload is base64-encoded, not plain text
            // The raw userId should not appear in the ticket
            expect(ticket).not.toContain(userId);
        });

        it('should be resilient to timing attacks (constant time comparison)', async () => {
            // This is more of a behavioral test - verification should complete
            // in similar time regardless of where the validation fails
            const validTicket = await createTicket('user_abc', TEST_SECRET);
            const invalidSignature = validTicket.replace(/.$/, 'X'); // Corrupt last char

            const start1 = performance.now();
            await verifyTicket(validTicket, TEST_SECRET);
            const time1 = performance.now() - start1;

            const start2 = performance.now();
            await verifyTicket(invalidSignature, TEST_SECRET);
            const time2 = performance.now() - start2;

            // Times should be in the same order of magnitude
            // This isn't a strict timing attack test, just a sanity check
            // that verification doesn't short-circuit significantly
            expect(Math.abs(time1 - time2)).toBeLessThan(100); // Within 100ms
        });
    });

    describe('edge cases', () => {
        it('should reject empty userId', async () => {
            const ticket = await createTicket('', TEST_SECRET);
            const result = await verifyTicket(ticket, TEST_SECRET);

            // Empty userId is rejected by verifyTicket as a security measure
            // (the check !payload.userId returns true for empty string)
            expect(result).toBeNull();
        });

        it('should handle unicode in userId', async () => {
            const unicodeUserId = 'user_测试_🔑';
            const ticket = await createTicket(unicodeUserId, TEST_SECRET);
            const result = await verifyTicket(ticket, TEST_SECRET);

            expect(result?.userId).toBe(unicodeUserId);
        });

        it('should handle very long userIds', async () => {
            const longUserId = 'user_' + 'x'.repeat(1000);
            const ticket = await createTicket(longUserId, TEST_SECRET);
            const result = await verifyTicket(ticket, TEST_SECRET);

            expect(result?.userId).toBe(longUserId);
        });

        it('should handle special characters in userId', async () => {
            const specialUserId = 'user/with+special=chars&more';
            const ticket = await createTicket(specialUserId, TEST_SECRET);
            const result = await verifyTicket(ticket, TEST_SECRET);

            expect(result?.userId).toBe(specialUserId);
        });
    });
});
