import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from '@/services/base64';
import { decryptAESGCMString, encryptAESGCMString } from './aes';

export interface Encryptor {
  encrypt(data: unknown[]): Promise<Uint8Array[]>;
}

export interface Decryptor {
  decrypt(data: Uint8Array[]): Promise<(unknown | null)[]>;
}

export class SecretBoxEncryption implements Encryptor, Decryptor {
  private readonly secretKey: Uint8Array;

  constructor(secretKey: Uint8Array) {
    if (secretKey.length !== 32) {
      throw new Error(`Invalid SecretBox key length: expected 32 bytes, got ${String(secretKey.length)} bytes`);
    }
    this.secretKey = secretKey;
  }

  async encrypt(data: unknown[]): Promise<Uint8Array[]> {
    const results: Uint8Array[] = [];
    for (const item of data) {
      const nonce = crypto.getRandomValues(new Uint8Array(nacl.secretbox.nonceLength));
      const encoded = new TextEncoder().encode(JSON.stringify(item));
      const encrypted = nacl.secretbox(encoded, nonce, this.secretKey);
      const bundle = new Uint8Array(nonce.length + encrypted.length);
      bundle.set(nonce, 0);
      bundle.set(encrypted, nonce.length);
      results.push(bundle);
    }
    return results;
  }

  async decrypt(data: Uint8Array[]): Promise<(unknown | null)[]> {
    const results: (unknown | null)[] = [];
    for (const item of data) {
      const nonce = item.slice(0, nacl.secretbox.nonceLength);
      const encrypted = item.slice(nacl.secretbox.nonceLength);
      const decrypted = nacl.secretbox.open(encrypted, nonce, this.secretKey);
      if (!decrypted) {
        results.push(null);
        continue;
      }
      try {
        results.push(JSON.parse(new TextDecoder().decode(decrypted)));
      } catch {
        results.push(null);
      }
    }
    return results;
  }
}

export class AES256Encryption implements Encryptor, Decryptor {
  private readonly secretKeyB64: string;

  constructor(secretKey: Uint8Array) {
    if (secretKey.length !== 32) {
      throw new Error(`Invalid AES-256 key length: expected 32 bytes, got ${String(secretKey.length)} bytes`);
    }
    this.secretKeyB64 = encodeBase64(secretKey);
  }

  async encrypt(data: unknown[]): Promise<Uint8Array[]> {
    const results: Uint8Array[] = [];
    for (const item of data) {
      const encrypted = decodeBase64(await encryptAESGCMString(JSON.stringify(item), this.secretKeyB64));
      const output = new Uint8Array(encrypted.length + 1);
      output[0] = 0;
      output.set(encrypted, 1);
      results.push(output);
    }
    return results;
  }

  async decrypt(data: Uint8Array[]): Promise<(unknown | null)[]> {
    const results: (unknown | null)[] = [];
    for (const item of data) {
      try {
        if (item[0] !== 0) {
          results.push(null);
          continue;
        }
        const decryptedString = await decryptAESGCMString(encodeBase64(item.slice(1)), this.secretKeyB64);
        if (!decryptedString) {
          results.push(null);
          continue;
        }
        results.push(JSON.parse(decryptedString));
      } catch {
        results.push(null);
      }
    }
    return results;
  }
}
