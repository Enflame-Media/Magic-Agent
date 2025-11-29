import axios from 'axios'
import { logger } from '@/ui/logger'
import type { AgentState, CreateSessionResponse, Metadata, Session, Machine, MachineMetadata, DaemonState } from '@/api/types'
import { ApiSessionClient } from './apiSession';
import { ApiMachineClient } from './apiMachine';
import { decodeBase64, encodeBase64, getRandomBytes, encrypt, decrypt, libsodiumEncryptForPublicKey } from './encryption';
import { PushNotificationClient } from './pushNotifications';
import { configuration } from '@/configuration';
import chalk from 'chalk';
import { Credentials } from '@/persistence';
import { getSafeErrorMessage } from '@/utils/errors';
import { createDeduplicator, type Deduplicator } from '@/utils/requestDeduplication';

export class ApiClient {

  static async create(credential: Credentials) {
    return new ApiClient(credential);
  }

  private readonly credential: Credentials;
  private readonly pushClient: PushNotificationClient;
  private readonly activeSessions: Set<ApiSessionClient> = new Set();
  private readonly activeMachines: Set<ApiMachineClient> = new Set();
  private disposed = false;

  /**
   * Request deduplicators for coalescing concurrent identical requests.
   * Prevents duplicate network calls when multiple callers request the same resource simultaneously.
   *
   * Machine requests: Deduplicated by machineId to prevent duplicate registrations during parallel startup.
   * Vendor token requests: Deduplicated by vendor name to prevent duplicate API token registrations.
   */
  private readonly machineDeduplicator: Deduplicator<Machine>;
  private readonly vendorTokenDeduplicator: Deduplicator<void>;

  private constructor(credential: Credentials) {
    this.credential = credential
    this.pushClient = new PushNotificationClient(credential.token, configuration.serverUrl)

    // Initialize request deduplicators with 30-second timeout as safety net
    const deduplicationOptions = {
      timeoutMs: 30000,
      onDeduplicated: (key: string) => logger.debug(`[API] Request deduplicated: ${key}`)
    };
    this.machineDeduplicator = createDeduplicator<Machine>(deduplicationOptions);
    this.vendorTokenDeduplicator = createDeduplicator<void>(deduplicationOptions);
  }

  /**
   * Create a new session or load existing one with the given tag
   */
  async getOrCreateSession(opts: {
    tag: string,
    metadata: Metadata,
    state: AgentState | null
  }): Promise<Session> {

    // Resolve encryption key
    let dataEncryptionKey: Uint8Array | null = null;
    let encryptionKey: Uint8Array;
    let encryptionVariant: 'legacy' | 'dataKey';
    if (this.credential.encryption.type === 'dataKey') {

      // Generate new encryption key
      encryptionKey = getRandomBytes(32);
      encryptionVariant = 'dataKey';

      // Derive and encrypt data encryption key
      // const contentDataKey = await deriveKey(this.secret, 'Happy EnCoder', ['content']);
      // const publicKey = libsodiumPublicKeyFromSecretKey(contentDataKey);
      let encryptedDataKey = libsodiumEncryptForPublicKey(encryptionKey, this.credential.encryption.publicKey);
      dataEncryptionKey = new Uint8Array(encryptedDataKey.length + 1);
      dataEncryptionKey.set([0], 0); // Version byte
      dataEncryptionKey.set(encryptedDataKey, 1); // Data key
    } else {
      encryptionKey = this.credential.encryption.secret;
      encryptionVariant = 'legacy';
    }

    // Create session
    try {
      const response = await axios.post<CreateSessionResponse>(
        `${configuration.serverUrl}/v1/sessions`,
        {
          tag: opts.tag,
          metadata: encodeBase64(encrypt(encryptionKey, encryptionVariant, opts.metadata)),
          agentState: opts.state ? encodeBase64(encrypt(encryptionKey, encryptionVariant, opts.state)) : null,
          dataEncryptionKey: dataEncryptionKey ? encodeBase64(dataEncryptionKey) : null,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.credential.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 1 minute timeout for very bad network connections
        }
      )

      logger.debug(`Session created/loaded: ${response.data.session.id} (tag: ${opts.tag})`)
      let raw = response.data.session;
      let session: Session = {
        id: raw.id,
        seq: raw.seq,
        metadata: decrypt(encryptionKey, encryptionVariant, decodeBase64(raw.metadata)),
        metadataVersion: raw.metadataVersion,
        agentState: raw.agentState ? decrypt(encryptionKey, encryptionVariant, decodeBase64(raw.agentState)) : null,
        agentStateVersion: raw.agentStateVersion,
        encryptionKey: encryptionKey,
        encryptionVariant: encryptionVariant
      }
      return session;
    } catch (error) {
      logger.debug('[API] [ERROR] Failed to get or create session:', error);
      throw new Error(`Failed to get or create session: ${getSafeErrorMessage(error)}`);
    }
  }

  /**
   * Register or update machine with the server
   * Returns the current machine state from the server with decrypted metadata and daemonState
   *
   * Note: Concurrent calls with the same machineId are deduplicated - only one network
   * request is made and the result is shared among all callers.
   */
  async getOrCreateMachine(opts: {
    machineId: string,
    metadata: MachineMetadata,
    daemonState?: DaemonState,
  }): Promise<Machine> {
    // Use deduplication to coalesce concurrent requests for the same machine
    return this.machineDeduplicator.request(`machine:${opts.machineId}`, async () => {
      // Resolve encryption key
      let dataEncryptionKey: Uint8Array | null = null;
      let encryptionKey: Uint8Array;
      let encryptionVariant: 'legacy' | 'dataKey';
      if (this.credential.encryption.type === 'dataKey') {
        // Encrypt data encryption key
        encryptionVariant = 'dataKey';
        encryptionKey = this.credential.encryption.machineKey;
        const encryptedDataKey = libsodiumEncryptForPublicKey(this.credential.encryption.machineKey, this.credential.encryption.publicKey);
        dataEncryptionKey = new Uint8Array(encryptedDataKey.length + 1);
        dataEncryptionKey.set([0], 0); // Version byte
        dataEncryptionKey.set(encryptedDataKey, 1); // Data key
      } else {
        // Legacy encryption
        encryptionKey = this.credential.encryption.secret;
        encryptionVariant = 'legacy';
      }

      // Create machine
      try {
        const response = await axios.post(
          `${configuration.serverUrl}/v1/machines`,
          {
            id: opts.machineId,
            metadata: encodeBase64(encrypt(encryptionKey, encryptionVariant, opts.metadata)),
            daemonState: opts.daemonState ? encodeBase64(encrypt(encryptionKey, encryptionVariant, opts.daemonState)) : undefined,
            dataEncryptionKey: dataEncryptionKey ? encodeBase64(dataEncryptionKey) : undefined
          },
          {
            headers: {
              'Authorization': `Bearer ${this.credential.token}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 1 minute timeout for very bad network connections
          }
        );

        if (response.status !== 200) {
          console.error(chalk.red('[API] Failed to create machine'));
          console.log(chalk.yellow('[API] Failed to create machine. Most likely you have re-authenticated, but you still have a machine associated with the old account. Now we are trying to re-associate the machine with the new account. That is not allowed. Please run \'happy doctor clean\' to clean up your happy state, and try your original command again. Please create an issue on github if this is causing you problems. We apologize for the inconvenience.'));
          process.exit(1);
        }

        const raw = response.data.machine;
        logger.debug(`[API] Machine ${opts.machineId} registered/updated with server`);

        // Return decrypted machine like we do for sessions
        const machine: Machine = {
          id: raw.id,
          encryptionKey: encryptionKey,
          encryptionVariant: encryptionVariant,
          metadata: raw.metadata ? decrypt(encryptionKey, encryptionVariant, decodeBase64(raw.metadata)) : null,
          metadataVersion: raw.metadataVersion || 0,
          daemonState: raw.daemonState ? decrypt(encryptionKey, encryptionVariant, decodeBase64(raw.daemonState)) : null,
          daemonStateVersion: raw.daemonStateVersion || 0,
        };
        return machine;
      } catch (error) {
        logger.debug('[API] [ERROR] Failed to get or create machine:', error);
        throw new Error(`Failed to get or create machine: ${getSafeErrorMessage(error)}`);
      }
    });
  }

  sessionSyncClient(session: Session): ApiSessionClient {
    const client = new ApiSessionClient(this.credential.token, session);
    this.activeSessions.add(client);
    return client;
  }

  machineSyncClient(machine: Machine): ApiMachineClient {
    const client = new ApiMachineClient(this.credential.token, machine);
    this.activeMachines.add(client);
    return client;
  }

  push(): PushNotificationClient {
    return this.pushClient;
  }

  /**
   * Register a vendor API token with the server
   * The token is sent as a JSON string - server handles encryption
   *
   * Note: Concurrent calls for the same vendor are deduplicated - only one network
   * request is made and the result is shared among all callers.
   */
  async registerVendorToken(vendor: 'openai' | 'anthropic' | 'gemini', apiKey: unknown): Promise<void> {
    // Use deduplication to prevent duplicate registrations for the same vendor
    return this.vendorTokenDeduplicator.request(`vendor:${vendor}`, async () => {
      try {
        const response = await axios.post(
          `${configuration.serverUrl}/v1/connect/${vendor}/register`,
          {
            token: JSON.stringify(apiKey)
          },
          {
            headers: {
              'Authorization': `Bearer ${this.credential.token}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        if (response.status !== 200 && response.status !== 201) {
          throw new Error(`Server returned status ${response.status}`);
        }

        logger.debug(`[API] Vendor token for ${vendor} registered successfully`);
      } catch (error) {
        logger.debug('[API] [ERROR] Failed to register vendor token:', error);
        throw new Error(`Failed to register vendor token: ${getSafeErrorMessage(error)}`);
      }
    });
  }

  /**
   * Dispose of all active sessions and machines, closing their connections.
   * This method is idempotent - calling it multiple times has no additional effect.
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    // Clear request deduplicators
    this.machineDeduplicator.clear();
    this.vendorTokenDeduplicator.clear();

    // Close all active sessions (async)
    await Promise.all(
      Array.from(this.activeSessions).map(session => session.close().catch(() => {}))
    );
    this.activeSessions.clear();

    // Shutdown all active machines (sync)
    Array.from(this.activeMachines).forEach(machine => machine.shutdown());
    this.activeMachines.clear();

    logger.debug('[API] ApiClient disposed - all sessions and machines cleaned up');
  }
}
