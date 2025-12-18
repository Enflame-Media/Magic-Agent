/**
 * Byte array utility functions for TypeScript strict mode compatibility.
 *
 * Prisma with TypeScript 5.x strict mode requires `Uint8Array<ArrayBuffer>`
 * for Bytes fields, but libraries like privacy-kit return plain `Uint8Array`.
 * These helpers provide the necessary type narrowing.
 */

/**
 * Cast a Uint8Array to the type Prisma expects (TypeScript 5.x strict typing).
 * This is a type-only operation with no runtime overhead.
 */
export function toBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
    return data as Uint8Array<ArrayBuffer>;
}
