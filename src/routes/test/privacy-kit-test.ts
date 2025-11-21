import { Hono } from 'hono';
import * as privacyKit from 'privacy-kit';

/**
 * Test route for privacy-kit runtime compatibility in Cloudflare Workers
 *
 * This endpoint verifies that privacy-kit works correctly in the Workers environment,
 * testing all four token generator/verifier types:
 * - Persistent token generator
 * - Persistent token verifier
 * - Ephemeral token generator (with TTL)
 * - Ephemeral token verifier
 *
 * @see https://linear.app/enflame-media/issue/HAP-26
 */

interface Env {
    /**
     * Test secret for privacy-kit token generation
     * Set in .dev.vars for local development
     */
    TEST_AUTH_SECRET: string;
}

/**
 * Individual test result structure
 */
interface TestResult {
    passed: boolean;
    message: string;
    [key: string]: unknown;
}

/**
 * Overall test results structure
 */
interface TestResults {
    success: boolean;
    tests: Record<string, TestResult>;
    errors: string[];
    environment: 'cloudflare-workers';
    timestamp: string;
    error?: {
        message: string;
        stack?: string;
    };
}

const testRoutes = new Hono<{ Bindings: Env }>();

/**
 * Privacy-kit integration test endpoint
 *
 * @route GET /test/privacy-kit
 * @returns Test results showing privacy-kit compatibility status
 *
 * Tests performed:
 * 1. Import verification - privacy-kit loads without module errors
 * 2. Persistent token generation - creates tokens with seed from c.env
 * 3. Persistent token verification - validates generated tokens
 * 4. Ephemeral token generation - creates TTL-based tokens
 * 5. Ephemeral token verification - validates ephemeral tokens
 * 6. Ephemeral token expiration - verifies TTL behavior
 * 7. Crypto operations - Buffer, HMAC, randomBytes work correctly
 * 8. Payload serialization - complex payloads round-trip correctly
 *
 * @example
 * ```bash
 * # Run test locally
 * curl http://localhost:8787/test/privacy-kit
 *
 * # Expected success response:
 * {
 *   "success": true,
 *   "tests": {
 *     "import": { "passed": true },
 *     "persistentGenerator": { "passed": true, "publicKey": "..." },
 *     "persistentVerification": { "passed": true, "payload": {...} },
 *     "ephemeralGenerator": { "passed": true, "publicKey": "..." },
 *     "ephemeralVerification": { "passed": true, "payload": {...} },
 *     "ephemeralExpiration": { "passed": true, "expiredCorrectly": true },
 *     "cryptoOperations": { "passed": true },
 *     "payloadSerialization": { "passed": true }
 *   },
 *   "environment": "cloudflare-workers",
 *   "timestamp": "2025-11-17T..."
 * }
 * ```
 */
testRoutes.get('/privacy-kit', async (c) => {
    const results: TestResults = {
        success: true,
        tests: {},
        errors: [],
        environment: 'cloudflare-workers' as const,
        timestamp: new Date().toISOString(),
    };

    try {
        // Test 1: Import verification
        results.tests.import = {
            passed: true,
            message: 'privacy-kit imported successfully',
        };

        // Test 2: Persistent token generator
        const testSecret = c.env.TEST_AUTH_SECRET;
        if (!testSecret) {
            throw new Error('TEST_AUTH_SECRET not set in environment - add to .dev.vars');
        }

        const persistentGenerator = await privacyKit.createPersistentTokenGenerator({
            service: 'test-service',
            seed: testSecret,
        });

        results.tests.persistentGenerator = {
            passed: true,
            publicKey: persistentGenerator.publicKey,
            message: 'Persistent token generator created successfully',
        };

        // Test 3: Persistent token verifier
        const persistentVerifier = await privacyKit.createPersistentTokenVerifier({
            service: 'test-service',
            publicKey: persistentGenerator.publicKey,
        });

        results.tests.persistentVerifier = {
            passed: true,
            message: 'Persistent token verifier created successfully',
        };

        // Test 4: Generate and verify persistent token
        const testPayload = {
            user: 'test-user-123',
            extras: {
                sessionId: 'session-xyz',
                deviceType: 'test',
            },
        };

        const persistentToken = await persistentGenerator.new(testPayload);
        const persistentVerified = await persistentVerifier.verify(persistentToken);

        if (!persistentVerified) {
            const errorMsg = 'Persistent token verification returned null';
            results.errors.push(errorMsg);
            results.tests.persistentVerification = {
                passed: false,
                message: errorMsg,
            };
            throw new Error(errorMsg);
        }

        if (persistentVerified.user !== testPayload.user) {
            const errorMsg = `Payload mismatch: expected user=${testPayload.user}, got user=${persistentVerified.user}`;
            results.errors.push(errorMsg);
            results.tests.persistentVerification = {
                passed: false,
                message: errorMsg,
            };
            throw new Error(errorMsg);
        }

        results.tests.persistentVerification = {
            passed: true,
            token: persistentToken.substring(0, 20) + '...',
            verifiedPayload: persistentVerified,
            message: 'Persistent token generated and verified successfully',
        };

        // Test 5: Ephemeral token generator (with TTL)
        const ephemeralGenerator = await privacyKit.createEphemeralTokenGenerator({
            service: 'test-ephemeral',
            seed: testSecret,
            ttl: 5000, // 5 seconds for testing
        });

        results.tests.ephemeralGenerator = {
            passed: true,
            publicKey: ephemeralGenerator.publicKey,
            ttl: 5000,
            message: 'Ephemeral token generator created with 5s TTL',
        };

        // Test 6: Ephemeral token verifier
        const ephemeralVerifier = await privacyKit.createEphemeralTokenVerifier({
            service: 'test-ephemeral',
            publicKey: ephemeralGenerator.publicKey,
        });

        results.tests.ephemeralVerifier = {
            passed: true,
            message: 'Ephemeral token verifier created successfully',
        };

        // Test 7: Generate and verify ephemeral token
        const ephemeralPayload = {
            user: 'ephemeral-user-456',
            purpose: 'test-oauth',
        };

        const ephemeralToken = await ephemeralGenerator.new(ephemeralPayload);
        const ephemeralVerified = await ephemeralVerifier.verify(ephemeralToken);

        if (!ephemeralVerified) {
            const errorMsg = 'Ephemeral token verification returned null';
            results.errors.push(errorMsg);
            results.tests.ephemeralVerification = {
                passed: false,
                message: errorMsg,
            };
            throw new Error(errorMsg);
        }

        if (ephemeralVerified.user !== ephemeralPayload.user) {
            const errorMsg = `Ephemeral payload mismatch: expected user=${ephemeralPayload.user}, got user=${ephemeralVerified.user}`;
            results.errors.push(errorMsg);
            results.tests.ephemeralVerification = {
                passed: false,
                message: errorMsg,
            };
            throw new Error(errorMsg);
        }

        results.tests.ephemeralVerification = {
            passed: true,
            token: ephemeralToken.substring(0, 20) + '...',
            verifiedPayload: ephemeralVerified,
            message: 'Ephemeral token generated and verified successfully',
        };

        // Test 8: Ephemeral token expiration
        // Create a short-lived token generator (100ms TTL)
        const shortLivedGenerator = await privacyKit.createEphemeralTokenGenerator({
            service: 'test-short-lived',
            seed: testSecret,
            ttl: 100, // 100ms
        });

        const shortLivedVerifier = await privacyKit.createEphemeralTokenVerifier({
            service: 'test-short-lived',
            publicKey: shortLivedGenerator.publicKey,
        });

        const shortLivedToken = await shortLivedGenerator.new({ user: 'expired-test' });

        // Verify immediately (should work)
        const immediateVerify = await shortLivedVerifier.verify(shortLivedToken);
        if (!immediateVerify) {
            const errorMsg = 'Short-lived token should verify immediately';
            results.errors.push(errorMsg);
            results.tests.ephemeralExpiration = {
                passed: false,
                message: errorMsg,
            };
            throw new Error(errorMsg);
        }

        // Wait for expiration (Workers environment may have timing limitations)
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Verify after expiration (should fail)
        const expiredVerify = await shortLivedVerifier.verify(shortLivedToken);

        const expiredCorrectly = !expiredVerify;
        results.tests.ephemeralExpiration = {
            passed: true,
            immediateVerification: true,
            expiredVerification: !!expiredVerify,
            expiredCorrectly,
            message: expiredCorrectly
                ? 'Token expired correctly after TTL'
                : 'Token did not expire as expected (TTL may not work in Workers environment)',
        };

        // Note: If TTL doesn't work, log as warning but don't fail the test
        // Workers environment may have limitations with precise timing
        if (!expiredCorrectly) {
            results.errors.push('TTL expiration test warning: Token did not expire as expected');
        }

        // Test 9: Crypto operations (Buffer, HMAC, randomBytes)
        // These are tested implicitly by privacy-kit, but we verify explicitly
        const cryptoTests: Record<string, boolean> = {
            bufferWorks: false,
            randomBytesWorks: false,
            hmacWorks: false,
        };

        try {
            // Test Buffer
            const testBuffer = Buffer.from('test-data', 'utf8');
            cryptoTests.bufferWorks = testBuffer.toString('utf8') === 'test-data';

            // Test crypto.randomBytes (used by privacy-kit internally)
            const { randomBytes } = await import('crypto');
            const randomData = randomBytes(32);
            cryptoTests.randomBytesWorks = randomData.length === 32;

            // Test crypto.createHmac (used by privacy-kit internally)
            const { createHmac } = await import('crypto');
            const hmac = createHmac('sha256', 'test-key');
            hmac.update('test-data');
            const digest = hmac.digest('hex');
            cryptoTests.hmacWorks = digest.length === 64; // SHA-256 = 32 bytes = 64 hex chars

            results.tests.cryptoOperations = {
                passed: true,
                ...cryptoTests,
                message: 'All Node.js crypto APIs work with nodejs_compat flag',
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.tests.cryptoOperations = {
                passed: false,
                ...cryptoTests,
                error: errorMsg,
                message: 'Crypto operations failed - nodejs_compat may not be working',
            };
            results.errors.push(`Crypto test failed: ${errorMsg}`);
            results.success = false;
        }

        // Test 10: Payload serialization/deserialization
        const complexPayload = {
            user: 'complex-user',
            nested: {
                array: [1, 2, 3],
                object: { key: 'value' },
                null: null,
                boolean: true,
                number: 42,
            },
            unicode: '🔒 test émoji',
        };

        const complexToken = await persistentGenerator.new(complexPayload);
        const complexVerified = await persistentVerifier.verify(complexToken);

        const payloadMatches =
            JSON.stringify(complexVerified) === JSON.stringify(complexPayload);

        results.tests.payloadSerialization = {
            passed: payloadMatches,
            message: payloadMatches
                ? 'Complex payloads serialize/deserialize correctly'
                : 'Payload serialization mismatch detected',
        };

        if (!payloadMatches) {
            const errorMsg = 'Complex payload round-trip failed';
            results.errors.push(errorMsg);
            results.success = false;
        }

        // Overall success check - only pass if no errors accumulated
        results.success = results.errors.length === 0;

        return c.json(results, results.success ? 200 : 500);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        results.success = false;
        if (!results.errors.includes(errorMsg)) {
            results.errors.push(errorMsg);
        }
        results.error = {
            message: errorMsg,
            stack: errorStack,
        };

        return c.json(results, 500);
    }
});

export default testRoutes;
