import nacl from 'tweetnacl';
import { decodeBase64 } from '@/services/base64';
import { decryptBox } from '@/services/encryption';
import { deriveKey } from './deriveKey';
import { AES256Encryption, SecretBoxEncryption } from './encryptors';
import { MachineEncryption } from './machineEncryption';

function deriveBoxKeyPair(seed: Uint8Array): nacl.BoxKeyPair {
  const hash = nacl.hash(seed);
  const secretKey = hash.slice(0, 32);
  if (secretKey.length < 32) {
    throw new Error('Failed to derive box keypair');
  }

  // Curve25519 scalar clamp
  secretKey[0] = (secretKey[0] ?? 0) & 248;
  secretKey[31] = (secretKey[31] ?? 0) & 127;
  secretKey[31] = (secretKey[31] ?? 0) | 64;

  return nacl.box.keyPair.fromSecretKey(secretKey);
}

export class EncryptionManager {
  static async create(masterSecret: Uint8Array): Promise<EncryptionManager> {
    const contentDataKey = await deriveKey(masterSecret, 'Happy EnCoder', ['content']);
    const contentKeyPair = deriveBoxKeyPair(contentDataKey);
    return new EncryptionManager(masterSecret, contentKeyPair);
  }

  private readonly masterSecret: Uint8Array;
  private readonly contentKeyPair: nacl.BoxKeyPair;
  private readonly machineEncryptions = new Map<string, MachineEncryption>();

  private constructor(masterSecret: Uint8Array, contentKeyPair: nacl.BoxKeyPair) {
    this.masterSecret = masterSecret;
    this.contentKeyPair = contentKeyPair;
  }

  async decryptEncryptionKey(encrypted: string): Promise<Uint8Array | null> {
    const encryptedKey = decodeBase64(encrypted);
    if (encryptedKey[0] !== 0) {
      return null;
    }

    const decrypted = decryptBox(encryptedKey.slice(1), this.contentKeyPair.secretKey);
    return decrypted ?? null;
  }

  async ensureMachineEncryption(
    machineId: string,
    dataEncryptionKey: string | null
  ): Promise<MachineEncryption> {
    const existing = this.machineEncryptions.get(machineId);
    if (existing) {
      return existing;
    }

    let encryptor: AES256Encryption | SecretBoxEncryption;
    if (dataEncryptionKey) {
      const decryptedKey = await this.decryptEncryptionKey(dataEncryptionKey);
      if (!decryptedKey) {
        throw new Error(`Failed to decrypt machine encryption key for ${machineId}`);
      }
      encryptor = new AES256Encryption(decryptedKey);
    } else {
      encryptor = new SecretBoxEncryption(this.masterSecret);
    }

    const machineEncryption = new MachineEncryption(machineId, encryptor);
    this.machineEncryptions.set(machineId, machineEncryption);
    return machineEncryption;
  }

  getMachineEncryption(machineId: string): MachineEncryption | null {
    return this.machineEncryptions.get(machineId) ?? null;
  }

  removeMachineEncryption(machineId: string): void {
    this.machineEncryptions.delete(machineId);
  }
}
