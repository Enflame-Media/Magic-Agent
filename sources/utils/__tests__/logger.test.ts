import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redact, logger, isDevMode } from '../logger';

describe('Logger Redaction', () => {
    describe('redact()', () => {
        it('redacts Bearer tokens', () => {
            const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
            const result = redact(input);
            expect(result).toContain('[REDACTED]');
            expect(result).not.toContain('eyJ');
        });

        it('redacts long alphanumeric strings (40+ chars)', () => {
            const token = 'a'.repeat(50);
            const result = redact(`Token: ${token}`);
            expect(result).toBe('Token: [REDACTED]');
        });

        it('redacts JWT tokens', () => {
            const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
            const result = redact(jwt);
            expect(result).toBe('[REDACTED]');
        });

        it('preserves short safe strings', () => {
            const result = redact('Hello world');
            expect(result).toBe('Hello world');
        });

        it('redacts multiple tokens in the same string', () => {
            const input = 'Bearer abc123 and Bearer def456 tokens';
            // These are short bearer tokens, so test with longer ones
            const longToken1 = 'a'.repeat(45);
            const longToken2 = 'b'.repeat(45);
            const inputWithLongTokens = `First: ${longToken1}, Second: ${longToken2}`;
            const result = redact(inputWithLongTokens);
            expect(result).toBe('First: [REDACTED], Second: [REDACTED]');
        });

        it('preserves strings just under the 40 character threshold', () => {
            const shortToken = 'a'.repeat(39);
            const result = redact(`Token: ${shortToken}`);
            expect(result).toBe(`Token: ${shortToken}`);
        });

        it('redacts strings exactly at 40 character threshold', () => {
            const exactToken = 'a'.repeat(40);
            const result = redact(`Token: ${exactToken}`);
            expect(result).toBe('Token: [REDACTED]');
        });

        it('redacts mixed content with Bearer and JWT', () => {
            const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            const input = `Bearer ${jwt} was used`;
            const result = redact(input);
            // Both Bearer and JWT patterns should match
            expect(result).not.toContain('eyJ');
            expect(result).toContain('[REDACTED]');
        });

        it('handles empty string', () => {
            const result = redact('');
            expect(result).toBe('');
        });

        it('handles strings with special characters', () => {
            const result = redact('Hello @#$%^& world!');
            expect(result).toBe('Hello @#$%^& world!');
        });

        it('redacts API key patterns', () => {
            const apiKey = 'sk_live_' + 'a'.repeat(50);
            const result = redact(`API Key: ${apiKey}`);
            expect(result).toBe('API Key: [REDACTED]');
        });
    });

    describe('logger methods', () => {
        let consoleLogSpy: ReturnType<typeof vi.spyOn>;
        let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
        let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        describe('debug()', () => {
            it('logs with DEBUG prefix in dev mode', () => {
                logger.debug('test message');
                // In test environment, __DEV__ is true (per vitest.config.ts)
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'test message');
            });

            it('redacts sensitive data in arguments', () => {
                const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
                logger.debug('Token:', jwt);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Token:', '[REDACTED]');
            });
        });

        describe('info()', () => {
            it('logs with INFO prefix in dev mode', () => {
                logger.info('info message');
                expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'info message');
            });

            it('redacts sensitive data in arguments', () => {
                const token = 'a'.repeat(50);
                logger.info('Session token:', token);
                expect(consoleLogSpy).toHaveBeenCalledWith('[INFO]', 'Session token:', '[REDACTED]');
            });
        });

        describe('warn()', () => {
            it('logs with WARN prefix', () => {
                logger.warn('warning message');
                expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'warning message');
            });

            it('redacts sensitive data in arguments', () => {
                const secret = 'Bearer super_secret_token_' + 'x'.repeat(40);
                logger.warn('Auth failed:', secret);
                expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Auth failed:', expect.stringContaining('[REDACTED]'));
            });
        });

        describe('error()', () => {
            it('logs with ERROR prefix', () => {
                logger.error('error message');
                expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error message');
            });

            it('redacts sensitive data in arguments', () => {
                const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
                logger.error('Token invalid:', jwt);
                expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Token invalid:', '[REDACTED]');
            });
        });

        describe('redacts sensitive object keys', () => {
            it('redacts token field in objects', () => {
                const data = { token: 'secret123', username: 'user' };
                logger.debug('User data:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'User data:', {
                    token: '[REDACTED]',
                    username: 'user'
                });
            });

            it('redacts password field in objects', () => {
                const data = { password: 'mypassword', email: 'user@example.com' };
                logger.debug('Login attempt:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Login attempt:', {
                    password: '[REDACTED]',
                    email: 'user@example.com'
                });
            });

            it('redacts apiKey field in objects', () => {
                const data = { apiKey: 'sk_live_123', service: 'stripe' };
                logger.debug('Service config:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Service config:', {
                    apiKey: '[REDACTED]',
                    service: 'stripe'
                });
            });

            it('redacts api_key field in objects', () => {
                const data = { api_key: 'sk_live_123', service: 'stripe' };
                logger.debug('Service config:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Service config:', {
                    api_key: '[REDACTED]',
                    service: 'stripe'
                });
            });

            it('redacts secret field in objects', () => {
                const data = { secret: 'topsecret', id: '123' };
                logger.debug('Data:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Data:', {
                    secret: '[REDACTED]',
                    id: '123'
                });
            });

            it('redacts credential field in objects', () => {
                const data = { credential: 'cred123', type: 'oauth' };
                logger.debug('Auth:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Auth:', {
                    credential: '[REDACTED]',
                    type: 'oauth'
                });
            });

            it('redacts auth field in objects', () => {
                const data = { auth: 'bearer-token', service: 'api' };
                logger.debug('Request:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Request:', {
                    auth: '[REDACTED]',
                    service: 'api'
                });
            });

            it('redacts bearer field in objects', () => {
                const data = { bearer: 'token123', endpoint: '/api' };
                logger.debug('Request:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Request:', {
                    bearer: '[REDACTED]',
                    endpoint: '/api'
                });
            });

            it('redacts private field in objects', () => {
                // Note: "key" pattern matches both privateKey and publicKey
                const data = { privateKey: 'private123', publicKey: 'public123' };
                logger.debug('Keys:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Keys:', {
                    privateKey: '[REDACTED]',
                    publicKey: '[REDACTED]'  // "key" pattern matches this too
                });
            });

            it('redacts accessToken field in objects', () => {
                const data = { accessToken: 'access123', userId: 'user1' };
                logger.debug('Session:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Session:', {
                    accessToken: '[REDACTED]',
                    userId: 'user1'
                });
            });

            it('redacts access_token field in objects', () => {
                const data = { access_token: 'access123', user_id: 'user1' };
                logger.debug('Session:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Session:', {
                    access_token: '[REDACTED]',
                    user_id: 'user1'
                });
            });

            it('redacts refreshToken field in objects', () => {
                const data = { refreshToken: 'refresh123', expiresIn: 3600 };
                logger.debug('Token refresh:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Token refresh:', {
                    refreshToken: '[REDACTED]',
                    expiresIn: 3600
                });
            });

            it('redacts refresh_token field in objects', () => {
                const data = { refresh_token: 'refresh123', expires_in: 3600 };
                logger.debug('Token refresh:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Token refresh:', {
                    refresh_token: '[REDACTED]',
                    expires_in: 3600
                });
            });

            it('preserves non-sensitive fields', () => {
                const data = { username: 'user', status: 'active', count: 42 };
                logger.debug('User:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'User:', {
                    username: 'user',
                    status: 'active',
                    count: 42
                });
            });
        });

        describe('redacts nested objects', () => {
            it('redacts deeply nested sensitive fields', () => {
                // Note: "credential" pattern matches the key, so entire value is redacted
                const data = { user: { credentials: { token: 'abc' } } };
                logger.debug('Nested data:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Nested data:', {
                    user: { credentials: '[REDACTED]' }  // credentials key matches pattern
                });
            });

            it('redacts multiple nested sensitive fields', () => {
                // Note: "auth" pattern matches the key, so entire value is redacted
                const data = {
                    auth: {
                        primary: { token: 'token1', secret: 'secret1' },
                        secondary: { password: 'pass1' }
                    },
                    metadata: { version: '1.0' }
                };
                logger.debug('Auth config:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Auth config:', {
                    auth: '[REDACTED]',  // auth key matches pattern
                    metadata: { version: '1.0' }
                });
            });

            it('handles deeply nested structures', () => {
                const data = {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    apiKey: 'deep_secret'
                                }
                            }
                        }
                    }
                };
                logger.debug('Deep:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Deep:', {
                    level1: {
                        level2: {
                            level3: {
                                level4: {
                                    apiKey: '[REDACTED]'
                                }
                            }
                        }
                    }
                });
            });
        });

        describe('handles arrays', () => {
            it('redacts sensitive values in arrays', () => {
                const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
                const data = ['safe', jwt, 'also safe'];
                logger.debug('Array:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Array:', ['safe', '[REDACTED]', 'also safe']);
            });

            it('redacts objects within arrays', () => {
                const data = [
                    { name: 'user1', token: 'token1' },
                    { name: 'user2', token: 'token2' }
                ];
                logger.debug('Users:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Users:', [
                    { name: 'user1', token: '[REDACTED]' },
                    { name: 'user2', token: '[REDACTED]' }
                ]);
            });

            it('handles nested arrays', () => {
                const longToken = 'a'.repeat(50);
                const data = [['safe', longToken], ['also safe']];
                logger.debug('Nested arrays:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Nested arrays:', [['safe', '[REDACTED]'], ['also safe']]);
            });
        });

        describe('handles Error objects', () => {
            it('preserves error structure but redacts message', () => {
                const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
                const error = new Error(`Token ${jwt} is invalid`);
                logger.error('Error:', error);

                const lastCall = consoleErrorSpy.mock.calls[0];
                expect(lastCall[0]).toBe('[ERROR]');
                expect(lastCall[1]).toBe('Error:');
                expect(lastCall[2]).toMatchObject({
                    name: 'Error',
                    message: expect.stringContaining('[REDACTED]')
                });
                expect(lastCall[2].message).not.toContain('eyJ');
            });

            it('redacts sensitive data in error stack', () => {
                const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
                const error = new Error(`Failed with token ${jwt}`);
                // Manually add jwt to stack for testing
                error.stack = `Error: Failed with token ${jwt}\n    at someFunction`;

                logger.error('Stack error:', error);

                const lastCall = consoleErrorSpy.mock.calls[0];
                expect(lastCall[2].stack).toContain('[REDACTED]');
                expect(lastCall[2].stack).not.toContain('eyJ');
            });

            it('handles errors without stack', () => {
                const error = new Error('Simple error');
                // Remove stack
                error.stack = undefined;

                logger.error('No stack:', error);

                const lastCall = consoleErrorSpy.mock.calls[0];
                expect(lastCall[2]).toMatchObject({
                    name: 'Error',
                    message: 'Simple error',
                    stack: undefined
                });
            });
        });

        describe('handles multiple arguments', () => {
            it('redacts all sensitive arguments', () => {
                const token1 = 'a'.repeat(50);
                const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
                logger.debug('Tokens:', token1, 'and', token2);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Tokens:', '[REDACTED]', 'and', '[REDACTED]');
            });

            it('handles mixed argument types', () => {
                const data = { token: 'secret' };
                const error = new Error('Token abc is bad');
                logger.error('Mixed:', 'text', 123, data, error);

                const lastCall = consoleErrorSpy.mock.calls[0];
                expect(lastCall[0]).toBe('[ERROR]');
                expect(lastCall[1]).toBe('Mixed:');
                expect(lastCall[2]).toBe('text');
                expect(lastCall[3]).toBe(123);
                expect(lastCall[4]).toEqual({ token: '[REDACTED]' });
                expect(lastCall[5]).toMatchObject({ name: 'Error' });
            });
        });

        describe('handles null and undefined', () => {
            it('preserves null values', () => {
                logger.debug('Null:', null);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Null:', null);
            });

            it('preserves undefined values', () => {
                logger.debug('Undefined:', undefined);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Undefined:', undefined);
            });

            it('handles objects with null values', () => {
                const data = { value: null, token: 'secret' };
                logger.debug('With null:', data);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'With null:', {
                    value: null,
                    token: '[REDACTED]'
                });
            });
        });

        describe('handles primitive types', () => {
            it('preserves numbers', () => {
                logger.debug('Number:', 12345);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Number:', 12345);
            });

            it('preserves booleans', () => {
                logger.debug('Boolean:', true, false);
                expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Boolean:', true, false);
            });
        });
    });

    describe('isDevMode()', () => {
        it('returns true in test environment', () => {
            // __DEV__ is set to true in vitest.config.ts
            expect(isDevMode()).toBe(true);
        });
    });
});
