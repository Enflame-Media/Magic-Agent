import { decodeBase64, encodeBase64 } from '@/services/base64';
import type { Decryptor, Encryptor } from './encryptors';

export class MachineEncryption {
  private readonly machineId: string;
  private readonly encryptor: Encryptor & Decryptor;

  constructor(machineId: string, encryptor: Encryptor & Decryptor) {
    this.machineId = machineId;
    this.encryptor = encryptor;
  }

  async encryptRaw(data: unknown): Promise<string> {
    const encrypted = await this.encryptor.encrypt([data]);
    if (!encrypted[0]) {
      throw new Error(`Failed to encrypt payload for ${this.machineId}`);
    }
    return encodeBase64(encrypted[0]);
  }

  async decryptRaw(encrypted: string): Promise<unknown | null> {
    try {
      const encryptedData = decodeBase64(encrypted);
      const decrypted = await this.encryptor.decrypt([encryptedData]);
      return decrypted[0] ?? null;
    } catch {
      return null;
    }
  }

  get id(): string {
    return this.machineId;
  }
}
