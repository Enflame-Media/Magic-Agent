import { KeyTree, crypto } from "privacy-kit";

/**
 * Helper to cast Uint8Array to the type Prisma expects.
 *
 * TypeScript 5.x introduced stricter typing for generic classes like Uint8Array,
 * which can cause type incompatibility when Prisma expects a specific generic type
 * (e.g., Uint8Array<ArrayBuffer>) but the actual value is just Uint8Array.
 *
 * This cast is necessary to satisfy Prisma's type requirements without changing
 * runtime behaviour. Future maintainers: do not remove this cast unless you have
 * verified that Prisma and TypeScript type compatibility issues have been resolved.
 */
function toBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
    return data as Uint8Array<ArrayBuffer>;
}

let keyTree: KeyTree | null = null;

export async function initEncrypt() {
    keyTree = new KeyTree(await crypto.deriveSecureKey({
        key: process.env.HANDY_MASTER_SECRET!,
        usage: 'happy-server-tokens'
    }));
}

export function encryptString(path: string[], string: string): Uint8Array<ArrayBuffer> {
    return toBytes(keyTree!.symmetricEncrypt(path, string));
}

export function encryptBytes(path: string[], bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    return toBytes(keyTree!.symmetricEncrypt(path, bytes));
}

export function decryptString(path: string[], encrypted: Uint8Array) {
    return keyTree!.symmetricDecryptString(path, encrypted);
}

export function decryptBytes(path: string[], encrypted: Uint8Array) {
    return keyTree!.symmetricDecryptBuffer(path, encrypted);
}