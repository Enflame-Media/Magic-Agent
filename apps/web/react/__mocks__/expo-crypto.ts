/**
 * Mock for expo-crypto module in Vitest tests.
 */

let uuidCounter = 0;

export function randomUUID(): string {
    uuidCounter++;
    return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, '0')}`;
}

export function getRandomBytes(size: number): Uint8Array {
    return new Uint8Array(size).fill(0);
}

export function getRandomBytesAsync(size: number): Promise<Uint8Array> {
    return Promise.resolve(getRandomBytes(size));
}

export default {
    randomUUID,
    getRandomBytes,
    getRandomBytesAsync,
};
