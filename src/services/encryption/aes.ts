import { decodeBase64, encodeBase64 } from '@/services/base64';

const AES_GCM_IV_LENGTH = 12;

async function importKey(key64: string): Promise<CryptoKey> {
  const keyBytes = decodeBase64(key64);
  const raw = new Uint8Array(keyBytes).buffer;
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptAESGCMString(data: string, key64: string): Promise<string> {
  const key = await importKey(key64);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);

  return encodeBase64(result);
}

export async function decryptAESGCMString(data: string, key64: string): Promise<string | null> {
  try {
    const key = await importKey(key64);
  const raw = decodeBase64(data);
  const iv = raw.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = raw.slice(AES_GCM_IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
