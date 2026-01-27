/**
 * Encryption services module
 *
 * Provides E2E encryption capabilities for the Happy web app:
 * - Box encryption (NaCl) compatible with CLI
 * - LRU caching for decrypted data
 * - Secure key storage via IndexedDB
 * - Artifact encryption/decryption (HAP-708)
 */

export { EncryptionCache, encryptionCache } from './EncryptionCache';
export { keyStorage, type StoredKeyPair, type KeyPair } from './KeyStorage';
export { EncryptionManager } from './encryptionManager';
export { ArtifactEncryption, type ArtifactHeader, type ArtifactBody } from './artifactEncryption';
