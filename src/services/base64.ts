/**
 * Base64 encoding/decoding utilities
 *
 * Supports both standard base64 and base64url encoding as used
 * throughout the Happy authentication flow.
 */

/**
 * Decode a base64 string to Uint8Array
 * @param base64 - The base64 encoded string
 * @param encoding - Either 'base64' (standard) or 'base64url' (URL-safe)
 */
export function decodeBase64(
  base64: string,
  encoding: 'base64' | 'base64url' = 'base64'
): Uint8Array {
  let normalizedBase64 = base64;

  if (encoding === 'base64url') {
    // Convert base64url to standard base64
    normalizedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if necessary
    const padding = normalizedBase64.length % 4;
    if (padding) {
      normalizedBase64 += '='.repeat(4 - padding);
    }
  }

  const binaryString = atob(normalizedBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Encode Uint8Array to base64 string
 * @param buffer - The byte array to encode
 * @param encoding - Either 'base64' (standard) or 'base64url' (URL-safe)
 */
export function encodeBase64(
  buffer: Uint8Array,
  encoding: 'base64' | 'base64url' = 'base64'
): string {
  const binaryString = String.fromCharCode.apply(null, Array.from(buffer));
  const base64 = btoa(binaryString);

  if (encoding === 'base64url') {
    // Convert to URL-safe base64
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  return base64;
}
