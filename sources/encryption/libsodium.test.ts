import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock expo-crypto before importing the module
vi.mock('expo-crypto', () => ({
    getRandomBytes: (size: number) => {
        // Return deterministic "random" bytes for testing
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            bytes[i] = i % 256;
        }
        return bytes;
    }
}));

// Mock the sodium library
vi.mock('@/encryption/libsodium.lib', () => ({
    default: {
        crypto_box_NONCEBYTES: 24,
        crypto_secretbox_NONCEBYTES: 24,
        crypto_box_PUBLICKEYBYTES: 32,
        crypto_box_keypair: () => ({
            publicKey: new Uint8Array(32),
            privateKey: new Uint8Array(32)
        }),
        crypto_box_seed_keypair: (_seed: Uint8Array) => ({
            publicKey: new Uint8Array(32),
            privateKey: new Uint8Array(32)
        }),
        crypto_box_easy: (data: Uint8Array, nonce: Uint8Array, _pubKey: Uint8Array, _privKey: Uint8Array) =>
            new Uint8Array([...data, ...nonce.slice(0, 8)]), // Simplified mock
        crypto_secretbox_easy: (data: Uint8Array, nonce: Uint8Array, _secret: Uint8Array) =>
            new Uint8Array([...data, ...nonce.slice(0, 8)]), // Simplified mock
    }
}));

import { _resetNonceCounter, _getNonceCounter, encryptBox, encryptSecretBox } from './libsodium';

describe('Hybrid Nonce Generation', () => {
    beforeEach(() => {
        _resetNonceCounter();
    });

    describe('_getNonceCounter and _resetNonceCounter', () => {
        it('should start counter at 0', () => {
            expect(_getNonceCounter()).toBe(0n);
        });

        it('should reset counter to 0', () => {
            // Trigger some encryptions to increment counter
            encryptBox(new Uint8Array([1, 2, 3]), new Uint8Array(32));
            encryptBox(new Uint8Array([4, 5, 6]), new Uint8Array(32));
            expect(_getNonceCounter()).toBe(2n);

            _resetNonceCounter();
            expect(_getNonceCounter()).toBe(0n);
        });
    });

    describe('nonce uniqueness', () => {
        it('should increment counter after each encryptBox call', () => {
            expect(_getNonceCounter()).toBe(0n);

            encryptBox(new Uint8Array([1, 2, 3]), new Uint8Array(32));
            expect(_getNonceCounter()).toBe(1n);

            encryptBox(new Uint8Array([4, 5, 6]), new Uint8Array(32));
            expect(_getNonceCounter()).toBe(2n);
        });

        it('should increment counter after each encryptSecretBox call', () => {
            expect(_getNonceCounter()).toBe(0n);

            encryptSecretBox({ test: 'data' }, new Uint8Array(32));
            expect(_getNonceCounter()).toBe(1n);

            encryptSecretBox({ test: 'more data' }, new Uint8Array(32));
            expect(_getNonceCounter()).toBe(2n);
        });

        it('should share counter between encryptBox and encryptSecretBox', () => {
            expect(_getNonceCounter()).toBe(0n);

            encryptBox(new Uint8Array([1, 2, 3]), new Uint8Array(32));
            expect(_getNonceCounter()).toBe(1n);

            encryptSecretBox({ test: 'data' }, new Uint8Array(32));
            expect(_getNonceCounter()).toBe(2n);

            encryptBox(new Uint8Array([4, 5, 6]), new Uint8Array(32));
            expect(_getNonceCounter()).toBe(3n);
        });

        it('should generate unique nonces under high-throughput simulation', () => {
            const nonces: string[] = [];
            const iterations = 1000;

            // Simulate high-throughput by performing many encryptions
            for (let i = 0; i < iterations; i++) {
                const result = encryptBox(new Uint8Array([i]), new Uint8Array(32));
                // Extract nonce from bundle (bytes 32-56 in the result)
                const nonce = result.slice(32, 56);
                const nonceStr = Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('');
                nonces.push(nonceStr);
            }

            // All nonces should be unique
            const uniqueNonces = new Set(nonces);
            expect(uniqueNonces.size).toBe(iterations);
        });

        it('should have counter value in last 8 bytes of nonce (big-endian)', () => {
            // After first encryption, counter becomes 1
            encryptBox(new Uint8Array([1]), new Uint8Array(32));

            // After second encryption, counter becomes 2
            const result = encryptBox(new Uint8Array([2]), new Uint8Array(32));

            // Extract nonce from bundle (bytes 32-56)
            const nonce = result.slice(32, 56);

            // The last 8 bytes should contain the counter value (big-endian)
            // Counter was 1 when this nonce was generated
            const counterBytes = nonce.slice(16, 24);
            const view = new DataView(counterBytes.buffer, counterBytes.byteOffset, 8);
            const counterValue = view.getBigUint64(0, false); // false = big-endian

            expect(counterValue).toBe(1n);
        });
    });

    describe('backward compatibility', () => {
        it('should produce nonces of correct length for box encryption (24 bytes)', () => {
            const result = encryptBox(new Uint8Array([1, 2, 3]), new Uint8Array(32));
            // Bundle format: ephemeral public key (32) + nonce (24) + encrypted data
            const nonce = result.slice(32, 56);
            expect(nonce.length).toBe(24);
        });

        it('should produce nonces of correct length for secretbox encryption (24 bytes)', () => {
            const result = encryptSecretBox({ test: 'data' }, new Uint8Array(32));
            // Bundle format: nonce (24) + encrypted data
            const nonce = result.slice(0, 24);
            expect(nonce.length).toBe(24);
        });
    });
});
