/**
 * Unit Tests for Email Module (HAP-912)
 *
 * Tests for email.ts covering:
 * - sendInvitationEmail function
 * - HTML template generation
 * - Environment variable handling
 * - Error scenarios
 *
 * @module lib/email.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendInvitationEmail, type EmailEnv, type InvitationEmailConfig } from './email';

// Helper to extract body from fetch mock call
function getBodyFromFetch(mockFetch: ReturnType<typeof vi.fn>, callIndex = 0): Record<string, unknown> {
    const callArgs = mockFetch.mock.calls[callIndex];
    if (!callArgs) throw new Error(`No call at index ${callIndex}`);
    const requestInit = callArgs[1] as RequestInit | undefined;
    if (!requestInit?.body) throw new Error('No body in fetch call');
    return JSON.parse(requestInit.body as string) as Record<string, unknown>;
}

describe('email module (HAP-912)', () => {
    // Mock fetch globally
    const mockFetch = vi.fn();
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = mockFetch;
        // Suppress console output in tests
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    /**
     * Create test environment with optional overrides
     */
    function createTestEnv(overrides: Partial<EmailEnv> = {}): EmailEnv {
        return {
            RESEND_API_KEY: 're_test_12345',
            HAPPY_APP_URL: 'https://happy.example.com',
            ENVIRONMENT: 'production',
            ...overrides,
        };
    }

    /**
     * Create test invitation config with optional overrides
     */
    function createTestConfig(overrides: Partial<InvitationEmailConfig> = {}): InvitationEmailConfig {
        return {
            recipientEmail: 'recipient@example.com',
            invitationToken: 'test-token-12345',
            inviterName: 'John Doe',
            sessionName: 'My Session',
            permission: 'view_and_chat',
            expiresAt: new Date('2025-01-31T12:00:00Z'),
            ...overrides,
        };
    }

    describe('sendInvitationEmail', () => {
        describe('successful email sending', () => {
            it('should send email successfully via Resend API', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_123' }),
                });

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(true);
                expect(result.messageId).toBe('msg_123');
                expect(result.error).toBeUndefined();
            });

            it('should call Resend API with correct parameters', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_456' }),
                });

                await sendInvitationEmail(env, config);

                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.resend.com/emails',
                    expect.objectContaining({
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer re_test_12345',
                            'Content-Type': 'application/json',
                        },
                    })
                );

                // Verify body content
                const body = getBodyFromFetch(mockFetch);

                expect(body.from).toBe('Happy <noreply@enflamemedia.com>');
                expect(body.to).toEqual(['recipient@example.com']);
                expect(body.subject).toBe('John Doe shared a Happy session with you');
                expect(body.html).toContain('Happy Session Invitation');
                expect(body.text).toContain('John Doe has invited you');
            });

            it('should include invitation token in accept URL', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ invitationToken: 'my-unique-token' });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_789' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('https://happy.example.com/invite/my-unique-token');
                expect(body.text).toContain('https://happy.example.com/invite/my-unique-token');
            });

            it('should format expiration date correctly', async () => {
                const env = createTestEnv();
                // Use a date that won't be affected by timezone shifts
                const expirationDate = new Date('2025-03-15T12:00:00Z');
                const config = createTestConfig({
                    expiresAt: expirationDate,
                });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_date' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                // Verify date is included in the email (format varies by locale/timezone)
                // The date should contain March 2025 somewhere
                expect(body.html).toMatch(/March.*2025/);
                expect(body.text).toMatch(/March.*2025/);
                // Should include "expires on" text
                expect(body.html).toContain('This invitation expires on');
                expect(body.text).toContain('This invitation expires on');
            });
        });

        describe('permission text formatting', () => {
            it('should format view_and_chat permission correctly', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ permission: 'view_and_chat' });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_perm1' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('view and chat');
                expect(body.text).toContain('view and chat');
            });

            it('should format view_only permission correctly', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ permission: 'view_only' });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_perm2' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('view only');
                expect(body.text).toContain('view only');
            });
        });

        describe('inviter name handling', () => {
            it('should include inviter name in subject when provided', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ inviterName: 'Alice Smith' });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_name1' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.subject).toBe('Alice Smith shared a Happy session with you');
                expect(body.html).toContain('Alice Smith has');
                expect(body.text).toContain('Alice Smith has');
            });

            it('should use generic subject when inviter name not provided', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ inviterName: undefined });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_name2' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.subject).toBe("You've been invited to a Happy session");
                expect(body.html).toContain('Someone has');
                expect(body.text).toContain('Someone has');
            });
        });

        describe('session name handling', () => {
            it('should include session name when provided', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ sessionName: 'My Important Project' });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_sess1' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('the session "My Important Project"');
                expect(body.text).toContain('the session "My Important Project"');
            });

            it('should use generic session reference when name not provided', async () => {
                const env = createTestEnv();
                const config = createTestConfig({ sessionName: undefined });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_sess2' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('a Happy session');
                expect(body.text).toContain('a Happy session');
            });
        });

        describe('URL handling', () => {
            it('should use HAPPY_APP_URL from environment', async () => {
                const env = createTestEnv({ HAPPY_APP_URL: 'https://custom.app.com' });
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_url1' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('https://custom.app.com/invite/');
                expect(body.text).toContain('https://custom.app.com/invite/');
            });

            it('should use default URL when HAPPY_APP_URL not set', async () => {
                const env = createTestEnv({ HAPPY_APP_URL: undefined });
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_url2' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                expect(body.html).toContain('https://happy.enflamemedia.com/invite/');
                expect(body.text).toContain('https://happy.enflamemedia.com/invite/');
            });
        });

        describe('missing API key handling', () => {
            it('should return success in development mode without API key', async () => {
                const env = createTestEnv({
                    RESEND_API_KEY: undefined,
                    ENVIRONMENT: 'development',
                });
                const config = createTestConfig();

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(true);
                expect(result.messageId).toBe('dev-mode-skip');
                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should return error in production without API key', async () => {
                const env = createTestEnv({
                    RESEND_API_KEY: undefined,
                    ENVIRONMENT: 'production',
                });
                const config = createTestConfig();

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Email service not configured');
                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should return error when ENVIRONMENT not set and no API key', async () => {
                const env = createTestEnv({
                    RESEND_API_KEY: undefined,
                    ENVIRONMENT: undefined,
                });
                const config = createTestConfig();

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Email service not configured');
            });
        });

        describe('API error handling', () => {
            it('should handle non-OK HTTP response', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: async () => ({
                        error: { message: 'Invalid email address', name: 'validation_error' },
                    }),
                });

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Failed to send email: Invalid email address');
            });

            it('should handle error in response body with ok=true', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        error: { message: 'Rate limit exceeded', name: 'rate_limit_error' },
                    }),
                });

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Failed to send email: Rate limit exceeded');
            });

            it('should handle HTTP error without error message in body', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    json: async () => ({}),
                });

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Failed to send email: HTTP 500');
            });
        });

        describe('network error handling', () => {
            it('should handle fetch exception', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockRejectedValueOnce(new Error('Network error'));

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Email sending failed: Network error');
            });

            it('should handle non-Error exception', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockRejectedValueOnce('String error');

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Email sending failed: Unknown error');
            });

            it('should handle JSON parse error', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => {
                        throw new Error('Invalid JSON');
                    },
                });

                const result = await sendInvitationEmail(env, config);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Email sending failed: Invalid JSON');
            });
        });

        describe('HTML content verification', () => {
            it('should generate valid HTML structure', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_html' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                // Verify HTML structure
                expect(body.html).toContain('<!DOCTYPE html>');
                expect(body.html).toContain('<html>');
                expect(body.html).toContain('</html>');
                expect(body.html).toContain('<head>');
                expect(body.html).toContain('<body');
                expect(body.html).toContain('Accept Invitation');
                expect(body.html).toContain('happy.enflamemedia.com');
            });

            it('should include all required email sections', async () => {
                const env = createTestEnv();
                const config = createTestConfig();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_sections' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                // Check for main sections
                expect(body.html).toContain('Happy Session Invitation');
                expect(body.html).toContain('Accept Invitation');
                expect(body.html).toContain('This invitation expires on');
                expect(body.html).toContain("If the button doesn't work");
                expect(body.html).toContain('Sent by Happy');
            });
        });

        describe('plain text content verification', () => {
            it('should generate plain text alternative', async () => {
                const env = createTestEnv();
                const config = createTestConfig({
                    inviterName: 'Bob',
                    sessionName: 'Test Session',
                    permission: 'view_only',
                });

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 'msg_text' }),
                });

                await sendInvitationEmail(env, config);

                const body = getBodyFromFetch(mockFetch);

                // Verify plain text content
                expect(body.text).toContain('Bob shared a Happy session with you');
                expect(body.text).toContain('Bob has invited you');
                expect(body.text).toContain('the session "Test Session"');
                expect(body.text).toContain('view only');
                expect(body.text).toContain('Accept the invitation by visiting:');
                expect(body.text).toContain('This invitation expires on');
                expect(body.text).toContain('Sent by Happy');
                expect(body.text).toContain('https://happy.enflamemedia.com');
            });
        });
    });
});
