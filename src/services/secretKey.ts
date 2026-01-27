import { decodeBase64, encodeBase64 } from './base64';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(base32: string): Uint8Array {
  const normalized = base32
    .toUpperCase()
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B')
    .replace(/9/g, 'G');

  const cleaned = normalized.replace(/[^A-Z2-7]/g, '');
  if (!cleaned) {
    throw new Error('Invalid secret key format');
  }

  const bytes: number[] = [];
  let buffer = 0;
  let bufferLength = 0;

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid secret key format');
    }

    buffer = (buffer << 5) | value;
    bufferLength += 5;

    if (bufferLength >= 8) {
      bufferLength -= 8;
      bytes.push((buffer >> bufferLength) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

export function normalizeSecretKey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Invalid secret key format');
  }

  if (/[-\s]/.test(trimmed) || trimmed.length > 50) {
    const bytes = base32ToBytes(trimmed);
    if (bytes.length !== 32) {
      throw new Error('Invalid secret key length');
    }

    return encodeBase64(bytes, 'base64');
  }

  try {
    const bytes = decodeBase64(trimmed, 'base64');
    if (bytes.length !== 32) {
      throw new Error('Invalid secret key length');
    }

    return trimmed;
  } catch {
    try {
      const bytes = decodeBase64(trimmed, 'base64url');
      if (bytes.length !== 32) {
        throw new Error('Invalid secret key length');
      }

      return encodeBase64(bytes, 'base64');
    } catch {
      const bytes = base32ToBytes(trimmed);
      if (bytes.length !== 32) {
        throw new Error('Invalid secret key length');
      }

      return encodeBase64(bytes, 'base64');
    }
  }
}
