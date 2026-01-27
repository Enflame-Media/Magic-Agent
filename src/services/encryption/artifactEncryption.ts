/**
 * Artifact Encryption Service
 *
 * Handles encryption and decryption of artifact headers and bodies.
 * Uses AES-256 encryption for artifact content.
 *
 * @see HAP-708 - Integrate Artifacts Store with Sync Service
 */

import { decodeBase64, encodeBase64 } from '@/services/base64';
import { AES256Encryption } from './encryptors';

/**
 * Decrypted artifact header structure
 */
export interface ArtifactHeader {
  /** Display title/filename */
  title: string | null;
  /** MIME type if known */
  mimeType?: string;
  /** File path within session context */
  filePath?: string;
  /** Language for syntax highlighting */
  language?: string;
  /** Associated session IDs */
  sessions?: string[];
  /** Whether this is a draft artifact */
  draft?: boolean;
}

/**
 * Decrypted artifact body structure
 */
export interface ArtifactBody {
  /** The actual content of the artifact */
  body: string | null;
}

/**
 * Artifact encryption service
 *
 * Provides encryption and decryption for artifact headers and bodies
 * using AES-256-GCM.
 */
export class ArtifactEncryption {
  private encryptor: AES256Encryption;

  constructor(dataEncryptionKey: Uint8Array) {
    this.encryptor = new AES256Encryption(dataEncryptionKey);
  }

  /**
   * Decrypt artifact header
   *
   * @param encryptedHeader - Base64-encoded encrypted header
   * @returns Decrypted header or null on failure
   */
  async decryptHeader(encryptedHeader: string): Promise<ArtifactHeader | null> {
    try {
      const encryptedData = decodeBase64(encryptedHeader, 'base64');
      const decrypted = await this.encryptor.decrypt([encryptedData]);
      if (!decrypted[0]) {
        return null;
      }

      // Validate structure
      const header = decrypted[0] as Record<string, unknown>;
      if (typeof header !== 'object' || header === null) {
        return null;
      }

      return {
        title: typeof header.title === 'string' ? header.title : null,
        mimeType: typeof header.mimeType === 'string' ? header.mimeType : undefined,
        filePath: typeof header.filePath === 'string' ? header.filePath : undefined,
        language: typeof header.language === 'string' ? header.language : undefined,
        sessions: Array.isArray(header.sessions) ? header.sessions as string[] : undefined,
        draft: typeof header.draft === 'boolean' ? header.draft : undefined,
      };
    } catch (error) {
      console.error('[artifact] Failed to decrypt header:', error);
      return null;
    }
  }

  /**
   * Decrypt artifact body
   *
   * @param encryptedBody - Base64-encoded encrypted body
   * @returns Decrypted body or null on failure
   */
  async decryptBody(encryptedBody: string): Promise<ArtifactBody | null> {
    try {
      const encryptedData = decodeBase64(encryptedBody, 'base64');
      const decrypted = await this.encryptor.decrypt([encryptedData]);
      if (!decrypted[0]) {
        return null;
      }

      // Validate structure
      const body = decrypted[0] as Record<string, unknown>;
      if (typeof body !== 'object' || body === null) {
        return null;
      }

      return {
        body: typeof body.body === 'string' ? body.body : null,
      };
    } catch (error) {
      console.error('[artifact] Failed to decrypt body:', error);
      return null;
    }
  }

  /**
   * Encrypt artifact header
   *
   * @param header - Header to encrypt
   * @returns Base64-encoded encrypted header
   */
  async encryptHeader(header: ArtifactHeader): Promise<string> {
    const encrypted = await this.encryptor.encrypt([header]);
    if (!encrypted[0]) {
      throw new Error('Failed to encrypt artifact header');
    }
    return encodeBase64(encrypted[0], 'base64');
  }

  /**
   * Encrypt artifact body
   *
   * @param body - Body to encrypt
   * @returns Base64-encoded encrypted body
   */
  async encryptBody(body: ArtifactBody): Promise<string> {
    const encrypted = await this.encryptor.encrypt([body]);
    if (!encrypted[0]) {
      throw new Error('Failed to encrypt artifact body');
    }
    return encodeBase64(encrypted[0], 'base64');
  }
}
